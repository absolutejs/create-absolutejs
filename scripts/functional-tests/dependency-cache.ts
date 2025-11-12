/*
  Dependency Cache Manager
  Reuses node_modules across test configurations with identical dependencies
  to dramatically speed up testing.
*/

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';

export type DependencyFingerprint = {
  frontend: string;
  databaseEngine: string;
  orm: string;
  databaseHost: string;
  authProvider: string;
  useTailwind: boolean;
  codeQualityTool?: string;
};

const CACHE_DIR = join(process.cwd(), '.test-dependency-cache');
const LOCK_FILES = ['bun.lockb', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
const MINUTES_PER_INSTALL_TIMEOUT = 5;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const INSTALL_TIMEOUT_MS = MINUTES_PER_INSTALL_TIMEOUT * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_CACHE_MAX_AGE_DAYS = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const FORCE_KILL_DELAY_MS = 100;

const createFingerprintKey = (config: DependencyFingerprint, manifestHash: string) =>
  JSON.stringify({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool ?? 'none',
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    frontend: config.frontend,
    manifestHash,
    orm: config.orm,
    useTailwind: config.useTailwind
  });

const FINGERPRINT_LENGTH = 16;

const getDependencyFingerprint = (config: DependencyFingerprint, manifestHash: string) =>
  createHash('sha256')
    .update(createFingerprintKey(config, manifestHash))
    .digest('hex')
    .slice(0, FINGERPRINT_LENGTH);

const getCachePath = (fingerprint: string) => join(CACHE_DIR, fingerprint);

const safeRead = (path: string) => {
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
};

const ensureCacheDir = () => {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
};

export const computeManifestHash = (packageJsonPath: string) => {
  if (!existsSync(packageJsonPath)) {
    return 'missing';
  }

  const hash = createHash('sha256');
  const packageJsonContents = safeRead(packageJsonPath);

  if (!packageJsonContents) {
    return 'error:package-json-unreadable';
  }

  hash.update(packageJsonContents);

  const packageDir = dirname(packageJsonPath);

  LOCK_FILES.forEach((lockFile) => {
    const lockPath = join(packageDir, lockFile);
    const contents = safeRead(lockPath);

    if (contents) {
      hash.update(contents);
    }
  });

  return hash.digest('hex');
};

const readStoredManifestHash = (cachePath: string) => {
  const manifestHashPath = join(cachePath, 'manifest.hash');

  if (!existsSync(manifestHashPath)) {
    return null;
  }

  try {
    return readFileSync(manifestHashPath, 'utf-8').trim();
  } catch {
    return null;
  }
};

const restoreCache = (
  cachePath: string,
  projectPath: string,
  manifestHash: string
) => {
  const nodeModulesPath = join(cachePath, 'node_modules');
  const storedHash = readStoredManifestHash(cachePath);

  if (!storedHash || storedHash !== manifestHash) {
    return false;
  }

  if (!existsSync(nodeModulesPath) || !statSync(nodeModulesPath).isDirectory()) {
    return false;
  }

  const start = Date.now();
  cpSync(nodeModulesPath, join(projectPath, 'node_modules'), { recursive: true });

  return Date.now() - start;
};

const installDependencies = async (projectPath: string, env?: Record<string, string | undefined>) => {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let timedOut = false;

  const child = spawn('bun', ['install'], {
    cwd: projectPath,
    env: {
      ...process.env,
      ...(env ?? {}),
      ABSOLUTE_TEST: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
    } catch {
      // Ignore kill failures – process may already have exited.
    }
  }, INSTALL_TIMEOUT_MS);

  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()));

  const [code] = (await once(child, 'close')) as [number | null, string | null];
  clearTimeout(timeoutId);

  if (timedOut) {
    throw new Error(`Dependency installation timed out after ${INSTALL_TIMEOUT_MS}ms`);
  }

  if (code === 0) {
    return;
  }

  const combinedOutput = [stderrChunks.join(''), stdoutChunks.join('')]
    .map((section) => section.trim())
    .filter(Boolean)
    .join('\n');

  if (combinedOutput.length > 0) {
    const ERROR_PREVIEW_LINES = 10;
    throw new Error(combinedOutput.split('\n').slice(0, ERROR_PREVIEW_LINES).join('\n'));
  }

  throw new Error(`Dependency installation failed with exit code ${code ?? 'unknown'}`);
};

const cacheInstalledDependencies = (
  projectPath: string,
  cachePath: string,
  manifestHash: string,
  packageJsonPath: string
) => {
  if (!existsSync(cachePath)) {
    mkdirSync(cachePath, { recursive: true });
  }

  cpSync(join(projectPath, 'node_modules'), join(cachePath, 'node_modules'), { recursive: true });

  if (existsSync(packageJsonPath)) {
    cpSync(packageJsonPath, join(cachePath, 'package.json'));
  }

  const packageDir = dirname(packageJsonPath);

  LOCK_FILES.forEach((lockFile) => {
    const lockPath = join(packageDir, lockFile);

    if (existsSync(lockPath)) {
      cpSync(lockPath, join(cachePath, lockFile));
    }
  });

  writeFileSync(join(cachePath, 'manifest.hash'), manifestHash);
};

export const hasCachedDependencies = (
  config: DependencyFingerprint,
  packageJsonPath: string,
  manifestHashOverride?: string
) => {
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  const manifestHash = manifestHashOverride ?? computeManifestHash(packageJsonPath);

  if (manifestHash.startsWith('error:') || manifestHash === 'missing') {
    return false;
  }

  const fingerprint = getDependencyFingerprint(config, manifestHash);
  const cachePath = getCachePath(fingerprint);
  const nodeModulesPath = join(cachePath, 'node_modules');

  if (!existsSync(nodeModulesPath) || !statSync(nodeModulesPath).isDirectory()) {
    return false;
  }

  return readStoredManifestHash(cachePath) === manifestHash;
};

export const getOrInstallDependencies = async (
  projectPath: string,
  config: DependencyFingerprint,
  packageJsonPath: string,
  manifestHashOverride?: string,
  env?: Record<string, string | undefined>
): Promise<{ cached: boolean; installTime: number }> => {
  ensureCacheDir();

  const baseManifestHash = manifestHashOverride ?? computeManifestHash(packageJsonPath);
  const manifestHash = baseManifestHash.startsWith('error:') ? `fallback-${Date.now()}` : baseManifestHash;
  const fingerprint = getDependencyFingerprint(config, manifestHash);
  const cachePath = getCachePath(fingerprint);

  const restoredDuration = restoreCache(cachePath, projectPath, manifestHash);

  if (restoredDuration !== false) {
    return { cached: true, installTime: restoredDuration };
  }

  const installStart = Date.now();
  await installDependencies(projectPath, env);
  const installTime = Date.now() - installStart;

  const updatedManifestHash = manifestHashOverride ?? computeManifestHash(packageJsonPath);
  const finalFingerprint = getDependencyFingerprint(config, updatedManifestHash);
  const finalCachePath = getCachePath(finalFingerprint);

  cacheInstalledDependencies(projectPath, finalCachePath, updatedManifestHash, packageJsonPath);

  return { cached: false, installTime };
};

export const cleanupCache = (maxAgeDays = DEFAULT_CACHE_MAX_AGE_DAYS) => {
  if (!existsSync(CACHE_DIR)) {
    return;
  }

  const now = Date.now();
  const maxAgeMs =
    maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

  try {
    readdirSync(CACHE_DIR, { withFileTypes: true }).forEach((entry) => {
      if (!entry.isDirectory()) {
        return;
      }

      const entryPath = join(CACHE_DIR, entry.name);
      const stats = statSync(entryPath);

      if (!stats.isDirectory()) {
        return;
      }

      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        rmSync(entryPath, { force: true, recursive: true });
      }
    });
  } catch {
    // Ignore cleanup errors; they are non-fatal.
  }
};
