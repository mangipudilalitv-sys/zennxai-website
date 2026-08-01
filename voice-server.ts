import { loadEnvConfig } from "@next/env";
import { createServer } from "node:http";

loadEnvConfig(process.cwd());

const port = Number(process.env.VOICE_SERVER_PORT ?? 8080);

const server = createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        ok: true,
        service: "zennx-voice-server",
      })
    );

    return;
  }

  if (
    req.url === "/voice/incoming" &&
    (req.method === "GET" || req.method === "POST")
  ) {
    const host = req.headers.host;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/voice/media" />
  </Connect>
</Response>`;

    res.writeHead(200, {
      "Content-Type": "text/xml",
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
    })
  );
});

server.listen(port, "127.0.0.1", () => {
  console.log("====================================");
  console.log(`ZennX Voice Server Running`);
  console.log(`http://127.0.0.1:${port}`);
  console.log(`Health: http://127.0.0.1:${port}/health`);
  console.log("====================================");
});

server.on("error", (err) => {
  console.error(err);
});