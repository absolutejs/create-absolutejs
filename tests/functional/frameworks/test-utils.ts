import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { describe, test } from 'bun:test';

import type { DependencyFingerprint } from '../../../scripts/functional-tests/dependency-cache';
import { createMatrix, type MatrixConfig } from '../../../scripts/functional-tests/matrix';
import {
  assertStepSuccess,
  cleanupProject,
  installDependencies,
  logWarnings as logStepWarnings,
  minutesToMilliseconds,
  scaffoldProject
} from '../support';
import type { ScaffoldOptions } from '../support/scaffold';

type MatrixEntry = MatrixConfig & {
  directoryConfig: 'default';
};

type MatrixTestOptions<TConfig extends MatrixEntry> = {
  readonly describeBlock: string;
  readonly createProjectName: (config: TConfig) => string;
  readonly describeConfig: (config: TConfig) => string;
  readonly filterMatrix: (config: MatrixConfig) => config is TConfig;
  readonly validate: (args: {
    config: TConfig;
    projectPath: string;
  }) => Promise<{ passed: boolean; errors: string[]; warnings: string[] }>;
  readonly buildScaffoldOptions: (config: TConfig) => Omit<ScaffoldOptions, 'projectName'>;
  readonly createFingerprint?: (config: TConfig) => DependencyFingerprint;
  readonly beforeValidate?: (args: { config: TConfig; projectPath: string }) => Promise<void>;
  readonly afterValidate?: (args: { config: TConfig; projectPath: string }) => Promise<void>;
  readonly testTimeoutMinutes?: number;
  readonly ensureProjectDir?: (projectPath: string) => void;
};

const ensureDirectory = (path: string) => {
  try {
    mkdirSync(path, { recursive: true });
  } catch {
    // ignore errors; directory creation is best effort
  }
};

const defaultFingerprint = (config: MatrixEntry): DependencyFingerprint => ({
  authProvider: config.authProvider,
  codeQualityTool: config.codeQualityTool,
  databaseEngine: config.databaseEngine,
  databaseHost: config.databaseHost,
  frontend: config.frontend,
  orm: config.orm,
  useTailwind: config.useTailwind
});

const DEFAULT_TIMEOUT_MINUTES = 10;

const throwIfValidationFailed = (errors: string[]) => {
  if (errors.length === 0) {
    throw new Error('Validation failed:\n  - Unknown validation failure');
  }

  const message = errors.map((error) => `  - ${error}`).join('\n');
  throw new Error(`Validation failed:\n${message}`);
};

const ensureValidationPassed = (passed: boolean, errors: string[]) => {
  if (passed) {
    return;
  }

  throwIfValidationFailed(errors);
};

export const runFrameworkMatrix = <TConfig extends MatrixEntry>({
  describeBlock,
  createProjectName,
  describeConfig,
  filterMatrix,
  validate,
  buildScaffoldOptions,
  createFingerprint = defaultFingerprint,
  beforeValidate,
  afterValidate,
  testTimeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
  ensureProjectDir
}: MatrixTestOptions<TConfig>) => {
  const timeoutMs = minutesToMilliseconds(testTimeoutMinutes);

  const allEntries = createMatrix()
    .filter(filterMatrix)
    .sort((a, b) => describeConfig(a).localeCompare(describeConfig(b)));

  const runScenario = async (config: TConfig) => {
    const scenarioName = describeConfig(config);
    const summaryEntries = [
      ['frontend', config.frontend],
      ['databaseEngine', config.databaseEngine],
      ['databaseHost', config.databaseHost],
      ['orm', config.orm],
      ['authProvider', config.authProvider],
      ['useTailwind', config.useTailwind ? 'true' : 'false'],
      ['codeQualityTool', config.codeQualityTool]
    ].filter(([, value]) => value && value !== 'none' && value !== false);

    console.log(`\n=== Scenario: ${scenarioName} ===`);

    if (summaryEntries.length > 0) {
      console.log('Configuration:');
      summaryEntries.forEach(([key, value]) => {
        console.log(`  • ${key}: ${value as string}`);
      });
      console.log('');
    }

    // Respect matrix skip annotations (skip tests instead of failing)
    const configWithMeta = config as MatrixConfig;
    if (configWithMeta.skip) {
      console.log(`SKIPPING scenario: ${scenarioName} – ${configWithMeta.skipReason || 'no reason provided'}`);

      return;
    }

	// Respect required environment variables for cloud-hosted scenarios
    const {requiredEnv} = configWithMeta;
    const hasRequiredEnv = requiredEnv && Array.isArray(requiredEnv);
    const missing = hasRequiredEnv ? requiredEnv.filter((envVar) => !process.env[envVar]) : [];
    if (missing.length > 0) {
      console.log(`SKIPPING scenario: ${scenarioName} – missing env vars: ${missing.join(', ')}`);

      return;
    }    const projectName = createProjectName(config);
    const projectPath = join(process.cwd(), projectName);

    if (ensureProjectDir) {
      ensureProjectDir(projectPath);
    } else {
      ensureDirectory(projectPath);
    }

    const scaffold = await scaffoldProject({
      ...buildScaffoldOptions(config),
      projectName
    });

    assertStepSuccess(scaffold, 'Scaffold');
    logStepWarnings(scaffold);

    try {
      const { projectPath: scaffoldPath } = scaffold;
      const dependencies = await installDependencies({
        fingerprint: createFingerprint(config),
        projectPath: scaffoldPath
      });

      assertStepSuccess(dependencies, 'Dependency installation');
      logStepWarnings(dependencies);

      await beforeValidate?.({ config, projectPath: scaffoldPath });
      const { errors, passed, warnings } = await validate({
        config,
        projectPath: scaffoldPath
      });

      ensureValidationPassed(passed, errors);
      warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
      await afterValidate?.({ config, projectPath: scaffoldPath });
    } finally {
      cleanupProject(projectName);
      console.log(`=== Finished: ${scenarioName} ===\n`);
    }
  };

  describe(describeBlock, () => {
    for (const config of allEntries) {
      test(describeConfig(config), () => runScenario(config), { timeout: timeoutMs });
    }
  });
};

export const runMatrixSuite = runFrameworkMatrix;

