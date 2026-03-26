type LogLevel = "INFO" | "WARN" | "ERROR";

function format(level: LogLevel, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

export function log(message: string, ...meta: unknown[]): void {
  console.log(format("INFO", message), ...meta);
}

export function warn(message: string, ...meta: unknown[]): void {
  console.warn(format("WARN", message), ...meta);
}

export function error(message: string, ...meta: unknown[]): void {
  console.error(format("ERROR", message), ...meta);
}
