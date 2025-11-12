import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

import type { RunCommandOptions, RunCommandResult } from './types';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_TIMEOUT_MINUTES = 10;
const DEFAULT_TIMEOUT_MS =
  DEFAULT_TIMEOUT_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const SIGKILL_DELAY_MS = 1_000;

export const runCommand = async (
  command: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> => {
  const [executable, ...args] = command;
  const { cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, label } = options;

  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let timedOut = false;

  child.stdout?.on('data', (chunk) => {
    stdoutChunks.push(chunk.toString());
  });

  child.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString());
  });

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), SIGKILL_DELAY_MS);
  }, timeoutMs);

  const [exitCode] = (await once(child, 'close')) as [number | null];
  clearTimeout(timeoutHandle);

  const stdout = stdoutChunks.join('').trimEnd();
  const stderr = stderrChunks.join('').trimEnd();

  if (timedOut) {
    return {
      exitCode: exitCode ?? -1,
      stderr: stderr.length > 0 ? stderr : `${label ?? 'command'} timed out after ${timeoutMs}ms`,
      stdout,
      timedOut: true
    };
  }

  return {
    exitCode: exitCode ?? -1,
    stderr,
    stdout,
    timedOut: false
  };
};

