/*
  Dependency Cache Manager
  Reuses node_modules across test configurations with identical dependencies
  to dramatically speed up testing.
*/

import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

type DependencyFingerprint = {
  frontend: string;
  databaseEngine: string;
  orm: string;
  databaseHost: string;
  authProvider: string;
  useTailwind: boolean;
  codeQualityTool?: string;
};

/**
 * Produce a stable fingerprint string for a dependency configuration.
 *
 * @param config - Dependency fields that affect installed packages; fields considered include `frontend`, `databaseEngine`, `orm`, `databaseHost`, `authProvider`, `useTailwind`, and `codeQualityTool`.
 * @returns A 16-character hexadecimal fingerprint identifying the provided dependency configuration.
 */
function getDependencyFingerprint(config: DependencyFingerprint): string {
  // Normalize the config to create a stable fingerprint
  const key = JSON.stringify({
    frontend: config.frontend,
    databaseEngine: config.databaseEngine,
    orm: config.orm,
    databaseHost: config.databaseHost,
    authProvider: config.authProvider,
    useTailwind: config.useTailwind,
    codeQualityTool: config.codeQualityTool || 'none'
  });
  
  // Use SHA-256 to create a deterministic hash
  return createHash('sha256').update(key).digest('hex').substring(0, 16);
}

const CACHE_DIR = join(process.cwd(), '.test-dependency-cache');

/**
 * Return the cache directory path for a given dependency fingerprint.
 *
 * @param fingerprint - The fingerprint identifying a dependency configuration
 * @returns The filesystem path to the cache directory for `fingerprint`
 */
function getCachePath(fingerprint: string): string {
  return join(CACHE_DIR, fingerprint);
}

/**
 * Determine whether a cached node_modules directory exists for the given dependency fingerprint.
 *
 * @param config - Dependency fingerprint describing the dependencies and configuration that affect installed packages
 * @returns `true` if a cached `node_modules` directory exists for the fingerprint, `false` otherwise
 */
export function hasCachedDependencies(config: DependencyFingerprint): boolean {
  const fingerprint = getDependencyFingerprint(config);
  const cachePath = getCachePath(fingerprint);
  const nodeModulesPath = join(cachePath, 'node_modules');
  
  return existsSync(nodeModulesPath) && statSync(nodeModulesPath).isDirectory();
}

/**
 * Ensure the project has a populated `node_modules` directory by restoring from a fingerprinted cache when available, otherwise installing dependencies and storing them in the cache.
 *
 * @param projectPath - Filesystem path to the project where `node_modules` will be placed
 * @param config - Dependency fingerprint describing the dependency/configuration set used to derive the cache key
 * @param packageJsonPath - Path to the project's `package.json`; when present it is copied into the cache for reference
 * @returns An object with `cached` set to `true` if dependencies were restored from the cache (otherwise `false`), and `installTime` representing the operation duration in milliseconds
 * @throws Error if dependency installation times out after 300 seconds
 * @throws Error if the dependency installer exits with a non-zero exit code
 */
export async function getOrInstallDependencies(
  projectPath: string,
  config: DependencyFingerprint,
  packageJsonPath: string
): Promise<{ cached: boolean; installTime: number }> {
  const fingerprint = getDependencyFingerprint(config);
  const cachePath = getCachePath(fingerprint);
  const nodeModulesPath = join(cachePath, 'node_modules');
  
  // Ensure cache directory exists
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  // If cache exists, copy it
  if (existsSync(nodeModulesPath) && statSync(nodeModulesPath).isDirectory()) {
    const startTime = Date.now();
    cpSync(nodeModulesPath, join(projectPath, 'node_modules'), { recursive: true });
    return { cached: true, installTime: Date.now() - startTime };
  }
  
  // Otherwise, install and cache
  const { $ } = await import('bun');
  const installStart = Date.now();
  
  // Install dependencies in the project
  const INSTALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const installPromise = $`cd ${projectPath} && bun install`.quiet().nothrow();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), INSTALL_TIMEOUT);
  });
  
  let installResult;
  try {
    installResult = await Promise.race([installPromise, timeoutPromise]) as Awaited<ReturnType<typeof $>>;
  } catch (e: any) {
    if (e.message === 'TIMEOUT') {
      throw new Error(`Dependency installation timed out after ${INSTALL_TIMEOUT / 1000} seconds`);
    }
    throw e;
  }
  
  const installTime = Date.now() - installStart;
  
  if (installResult.exitCode !== 0) {
    throw new Error(`Dependency installation failed with exit code ${installResult.exitCode}`);
  }
  
  // Cache the node_modules for future use
  // Also cache package.json and package-lock/bun.lockb for consistency
  if (!existsSync(cachePath)) {
    mkdirSync(cachePath, { recursive: true });
  }
  
  cpSync(join(projectPath, 'node_modules'), nodeModulesPath, { recursive: true });
  
  // Cache package files for reference
  if (existsSync(packageJsonPath)) {
    cpSync(packageJsonPath, join(cachePath, 'package.json'));
  }
  
  return { cached: false, installTime };
}

/**
 * Remove cached dependency entries older than the given number of days.
 *
 * This is a placeholder implementation that currently performs no deletions.
 *
 * @param maxAgeDays - Maximum age in days for cache entries before they are removed (default: 7)
 */
export function cleanupCache(maxAgeDays: number = 7): void {
  if (!existsSync(CACHE_DIR)) {
    return;
  }
  
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  
  // This would require reading directory entries - simplified for now
  // In production, you might want to add cache metadata files with timestamps
}
