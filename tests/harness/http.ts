import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_INTERVAL_MS = 250;

export const waitForHttpOk = async (
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS
) => {
  const start = Date.now();

  const poll = async () => {
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`Timed out waiting for HTTP 200 from ${url}`);
    }

    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore errors while waiting for the server to boot.
    }

    await delay(intervalMs);
    await poll();
  };

  await poll();
};

