import { loadConfig } from "./config";
import { startHttpWsServer } from "./http-ws-server";
import { error, log } from "./logger";
import { SessionHub } from "./session-hub";

const config = loadConfig();
const hub = new SessionHub();

const httpWsServer = startHttpWsServer(config, hub);

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  log(`Received ${signal} signal. Terminating.`);

  httpWsServer.stop();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"] as const) {
  process.on(signal, () => {
    void shutdown(signal).finally(() => process.exit(0));
  });
}

process.on("unhandledRejection", (reason) => {
  error(`Unhandled rejection: ${String(reason)}`);
});

process.on("uncaughtException", (err) => {
  error(`Uncaught exception: ${err.message}`);
});
