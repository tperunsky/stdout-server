import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface TlsConfig {
  cert: string;
  key: string;
  certFile: string;
  keyFile: string;
}

export interface AppConfig {
  host: string;
  httpWsPort: number;
  httpIngestPaths: Set<string>;
  maxPayloadBytes: number;
  tls?: TlsConfig;
}

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  if (!raw || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return value;
}

function parseByteLimit(raw: string | undefined, fallback: number, name: string): number {
  if (!raw || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function parseHttpIngestPaths(raw: string | undefined): Set<string> {
  const paths = (raw ?? "/log,/log/")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => (entry.startsWith("/") ? entry : `/${entry}`));

  if (paths.length === 0) {
    return new Set(["/"]);
  }

  return new Set(paths);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const tlsCertFile = env.TLS_CERT_FILE?.trim();
  const tlsKeyFile = env.TLS_KEY_FILE?.trim();
  const rawPort = env.PORT ?? env.HTTP_WS_PORT ?? env.WS_PORT;

  if ((tlsCertFile && !tlsKeyFile) || (!tlsCertFile && tlsKeyFile)) {
    throw new Error("TLS_CERT_FILE and TLS_KEY_FILE must be provided together");
  }

  let tls: TlsConfig | undefined;
  if (tlsCertFile && tlsKeyFile) {
    const certFile = resolve(tlsCertFile);
    const keyFile = resolve(tlsKeyFile);

    tls = {
      certFile,
      keyFile,
      cert: readFileSync(certFile, "utf8"),
      key: readFileSync(keyFile, "utf8"),
    };
  }

  return {
    host: env.HOST?.trim() || "0.0.0.0",
    httpWsPort: parsePort(rawPort, 10661, "PORT"),
    httpIngestPaths: parseHttpIngestPaths(env.HTTP_INGEST_PATHS),
    maxPayloadBytes: parseByteLimit(env.MAX_PAYLOAD_BYTES, 131072, "MAX_PAYLOAD_BYTES"),
    tls,
  };
}
