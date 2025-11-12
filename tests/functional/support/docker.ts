import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { MILLISECONDS_PER_SECOND, minutesToMilliseconds } from './timing';
import { createFailure, createSuccess } from './types';

const DEFAULT_TIMEOUT_MS = minutesToMilliseconds(1);

export type DockerStatus =
  | {
      readonly available: true;
    }
  | {
      readonly available: false;
      readonly message: string;
    };

let cachedBunModule: typeof import('bun') | null = null;

const loadBun = async () => {
  if (!cachedBunModule) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

const runBunScript = async (projectPath: string, scriptArgs: string[], label: string, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  process.stdout.write(`  → ${label}... `);

  const start = Date.now();
  const bun = await loadBun();

  const subprocess = bun.spawn({
    cmd: ['bun', ...scriptArgs],
    cwd: projectPath,
    env: process.env,
    stderr: 'inherit',
    stdout: 'inherit'
  });

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      subprocess.kill();
    } catch {
      // Ignore kill errors.
    }
  }, timeoutMs);

  const exitCode = await subprocess.exited.then(() => subprocess.exitCode ?? 0).catch(() => null);
  clearTimeout(timeoutId);
  const elapsedMs = Date.now() - start;

  if (timedOut) {
    console.log(`✗ (TIMEOUT after ${(elapsedMs / MILLISECONDS_PER_SECOND).toFixed(1)}s)`);

    return createFailure([`${label} timed out after ${timeoutMs}ms`], elapsedMs);
  }

  if (exitCode === 0) {
    console.log(`✓ (${elapsedMs}ms)`);

    return createSuccess(elapsedMs);
  }

  console.log(`✗ (${elapsedMs}ms)`);

  return createFailure([`${label} failed with exit code ${exitCode ?? 'unknown'}`], elapsedMs);
};

export const dockerUp = (projectPath: string, timeoutMs?: number) =>
  runBunScript(projectPath, ['db:up'], 'Starting database (docker)', timeoutMs);

export const dockerDown = (projectPath: string, timeoutMs?: number) =>
  runBunScript(projectPath, ['db:down'], 'Stopping database (docker)', timeoutMs);

export const ensureDockerAvailable = () => {
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'pipe' });

    if (result.error) {
      return { available: false, message: result.error.message } satisfies DockerStatus;
    }

    if (typeof result.status !== 'number' || result.status === 0) {
      return { available: true } satisfies DockerStatus;
    }

    const stderr = result.stderr?.toString('utf-8')?.trim();
    const message = stderr?.length ? stderr : `docker info exited with code ${result.status}`;

    return { available: false, message } satisfies DockerStatus;
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { available: false, message: error.message } satisfies DockerStatus;
  }
};

