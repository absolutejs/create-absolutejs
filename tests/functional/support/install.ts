import { join } from 'node:path';

import {
  computeManifestHash,
  getOrInstallDependencies,
  hasCachedDependencies,
  type DependencyFingerprint
} from '../../../scripts/functional-tests/dependency-cache';
import { createFailure, createSuccess, type StepResult } from './types';

export type InstallOptions = {
  readonly projectPath: string;
  readonly fingerprint: DependencyFingerprint;
  readonly manifestHashOverride?: string;
  readonly env?: Record<string, string | undefined>;
};

export type InstallResult = StepResult & {
  readonly cached: boolean;
};

const logCached = (elapsedMs: number) => console.log(`✓ (cached, ${elapsedMs}ms)`);
const logInstalled = (elapsedMs: number) => console.log(`✓ (${elapsedMs}ms)`);

export const installDependencies = async (options: InstallOptions) => {
  process.stdout.write('  → Installing dependencies... ');

  const packageJsonPath = join(options.projectPath, 'package.json');

  const start = Date.now();

  try {
    const { cached, installTime } = await getOrInstallDependencies(
      options.projectPath,
      options.fingerprint,
      packageJsonPath,
      options.manifestHashOverride,
      options.env
    );

    const elapsedMs = Date.now() - start;
    const outputTime = cached ? installTime : elapsedMs;

    const log = cached ? logCached : logInstalled;
    log(outputTime);

    return {
      ...createSuccess(elapsedMs),
      cached
    } satisfies InstallResult;
  } catch (unknownError) {
    const elapsedMs = Date.now() - start;
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    console.log(`✗ (${elapsedMs}ms)`);

    return {
      ...createFailure([error.message], elapsedMs),
      cached: false
    } satisfies InstallResult;
  }
};

export const hasDependencyCache = (
  fingerprint: DependencyFingerprint,
  projectPath: string,
  manifestHashOverride?: string
) => hasCachedDependencies(fingerprint, join(projectPath, 'package.json'), manifestHashOverride);

export const getManifestHash = (projectPath: string) => computeManifestHash(join(projectPath, 'package.json'));

