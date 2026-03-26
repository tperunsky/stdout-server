import type { AppConfig } from "./config";
import { log, warn } from "./logger";
import {
  messageByteLength,
  parseProducerEnvelope,
  parseRegisterSessionCommand,
  toMessageText,
  trimTrailingWhitespace,
} from "./protocol";
import { SessionHub, type SocketData } from "./session-hub";

export interface HttpWsServerHandle {
  stop: () => void;
}

function plainResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function isWebSocketUpgrade(req: Request): boolean {
  const upgrade = req.headers.get("upgrade");
  return typeof upgrade === "string" && upgrade.toLowerCase() === "websocket";
}

async function readRequestTextWithLimit(req: Request, maxPayloadBytes: number): Promise<string | null> {
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxPayloadBytes) {
      return null;
    }
  }

  if (!req.body) {
    return "";
  }

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxPayloadBytes) {
      await reader.cancel();
      return null;
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

async function handleHttpIngest(req: Request, hub: SessionHub, maxPayloadBytes: number): Promise<Response> {
  const requestText = await readRequestTextWithLimit(req, maxPayloadBytes);
  if (requestText === null) {
    return plainResponse(`Payload too large. Max size is ${maxPayloadBytes} bytes`, 413);
  }

  const rawBody = trimTrailingWhitespace(requestText);
  if (!rawBody) {
    return plainResponse("Request body is empty", 400);
  }

  const envelope = parseProducerEnvelope(rawBody);
  if (!envelope) {
    return plainResponse("Expected JSON payload with keys s and m", 400);
  }

  const publishResult = hub.publish(envelope.sessionId, envelope.payload);
  if (!publishResult.hasSubscribers) {
    warn(`Invalid session id supplied: ${envelope.sessionId}`);
  }

  return new Response(null, { status: 204 });
}

export function startHttpWsServer(config: AppConfig, hub: SessionHub): HttpWsServerHandle {
  const server = Bun.serve<SocketData>({
    hostname: config.host,
    port: config.httpWsPort,
    tls: config.tls
      ? {
          cert: config.tls.cert,
          key: config.tls.key,
        }
      : undefined,
    fetch(req, serverContext) {
      const url = new URL(req.url);

      if (isWebSocketUpgrade(req)) {
        const upgraded = serverContext.upgrade(req, {
          data: {
            connectedAt: Date.now(),
          },
        });

        if (upgraded) {
          return;
        }

        return plainResponse("WebSocket upgrade failed", 400);
      }

      if (req.method === "GET" && url.pathname === "/health") {
        return plainResponse("ok", 200);
      }

      if (req.method === "POST" && config.httpIngestPaths.has(url.pathname)) {
        return handleHttpIngest(req, hub, config.maxPayloadBytes);
      }

      return plainResponse("Not Found", 404);
    },
    websocket: {
      open(ws) {
        hub.onOpen(ws);
        log("New WebSocket connection opened");
      },
      message(ws, message) {
        const payloadSize = messageByteLength(message);
        if (payloadSize > config.maxPayloadBytes) {
          warn(`Discarded oversized WebSocket payload (${payloadSize} bytes)`);
          return;
        }

        const rawMessage = trimTrailingWhitespace(toMessageText(message));
        if (!rawMessage) {
          return;
        }

        const sessionId = parseRegisterSessionCommand(rawMessage);
        if (sessionId !== null) {
          const registrationResult = hub.register(ws, sessionId);
          if (registrationResult.ok) {
            log(`Connection is now registered with session id ${registrationResult.sessionId}`);
          } else if (registrationResult.reason === "already_registered") {
            warn(`Connection is already registered with session id ${registrationResult.sessionId}`);
          } else {
            warn("WebSocket registration command is missing a session id");
          }
          return;
        }

        const envelope = parseProducerEnvelope(rawMessage);
        if (!envelope) {
          warn("Discarded invalid WebSocket payload");
          return;
        }

        const publishResult = hub.publish(envelope.sessionId, envelope.payload, ws);
        if (!publishResult.hasSubscribers) {
          warn(`Invalid session id supplied: ${envelope.sessionId}`);
        }
      },
      close(ws) {
        hub.remove(ws);
        log("WebSocket connection has disconnected");
      },
    },
  });

  const protocolLabel = config.tls ? "HTTPS/WSS" : "HTTP/WS";
  log(`Running ${protocolLabel} server on ${config.host}:${server.port}`);

  return {
    stop: () => {
      server.stop(true);
    },
  };
}
