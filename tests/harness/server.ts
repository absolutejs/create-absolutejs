import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { waitForHttpOk } from './http';
import type { RunningServer, StartServerOptions } from './types';

const DEFAULT_COMMAND = ['bun', 'run', 'dev'];
const DEFAULT_READY_URL = 'http://localhost:3000/';
const DEFAULT_READY_TIMEOUT_MS = 20_000;
const STOP_TIMEOUT_MS = 1_000;

export const startServer = async (
  projectPath: string,
  options: StartServerOptions = {}
): Promise<RunningServer> => {
  const command = options.command ?? DEFAULT_COMMAND;
  const readyUrl = options.readyUrl ?? DEFAULT_READY_URL;
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;

  const env: Record<string, string | undefined> = {};
  if (options.env) {
    Object.assign(env, options.env);
  }
  env.ABSOLUTE_TEST = 'behavioural';

  const childEnv = { ...process.env, ...env } as Record<string, string | undefined>;

  if (process.env.ABSOLUTE_TEST_VERBOSE === '1' && childEnv.DATABASE_URL) {
    console.log(`startServer env: DATABASE_URL=${childEnv.DATABASE_URL}`);
  }

  const captureOutput = process.env.ABSOLUTE_TEST_VERBOSE === '1';
  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];
  const OUTPUT_TAIL_LINES = 20;

  const child = spawn(command[0], command.slice(1), {
    cwd: projectPath,
    env: childEnv,
    stdio: [
      'ignore',
      options.forwardStdout ? 'inherit' : 'pipe',
      options.forwardStderr ? 'inherit' : 'pipe'
    ]
  });

  let exited = false;
  let exitCode: number | null = null;

  const exitWatcher = once(child, 'exit').then(([code, signal]) => {
    exited = true;
    exitCode = code ?? 0;

    if (!options.forwardStdout && child.stdout) {
      child.stdout.removeAllListeners('data');
    }
    if (!options.forwardStderr && child.stderr) {
      child.stderr.removeAllListeners('data');
    }

    const terminatedBySignal =
      typeof signal === 'string' && signal.length > 0;

    if (!terminatedBySignal && exitCode !== 0) {
      console.warn(`Server process exited prematurely with code ${code}`);
    }

    return exitCode ?? 0;
  });

  if (!options.forwardStdout && child.stdout) {
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdoutBuffer.push(text);
      if (captureOutput) {
        process.stdout.write(text);
      }
    });
  }

  if (!options.forwardStderr && child.stderr) {
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderrBuffer.push(text);
      if (captureOutput) {
        process.stderr.write(text);
      }
    });
  }

  const buildDiagnosticMessage = (base: string, cause?: unknown) => {
    const tail = (lines: string[], maxLines: number) =>
      lines.join('').split('\n').filter(Boolean).slice(-maxLines).join('\n');

    const stdoutTail = tail(stdoutBuffer, OUTPUT_TAIL_LINES);
    const stderrTail = tail(stderrBuffer, OUTPUT_TAIL_LINES);

    const details: string[] = [base];

    if (stdoutTail.length > 0) {
      details.push(`stdout:\n${stdoutTail}`);
    }

    if (stderrTail.length > 0) {
      details.push(`stderr:\n${stderrTail}`);
    }

    if (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      details.push(`cause: ${message}`);
    }

    return details.join('\n\n');
  };

  try {
    await waitForHttpOk(readyUrl, readyTimeoutMs);
  } catch (error) {
    child.kill('SIGTERM');
    await exitWatcher;
    if (exitCode && exitCode !== 0) {
      throw new Error(
        buildDiagnosticMessage(
          `Server process exited with code ${exitCode} while waiting for readiness (${readyUrl}).`,
          error
        )
      );
    }

    throw new Error(
      buildDiagnosticMessage(
        `Server did not become ready within ${readyTimeoutMs}ms (${readyUrl}).`,
        error
      )
    );
  }

  return {
    url: readyUrl,
    stop: async () => {
      if (exited) {
        return;
      }

      child.kill('SIGTERM');
      await Promise.race([exitWatcher, delay(STOP_TIMEOUT_MS)]);

      if (!exited) {
        child.kill('SIGKILL');
        await exitWatcher;
      }
    }
  };
};

