import { loadEnvConfig } from "@next/env";
import { createServer, type IncomingMessage } from "node:http";
import WebSocket, {
  WebSocketServer,
  type RawData,
} from "ws";

import { VoiceSession } from "./lib/realtime/voice-session";

loadEnvConfig(process.cwd());

const port = Number(process.env.VOICE_SERVER_PORT ?? 8080);

const MAX_BUFFERED_AUDIO_CHUNKS = 500;

/**
 * This is our first tuning point.
 *
 * OpenAI waits for this amount of silence before considering
 * the caller finished. The remaining delay comes from
 * transcription, the Employee Core, generation, and streaming.
 *
 * We will measure the real result and adjust this value until
 * the caller experiences roughly 2.2–2.5 seconds total silence.
 */
// Tuned from 1200 ms to reduce end-of-turn delay while remaining stable.
// If callers are cut off too aggressively during testing, try 650 ms next.
const SILENCE_DURATION_MS = 550;

type TwilioConnectedEvent = {
  event: "connected";
  protocol?: string;
  version?: string;
};

type TwilioStartEvent = {
  event: "start";
  streamSid: string;
  start: {
    streamSid: string;
    callSid: string;
    accountSid?: string;
    customParameters?: Record<string, string>;
    mediaFormat?: {
      encoding?: string;
      sampleRate?: number;
      channels?: number;
    };
  };
};

type TwilioMediaEvent = {
  event: "media";
  streamSid: string;
  media: {
    payload: string;
    track?: string;
    chunk?: string;
    timestamp?: string;
  };
};

type TwilioStopEvent = {
  event: "stop";
  streamSid: string;
  stop?: {
    accountSid?: string;
    callSid?: string;
  };
};

type TwilioMarkEvent = {
  event: "mark";
  streamSid: string;
  mark?: {
    name?: string;
  };
};

type TwilioDtmfEvent = {
  event: "dtmf";
  streamSid: string;
  dtmf?: {
    digit?: string;
    track?: string;
  };
};

type TwilioEvent =
  | TwilioConnectedEvent
  | TwilioStartEvent
  | TwilioMediaEvent
  | TwilioStopEvent
  | TwilioMarkEvent
  | TwilioDtmfEvent;

function rawDataToString(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  return Buffer.from(data).toString("utf8");
}

function parseTwilioEvent(data: RawData): TwilioEvent {
  return JSON.parse(rawDataToString(data)) as TwilioEvent;
}

function sendTwilioEvent(
  socket: WebSocket,
  event: Record<string, unknown>,
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(event));
}

function getPublicHost(req: IncomingMessage): string {
  const forwardedHost = req.headers["x-forwarded-host"];

  if (typeof forwardedHost === "string" && forwardedHost) {
    return forwardedHost.split(",")[0].trim();
  }

  return req.headers.host ?? `localhost:${port}`;
}

function getWebSocketUrl(req: IncomingMessage): string {
  const configuredUrl =
    process.env.VOICE_PUBLIC_WEBSOCKET_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "") + "/voice/media";
  }

  return `wss://${getPublicHost(req)}/voice/media`;
}

const server = createServer((req, res) => {
  console.log("[ZENNX VOICE]", req.method, req.url);

  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });

    res.end(
      JSON.stringify({
        ok: true,
        service: "zennx-realtime-voice-server",
        realtime: true,
        silenceDurationMs: SILENCE_DURATION_MS,
      }),
    );

    return;
  }

  if (
    req.url?.startsWith("/voice/incoming") &&
    (req.method === "GET" || req.method === "POST")
  ) {
    const streamUrl = getWebSocketUrl(req);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    console.log("[ZENNX VOICE] Returning Media Stream TwiML", {
      streamUrl,
    });

    res.writeHead(200, {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    });

    res.end(twiml);
    return;
  }

  res.writeHead(404, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      error: "Not found",
    }),
  );
});

const webSocketServer = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
});

server.on("upgrade", (request, socket, head) => {
  const requestUrl = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (requestUrl.pathname !== "/voice/media") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(
    request,
    socket,
    head,
    (webSocket) => {
      webSocketServer.emit(
        "connection",
        webSocket,
        request,
      );
    },
  );
});

webSocketServer.on(
  "connection",
  (twilioSocket: WebSocket) => {
    let callSid = "";
    let streamSid = "";

    let voiceSession: VoiceSession | null = null;
    let realtimeReady = false;
    let closing = false;

    let lastCallerTranscriptAt: number | null = null;
    let waitingForFirstAudio = false;

    const bufferedAudio: string[] = [];

    console.log(
      "[ZENNX MEDIA] Twilio WebSocket connected",
    );

    const flushBufferedAudio = (): void => {
      if (!voiceSession || !realtimeReady) {
        return;
      }

      while (bufferedAudio.length > 0) {
        const audioChunk = bufferedAudio.shift();

        if (audioChunk) {
          voiceSession.appendAudio(audioChunk);
        }
      }
    };

    const closeSession = async (
      reason: string,
    ): Promise<void> => {
      if (closing) {
        return;
      }

      closing = true;

      console.log("[ZENNX MEDIA] Closing session", {
        callSid,
        streamSid,
        reason,
      });

      const activeSession = voiceSession;

      voiceSession = null;
      realtimeReady = false;
      bufferedAudio.length = 0;

      if (activeSession) {
        try {
          await activeSession.close(reason);
        } catch (error) {
          console.error(
            "[ZENNX MEDIA] VoiceSession close failed",
            {
              callSid,
              streamSid,
              error,
            },
          );
        }
      }

      if (
        twilioSocket.readyState === WebSocket.OPEN ||
        twilioSocket.readyState === WebSocket.CONNECTING
      ) {
        twilioSocket.close(1000, reason);
      }
    };

    const createVoiceSession = async (
      message: TwilioStartEvent,
    ): Promise<void> => {
      streamSid =
        message.start.streamSid || message.streamSid;

      callSid = message.start.callSid;

      const parameters =
        message.start.customParameters ?? {};

      const fromNumber =
        parameters.fromNumber ||
        parameters.From ||
        parameters.from;

      const toNumber =
        parameters.toNumber ||
        parameters.To ||
        parameters.to;

      console.log("[ZENNX MEDIA] Stream started", {
        callSid,
        streamSid,
        mediaFormat: message.start.mediaFormat,
        silenceDurationMs: SILENCE_DURATION_MS,
      });

      voiceSession = new VoiceSession({
        callSid,
        fromNumber,
        toNumber,

        model:
          process.env.OPENAI_REALTIME_MODEL ||
          "gpt-realtime",

        voice:
          process.env.OPENAI_REALTIME_VOICE ||
          "marin",

        /**
         * The caller must be silent for this long before
         * OpenAI marks their turn as complete.
         *
         * We start at 1200 ms and tune using real calls.
         */
        silenceDurationMs: SILENCE_DURATION_MS,

        prefixPaddingMs: 300,
        vadThreshold: 0.5,
        idleTimeoutMs: 7000,
        voiceSpeed: 1.05,

        callbacks: {
          onAudioDelta(audioBase64) {
            if (!streamSid) {
              return;
            }

            if (
              waitingForFirstAudio &&
              lastCallerTranscriptAt !== null
            ) {
              const transcriptToFirstAudioMs =
                Math.round(
                  performance.now() -
                    lastCallerTranscriptAt,
                );

              console.log(
                "[ZENNX LATENCY] Transcript to first audio",
                {
                  callSid,
                  streamSid,
                  transcriptToFirstAudioMs,
                  configuredSilenceMs:
                    SILENCE_DURATION_MS,
                  estimatedTotalAfterSpeechMs:
                    SILENCE_DURATION_MS +
                    transcriptToFirstAudioMs,
                },
              );

              waitingForFirstAudio = false;
            }

            sendTwilioEvent(twilioSocket, {
              event: "media",
              streamSid,
              media: {
                payload: audioBase64,
              },
            });
          },

          onClearOutput() {
            if (!streamSid) {
              return;
            }

            console.log(
              "[ZENNX MEDIA] Clearing queued AI audio",
              {
                callSid,
                streamSid,
              },
            );

            sendTwilioEvent(twilioSocket, {
              event: "clear",
              streamSid,
            });
          },

          onUserTranscript(transcript) {
            lastCallerTranscriptAt = performance.now();
            waitingForFirstAudio = true;

            console.log("[ZENNX MEDIA] Caller", {
              callSid,
              transcript,
            });
          },

          onAssistantTranscript(transcript) {
            console.log("[ZENNX MEDIA] ZennX", {
              callSid,
              transcript,
            });
          },

          onStateChange(snapshot) {
            if (snapshot.status === "ready") {
              realtimeReady = true;
              flushBufferedAudio();
            }

            console.log("[ZENNX MEDIA] State", {
              callSid,
              status: snapshot.status,
              intent:
                snapshot.conversationState.intent,
              emotion:
                snapshot.conversationState.emotion,
              stress: snapshot.humanState.stress,
              patience: snapshot.humanState.patience,
              trust: snapshot.humanState.trust,
              urgency: snapshot.humanState.urgency,
              stage:
                snapshot.conversationState.stage,
              goal: snapshot.currentGoal,
              interruptions:
                snapshot.interruptionCount,
            });
          },

          async onShouldEndCall() {
            console.log(
              "[ZENNX MEDIA] Employee completed call",
              {
                callSid,
                streamSid,
              },
            );

            await closeSession(
              "employee_completed_call",
            );
          },

          onError(error) {
            console.error(
              "[ZENNX MEDIA] VoiceSession error",
              {
                callSid,
                streamSid,
                message: error.message,
                stack: error.stack,
              },
            );
          },

          onLog(level, messageText, data) {
            const details = {
              callSid,
              streamSid,
              ...data,
            };

            if (level === "error") {
              console.error(
                `[ZENNX REALTIME] ${messageText}`,
                details,
              );
              return;
            }

            if (level === "warn") {
              console.warn(
                `[ZENNX REALTIME] ${messageText}`,
                details,
              );
              return;
            }

            if (
              level === "debug" &&
              process.env.NODE_ENV === "production"
            ) {
              return;
            }

            console.log(
              `[ZENNX REALTIME] ${messageText}`,
              details,
            );
          },
        },
      });

      await voiceSession.connect();

      console.log(
        "[ZENNX MEDIA] OpenAI Realtime socket opened",
        {
          callSid,
          streamSid,
        },
      );
    };

    twilioSocket.on("message", (rawMessage) => {
      void (async () => {
        let message: TwilioEvent;

        try {
          message = parseTwilioEvent(rawMessage);
        } catch (error) {
          console.error(
            "[ZENNX MEDIA] Invalid Twilio message",
            {
              error,
            },
          );

          return;
        }

        switch (message.event) {
          case "connected": {
            console.log(
              "[ZENNX MEDIA] Twilio protocol connected",
              {
                protocol: message.protocol,
                version: message.version,
              },
            );

            return;
          }

          case "start": {
            try {
              await createVoiceSession(message);
            } catch (error) {
              console.error(
                "[ZENNX MEDIA] Realtime startup failed",
                {
                  callSid,
                  streamSid,
                  error,
                },
              );

              await closeSession(
                "realtime_startup_failed",
              );
            }

            return;
          }

          case "media": {
            const payload = message.media.payload;

            if (!payload) {
              return;
            }

            if (voiceSession && realtimeReady) {
              voiceSession.appendAudio(payload);
              return;
            }

            if (
              bufferedAudio.length >=
              MAX_BUFFERED_AUDIO_CHUNKS
            ) {
              bufferedAudio.shift();
            }

            bufferedAudio.push(payload);
            return;
          }

          case "mark": {
            console.log(
              "[ZENNX MEDIA] Playback mark",
              {
                callSid,
                streamSid,
                name: message.mark?.name,
              },
            );

            return;
          }

          case "dtmf": {
            console.log("[ZENNX MEDIA] DTMF", {
              callSid,
              streamSid,
              digit: message.dtmf?.digit,
            });

            return;
          }

          case "stop": {
            await closeSession(
              "twilio_stream_stopped",
            );
            return;
          }

          default:
            return;
        }
      })();
    });

    twilioSocket.on("close", () => {
      void closeSession(
        "twilio_websocket_closed",
      );
    });

    twilioSocket.on("error", (error) => {
      console.error(
        "[ZENNX MEDIA] Twilio socket error",
        {
          callSid,
          streamSid,
          error,
        },
      );

      void closeSession(
        "twilio_websocket_error",
      );
    });
  },
);

server.listen(port, "0.0.0.0", () => {
  console.log("====================================");
  console.log("ZennX Realtime Voice Server Running");
  console.log(`Local: http://127.0.0.1:${port}`);
  console.log(
    `Health: http://127.0.0.1:${port}/health`,
  );
  console.log(
    `Incoming: http://127.0.0.1:${port}/voice/incoming`,
  );
  console.log(
    `Media: ws://127.0.0.1:${port}/voice/media`,
  );
  console.log(
    `Silence target base: ${SILENCE_DURATION_MS} ms`,
  );
  console.log("====================================");
});

async function shutdown(signal: string) {
  console.log(
    `[ZENNX VOICE] Received ${signal}. Shutting down.`,
  );

  for (const client of webSocketServer.clients) {
    client.close(1001, "server_shutdown");
  }

  webSocketServer.close();

  server.close((error) => {
    if (error) {
      console.error(
        "[ZENNX VOICE] Shutdown error",
        error,
      );
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

server.on("error", (error) => {
  console.error("[ZENNX VOICE] Server error", error);
});