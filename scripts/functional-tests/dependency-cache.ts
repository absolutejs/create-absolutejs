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
 * Generate a unique cache key based on dependencies
 * Configs with same dependencies will share the same cache
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
 * Get the cache path for a dependency fingerprint
 */
function getCachePath(fingerprint: string): string {
  return join(CACHE_DIR, fingerprint);
}

/**
 * Check if a cached node_modules exists for this fingerprint
 */
export function hasCachedDependencies(config: DependencyFingerprint): boolean {
  const fingerprint = getDependencyFingerprint(config);
  const cachePath = getCachePath(fingerprint);
  const nodeModulesPath = join(cachePath, 'node_modules');
  
  return existsSync(nodeModulesPath) && statSync(nodeModulesPath).isDirectory();
}

/**
 * Get cached node_modules or install and cache them
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
 * Clean up old cache entries (optional - can be called periodically)
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

