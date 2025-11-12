export const MILLISECONDS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;

export const formatDuration = (elapsedMs: number) => `${elapsedMs}ms`;

export const formatSeconds = (elapsedMs: number) => {
  const seconds = (elapsedMs / MILLISECONDS_PER_SECOND).toFixed(1);

  return `${seconds}s`;
};

export const withStepTimer = async <T>(task: () => Promise<T>) => {
  const start = Date.now();
  const value = await task();

  return {
    elapsedMs: Date.now() - start,
    value
  };
};

export const minutesToMilliseconds = (minutes: number) => minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

