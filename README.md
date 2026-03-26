`stdout-server` is the real-time relay for `stdout.online`, rewritten to Bun + TypeScript.

It accepts producer messages over HTTP and pushes them to browser viewers over WebSocket. Session routing is fully in-memory, so run a single instance.

## Local Dev Script

Run the development container:

```bash
./run.sh
```

Stop it:

```bash
./stop.sh
```

The script bind-mounts the project into a Bun container and runs `bun --watch src/main.ts`, so local code changes are picked up without rebuilding an image.

## Architecture

- Producers send JSON payloads: `{"s":"<session-id>","m":<payload>}`
- Browsers open a WebSocket and register by sending: `StdoutOnline-Register-Session <session-id>`
- The server fans out `m` to every browser registered in session `s`

Message flow:

`producer (HTTP/WS) -> session hub -> browser WS clients`

## Run With Bun

```bash
bun run start
```

Development mode:

```bash
bun run dev
```

## Run With Docker

Build:

```bash
docker build -t stdout-server .
```

Run:

```bash
docker run --rm -p 10661:10661 -e PORT=10661 stdout-server
```

To keep it running in the background for local UI testing:

```bash
docker run --rm -d --name stdout-server-run -p 10661:10661 -e PORT=10661 stdout-server
```

## Render

Deploy this repo as a `Web Service` with the Docker runtime.

Set:

- `PORT` to Render's assigned port automatically
- `HTTP_INGEST_PATHS` to `/log,/log/` unless you want a different public path
- `MAX_PAYLOAD_BYTES` if you want a limit different from the default `131072`

The same service handles both HTTP ingest and browser WebSocket connections.

## Config

Environment variables:

- `HOST` default: `0.0.0.0`
- `PORT` default: `10661`
- `HTTP_WS_PORT` fallback if `PORT` is unset
- `HTTP_INGEST_PATHS` default: `/log,/log/`
- `MAX_PAYLOAD_BYTES` default: `131072`
- `TLS_CERT_FILE` optional, requires `TLS_KEY_FILE`
- `TLS_KEY_FILE` optional, requires `TLS_CERT_FILE`

If TLS files are set, Bun serves HTTPS + WSS on the configured port. If they are not set, it serves HTTP + WS.

## Protocol

Browser registration command:

```text
StdoutOnline-Register-Session 123
```

Producer payload format:

```json
{"s":123,"m":"Hello World"}
```

Outbound message to browser:

```json
"Hello World"
```

## Examples

HTTP ingest:

```bash
curl -X POST http://localhost:10661/log \
  -H 'Content-Type: application/json' \
  -d '{"s":"123","m":"Hello from HTTP"}'
```

Synthetic sender:

```bash
bun run test:sender
```

To target a different endpoint:

```bash
TARGET_URL=https://your-server.example/log SESSION_ID=demo bun run test:sender
```

To send 10 test messages to a locally running Dockerized server from the Docker image itself:

```bash
docker run --rm \
  -e TARGET_URL=http://host.docker.internal:10661/log \
  -e SESSION_ID=paste-your-session-id-here \
  -e COUNT=10 \
  stdout-server \
  bun bin/test-sender.ts
```
