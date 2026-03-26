#!/usr/bin/env bun

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, received "${value}"`);
  }

  return parsed;
}

const count = parsePositiveInteger(process.env.COUNT, 10);
const sessionId = process.env.SESSION_ID ?? "123";
const targetUrl = process.env.TARGET_URL ?? "http://127.0.0.1:10661/log";

async function sendMessage(index: number): Promise<void> {
  const payload = {
    s: sessionId,
    m: `Current time: ${Date.now()} (#${index + 1})`,
  };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Unexpected response status ${response.status}`);
  }
}

async function main(): Promise<void> {
  const start = performance.now();

  for (let i = 0; i < count; i += 1) {
    await sendMessage(i);
  }

  const elapsedMs = performance.now() - start;
  console.log(`${count} requests took: ${elapsedMs.toFixed(2)}ms`);
}

void main();
