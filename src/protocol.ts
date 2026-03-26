export const REGISTER_SESSION_PREFIX = "StdoutOnline-Register-Session";

export interface ProducerEnvelope {
  sessionId: string;
  payload: unknown;
}

export function trimTrailingWhitespace(input: string): string {
  return input.replace(/\s+$/u, "");
}

export function toMessageText(message: string | Buffer | ArrayBuffer | Uint8Array): string {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(message)).toString("utf8");
  }

  return Buffer.from(message).toString("utf8");
}

export function messageByteLength(message: string | Buffer | ArrayBuffer | Uint8Array): number {
  if (typeof message === "string") {
    return Buffer.byteLength(message, "utf8");
  }

  if (message instanceof ArrayBuffer) {
    return message.byteLength;
  }

  return message.byteLength;
}

export function parseRegisterSessionCommand(raw: string): string | null {
  if (!raw.startsWith(REGISTER_SESSION_PREFIX)) {
    return null;
  }

  const sessionId = raw.slice(REGISTER_SESSION_PREFIX.length).trim();
  if (!sessionId) {
    return null;
  }

  return sessionId;
}

export function parseProducerEnvelope(raw: string): ProducerEnvelope | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    return null;
  }

  const record = decoded as Record<string, unknown>;
  if (!Object.hasOwn(record, "s") || !Object.hasOwn(record, "m")) {
    return null;
  }

  const sessionSource = record.s;
  if (sessionSource === undefined || sessionSource === null) {
    return null;
  }

  const sessionId = String(sessionSource).trim();
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    payload: record.m,
  };
}
