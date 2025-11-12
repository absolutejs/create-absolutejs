import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import {
  computeManifestHash,
  getOrInstallDependencies,
  hasCachedDependencies,
  type DependencyFingerprint
} from '../../scripts/functional-tests/dependency-cache';
import { buildScaffoldArguments } from './cli';
import { runCommand } from './process';
import type { ScaffoldOptions, ScaffoldResult } from './types';

const PROJECT_PREFIX = 'behavioural';

const resolveProjectName = (explicitName?: string) => {
  if (explicitName) {
    return explicitName;
  }

  return `${PROJECT_PREFIX}-${randomUUID()}`;
};

export const scaffoldProject = async (
  options: ScaffoldOptions
): Promise<ScaffoldResult> => {
  const projectName = resolveProjectName(options.projectName);
  const projectPath = join(process.cwd(), projectName);

  if (existsSync(projectPath)) {
    rmSync(projectPath, { force: true, recursive: true });
  }

  const args = buildScaffoldArguments(projectName, options);
  const env: Record<string, string | undefined> = {};
  if (options.env) {
    Object.assign(env, options.env);
  }
  env.ABSOLUTE_TEST = 'behavioural';

  const result = await runCommand(['bun', 'run', 'src/index.ts', ...args], {
    env,
    label: 'scaffold project'
  }).catch((error) => {
    cleanupProject(projectPath);
    throw error;
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to scaffold project (${projectName}).\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return { projectName, projectPath };
};

const TMP_DIRECTORY_NAME = '.absolute-tmp';

export const installDependencies = async (projectPath: string, options: ScaffoldOptions) => {
  const tempDirectory = join(projectPath, TMP_DIRECTORY_NAME);
  if (!existsSync(tempDirectory)) {
    mkdirSync(tempDirectory, { recursive: true });
  }

  const fingerprint: DependencyFingerprint = {
    authProvider: options.auth ?? 'none',
    codeQualityTool: options.codeQuality ?? 'none',
    databaseEngine: options.database ?? 'none',
    databaseHost: options.databaseHost ?? 'none',
    frontend: options.frontend ?? 'none',
    orm: options.orm ?? 'none',
    useTailwind: options.useTailwind ?? false
  };

  const packageJsonPath = join(projectPath, 'package.json');
  const manifestHash = computeManifestHash(packageJsonPath);

  const allowFreshInstall =
    process.env.ABSOLUTE_BEHAVIOURAL_ALLOW_INSTALL !== 'false';
  const hasCache = hasCachedDependencies(
    fingerprint,
    packageJsonPath,
    manifestHash
  );

  if (!hasCache && !allowFreshInstall) {
    throw new Error(
      'Missing dependency cache for behavioural tests. Populate .test-dependency-cache or allow fresh installs by omitting ABSOLUTE_BEHAVIOURAL_ALLOW_INSTALL=false.'
    );
  }

  if (!hasCache && allowFreshInstall) {
    console.warn(
      '⚠ Behavioural dependency cache not found; performing a fresh install (set ABSOLUTE_BEHAVIOURAL_ALLOW_INSTALL=false to require the cache).'
    );
  }

  const previousTempEnv: Record<string, string | undefined> = {
    BUN_INSTALL_CACHE_DIR: process.env.BUN_INSTALL_CACHE_DIR,
    BUN_INSTALL_TMPDIR: process.env.BUN_INSTALL_TMPDIR,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    TMPDIR: process.env.TMPDIR
  };

  process.env.BUN_INSTALL_CACHE_DIR = tempDirectory;
  process.env.BUN_INSTALL_TMPDIR = tempDirectory;
  process.env.TEMP = tempDirectory;
  process.env.TMP = tempDirectory;
  process.env.TMPDIR = tempDirectory;

  try {
    const scenarioEnv = options.env ?? undefined;
    await getOrInstallDependencies(
      projectPath,
      fingerprint,
      packageJsonPath,
      manifestHash,
      scenarioEnv
    );
  } catch (error) {
    throw new Error(
      `Dependency installation failed for ${projectPath}: ${
        (error as Error).message
      }`
    );
  } finally {
    process.env.BUN_INSTALL_CACHE_DIR = previousTempEnv.BUN_INSTALL_CACHE_DIR;
    process.env.BUN_INSTALL_TMPDIR = previousTempEnv.BUN_INSTALL_TMPDIR;
    process.env.TEMP = previousTempEnv.TEMP;
    process.env.TMP = previousTempEnv.TMP;
    process.env.TMPDIR = previousTempEnv.TMPDIR;
  }
};

export const cleanupProject = (projectPath: string) => {
  if (existsSync(projectPath)) {
    rmSync(projectPath, { force: true, recursive: true });
  }
};

