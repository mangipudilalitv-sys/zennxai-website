import { createServer } from "node:http";
import WebSocket, {
  WebSocketServer,
  type RawData,
} from "ws";

import { VoiceSession } from "../../../lib/realtime/voice-session";

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

const MAX_BUFFERED_AUDIO_CHUNKS = 500;

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

const server = createServer((_request, response) => {
  response.statusCode = 426;
  response.setHeader("Content-Type", "text/plain");
  response.end("WebSocket connection required.");
});

const webSocketServer = new WebSocketServer({
  server,
  perMessageDeflate: false,
});

webSocketServer.on("connection", (twilioSocket) => {
  let callSid = "";
  let streamSid = "";

  let voiceSession: VoiceSession | null = null;
  let realtimeConnected = false;
  let closing = false;

  const bufferedAudio: string[] = [];

  console.log("[ZENNX MEDIA] Twilio WebSocket connected");

  const closeSession = async (reason: string): Promise<void> => {
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
    realtimeConnected = false;
    bufferedAudio.length = 0;

    if (activeSession) {
      try {
        await activeSession.close(reason);
      } catch (error) {
        console.error("[ZENNX MEDIA] VoiceSession close failed", {
          callSid,
          streamSid,
          error,
        });
      }
    }

    if (
      twilioSocket.readyState === WebSocket.OPEN ||
      twilioSocket.readyState === WebSocket.CONNECTING
    ) {
      twilioSocket.close(1000, reason);
    }
  };

  twilioSocket.on("message", (rawMessage) => {
    void (async () => {
      let message: TwilioEvent;

      try {
        message = parseTwilioEvent(rawMessage);
      } catch (error) {
        console.error("[ZENNX MEDIA] Invalid Twilio message", {
          error,
        });
        return;
      }

      switch (message.event) {
        case "connected": {
          console.log("[ZENNX MEDIA] Twilio protocol connected", {
            protocol: message.protocol,
            version: message.version,
          });
          return;
        }

        case "start": {
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
          });

          try {
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

              silenceDurationMs: 650,
              prefixPaddingMs: 300,
              vadThreshold: 0.5,
              idleTimeoutMs: 7000,
              voiceSpeed: 1.05,

              callbacks: {
                onAudioDelta(audioBase64) {
                  if (!streamSid) {
                    return;
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

                  sendTwilioEvent(twilioSocket, {
                    event: "clear",
                    streamSid,
                  });
                },

                onUserTranscript(transcript) {
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
            realtimeConnected = true;

            console.log(
              "[ZENNX MEDIA] Realtime connection opened",
              {
                callSid,
                streamSid,
                bufferedChunks: bufferedAudio.length,
              },
            );

            while (
              voiceSession &&
              bufferedAudio.length > 0
            ) {
              const audioChunk = bufferedAudio.shift();

              if (audioChunk) {
                voiceSession.appendAudio(audioChunk);
              }
            }
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

          if (voiceSession && realtimeConnected) {
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
          console.log("[ZENNX MEDIA] Playback mark", {
            callSid,
            streamSid,
            name: message.mark?.name,
          });
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
          await closeSession("twilio_stream_stopped");
          return;
        }

        default:
          return;
      }
    })();
  });

  twilioSocket.on("close", () => {
    void closeSession("twilio_websocket_closed");
  });

  twilioSocket.on("error", (error) => {
    console.error("[ZENNX MEDIA] Twilio socket error", {
      callSid,
      streamSid,
      error,
    });

    void closeSession("twilio_websocket_error");
  });
});

export default server;