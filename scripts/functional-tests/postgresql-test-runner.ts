/*
  PostgreSQL Test Runner
  Tests PostgreSQL database across all compatible backend combinations.
  Uses the test matrix to generate valid PostgreSQL + backend combinations.
*/

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import {
  computeManifestHash,
  getOrInstallDependencies,
  hasCachedDependencies
} from './dependency-cache';
import { runFunctionalTests } from './functional-test-runner';
import { createMatrix, type MatrixConfig } from './matrix';
import {
  isPostgresDockerManaged,
  stopManagedPostgresDocker,
  validatePostgreSQLDatabase
} from './postgresql-validator';
import { cleanupProjectDirectory } from './test-utils';

type TestMatrixEntry = MatrixConfig;

type PostgresqlTestResult = {
  config: TestMatrixEntry;
  errors: string[];
  passed: boolean;
  testTime?: number;
  warnings: string[];
};

type StepOutcome = {
  elapsedMs: number;
  errors: string[];
  success: boolean;
  warnings: string[];
};

type DependencyConfig = {
  authProvider: string;
  codeQualityTool?: string;
  databaseEngine: string;
  databaseHost: string;
  frontend: string;
  orm: string;
  useTailwind: boolean;
};

const EXCLUDED_HOSTS = new Set(['planetscale']);
const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SCAFFOLD_TIMEOUT_MS = 2 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DATABASE_SHUTDOWN_TIMEOUT_SECONDS = 30;
const DATABASE_SHUTDOWN_TIMEOUT_MS = DATABASE_SHUTDOWN_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND;
const HUNDRED_PERCENT = 100;
const MAX_ERRORS_TO_DISPLAY = 3;

let cachedBunModule: typeof import('bun') | null = null;

const loadBunModule = async () => {
  if (cachedBunModule === null) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

const createProjectName = (config: TestMatrixEntry) =>
  `test-postgresql-${config.frontend}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${
    config.databaseHost === 'none' ? 'local' : config.databaseHost
  }-${config.useTailwind ? 'tw' : 'notw'}`
    .replace(/[^a-z0-9-]/g, '-')
    .toLowerCase();

const getFrontendFlag = (frontend: string) => {
  if (frontend === 'none') {
    return null;
  }

  return `--${frontend}`;
};

const buildScaffoldCommand = (
  projectName: string,
  config: TestMatrixEntry
) => {
  const command = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
  const frontendFlag = getFrontendFlag(config.frontend);

  if (frontendFlag) {
    command.push(frontendFlag);
  }

  command.push('--db', 'postgresql');

  if (config.orm !== 'none') {
    command.push('--orm', config.orm);
  }

  if (config.databaseHost !== 'none') {
    command.push('--db-host', config.databaseHost);
  }

  if (config.authProvider !== 'none') {
    command.push('--auth', config.authProvider);
  }

  if (config.codeQualityTool === 'eslint+prettier') {
    command.push('--eslint+prettier');
  }

  if (config.useTailwind) {
    command.push('--tailwind');
  }

  if (config.directoryConfig === 'custom') {
    command.push('--directory', 'custom');
  }

  return command;
};

const raceWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void
) => {
  const bunModule = await loadBunModule();
  const timeoutPromise = bunModule.sleep(timeoutMs).then(() => {
    onTimeout();
    throw new Error('TIMEOUT');
  });

  return Promise.race([promise, timeoutPromise]) as Promise<T>;
};

const runCommand = async (
  command: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
) => {
  const { cwd, timeoutMs = SCAFFOLD_TIMEOUT_MS } = options;
  const bunModule = await loadBunModule();
  const processHandle = bunModule.spawn({
    cmd: command,
    cwd,
    env: {
      ...process.env,
      ABSOLUTE_TEST: 'true'
    },
    stderr: 'inherit',
    stdin: 'inherit',
    stdout: 'inherit'
  });

  try {
    const exitCode = await raceWithTimeout(
      processHandle.exited.then(() => processHandle.exitCode ?? 0),
      timeoutMs,
      () => processHandle.kill()
    );

    return { exitCode };
  } catch (error) {
    if ((error as Error).message === 'TIMEOUT') {
      return null;
    }

    throw error;
  }
};

const recordFailure = (
  message: string,
  elapsedMs: number
): StepOutcome => ({
  elapsedMs,
  errors: [message],
  success: false,
  warnings: []
});

const scaffoldProject = async (
  projectPath: string,
  command: string[]
) => {
  cleanupProjectDirectory(projectPath);
  process.stdout.write('  → Scaffolding project... ');

  const startMs = Date.now();
  const commandResult = await runCommand(command);
  const elapsedMs = Date.now() - startMs;

  if (commandResult === null) {
    const elapsedSeconds = elapsedMs / MILLISECONDS_PER_SECOND;
    console.log(`✗ (TIMEOUT after ${elapsedSeconds}s)`);

    return recordFailure(
      `Scaffold timed out after ${elapsedSeconds} seconds`,
      elapsedMs
    );
  }

  if (commandResult.exitCode !== 0) {
    console.log(`✗ (${elapsedMs}ms)`);

    return recordFailure(
      `Scaffold failed with exit code ${commandResult.exitCode}`,
      elapsedMs
    );
  }

  console.log(`✓ (${elapsedMs}ms)`);

  return {
    elapsedMs,
    errors: [],
    success: true,
    warnings: []
  } satisfies StepOutcome;
};

const installDependencies = async (
  projectPath: string,
  config: TestMatrixEntry,
  packageJsonPath: string
) => {
  process.stdout.write('  → Installing dependencies... ');

  const manifestHash = computeManifestHash(packageJsonPath);
  const dependencyConfig: DependencyConfig = {
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    frontend: config.frontend,
    orm: config.orm,
    useTailwind: config.useTailwind
  };

  const cachedDependency = hasCachedDependencies(
    dependencyConfig,
    packageJsonPath,
    manifestHash
  );

  try {
    const { cached, installTime } = await getOrInstallDependencies(
      projectPath,
      dependencyConfig,
      packageJsonPath,
      manifestHash
    );

    console.log(
      cached || cachedDependency ? `✓ (cached, ${installTime}ms)` : `✓ (${installTime}ms)`
    );

    return {
      elapsedMs: installTime,
      errors: [],
      success: true,
      warnings: []
    } satisfies StepOutcome;
  } catch (error) {
    const { message } = error as Error;
    console.log(`✗ (${message})`);

    return {
      elapsedMs: 0,
      errors: [`Dependency installation failed: ${message}`],
      success: false,
      warnings: []
    } satisfies StepOutcome;
  }
};

const runFunctionalSuite = async (projectPath: string) => {
  process.stdout.write('  → Running functional tests... ');

  const startMs = Date.now();
  try {
    const result = await runFunctionalTests(projectPath, 'bun', {
      skipBuild: false,
      skipDependencies: true,
      skipServer: false
    });
    const elapsedMs = Date.now() - startMs;

    if (!result.passed) {
      return {
        elapsedMs,
        errors: [...result.errors],
        success: false,
        warnings: [...result.warnings]
      } satisfies StepOutcome;
    }

    return {
      elapsedMs,
      errors: [],
      success: true,
      warnings: [...result.warnings]
    } satisfies StepOutcome;
  } catch (error) {
    const elapsedMs = Date.now() - startMs;
    const { message } = error as Error;
    console.log(`✗ (${message})`);

    return {
      elapsedMs,
      errors: [`Functional tests error: ${message}`],
      success: false,
      warnings: []
    } satisfies StepOutcome;
  }
};

const validateDatabase = async (
  projectPath: string,
  config: TestMatrixEntry
) => {
  process.stdout.write('  → Running PostgreSQL validation... ');

  const validateStartMs = Date.now();
  const validationResult = await validatePostgreSQLDatabase(projectPath, {
    authProvider: config.authProvider,
    databaseHost: config.databaseHost,
    orm: config.orm
  });
  const elapsedMs = Date.now() - validateStartMs;

  console.log(
    validationResult.passed ? `✓ (${elapsedMs}ms)` : `✗ (${elapsedMs}ms)`
  );

  return {
    elapsedMs,
    errors: [...validationResult.errors],
    success: validationResult.passed,
    warnings: [...validationResult.warnings]
  } satisfies StepOutcome;
};

const attemptDatabaseShutdown = async (projectPath: string) => {
  if (isPostgresDockerManaged()) {
    return;
  }

  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return;
  }

  try {
    const bunModule = await loadBunModule();
    const processHandle = bunModule.spawn({
      cmd: ['bun', 'db:down'],
      cwd: projectPath,
      stderr: 'ignore',
      stdin: 'ignore',
      stdout: 'ignore'
    });

    await raceWithTimeout(
      processHandle.exited.then(() => processHandle.exitCode ?? 0),
      DATABASE_SHUTDOWN_TIMEOUT_MS,
      () => processHandle.kill()
    );
  } catch {
    // Ignore shutdown issues; cleanup still proceeds
  }
};

const teardownProject = async (projectPath: string) => {
  if (existsSync(projectPath)) {
    await attemptDatabaseShutdown(projectPath);
  }

  cleanupProjectDirectory(projectPath);
};

const scaffoldAndTestPostgresql = async (
  config: TestMatrixEntry
) => {
  const startTime = Date.now();
  const projectName = createProjectName(config);
  const projectPath = projectName;
  const errors: string[] = [];
  const warnings: string[] = [];

  const scaffoldOutcome = await scaffoldProject(
    projectPath,
    buildScaffoldCommand(projectName, config)
  );

  if (!scaffoldOutcome.success) {
    errors.push(...scaffoldOutcome.errors);

    await teardownProject(projectPath);

    return {
      config,
      errors,
      passed: false,
      testTime: Date.now() - startTime,
      warnings
    } satisfies PostgresqlTestResult;
  }

  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    errors.push('package.json not found after scaffolding');

    await teardownProject(projectPath);

    return {
      config,
      errors,
      passed: false,
      testTime: Date.now() - startTime,
      warnings
    } satisfies PostgresqlTestResult;
  }

  const dependencyOutcome = await installDependencies(
    projectPath,
    config,
    packageJsonPath
  );

  if (!dependencyOutcome.success) {
    errors.push(...dependencyOutcome.errors);

    await teardownProject(projectPath);

    return {
      config,
      errors,
      passed: false,
      testTime: Date.now() - startTime,
      warnings
    } satisfies PostgresqlTestResult;
  }

  const functionalOutcome = await runFunctionalSuite(projectPath);
  errors.push(...functionalOutcome.errors);
  warnings.push(...functionalOutcome.warnings);

  const validationOutcome = await validateDatabase(projectPath, config);
  errors.push(...validationOutcome.errors);
  warnings.push(...validationOutcome.warnings);

  await teardownProject(projectPath);

  const passed = validationOutcome.success && functionalOutcome.success && errors.length === 0;

  return {
    config,
    errors,
    passed,
    testTime: Date.now() - startTime,
    warnings
  } satisfies PostgresqlTestResult;
};

const loadMatrix = (matrixEntriesOverride?: TestMatrixEntry[]) => {
  const matrixEntries = matrixEntriesOverride ?? createMatrix();

  return matrixEntries.filter(
    (entry) =>
      entry.databaseEngine === 'postgresql' &&
      entry.directoryConfig === 'default' &&
      !EXCLUDED_HOSTS.has(entry.databaseHost)
  );
};

const runSequentially = async (
  configs: TestMatrixEntry[],
  handler: (config: TestMatrixEntry, index: number) => Promise<PostgresqlTestResult>
) =>
  configs.reduce<Promise<PostgresqlTestResult[]>>(
    (previousPromise, config, index) =>
      previousPromise.then(async (accumulated) => {
        const result = await handler(config, index);

        return [...accumulated, result];
      }),
    Promise.resolve([])
  );

const printSummary = (results: PostgresqlTestResult[]) => {
  const sortedResults = results.map((result) => ({
    config: {
      authProvider: result.config.authProvider,
      codeQualityTool: result.config.codeQualityTool,
      databaseEngine: result.config.databaseEngine,
      databaseHost: result.config.databaseHost,
      directoryConfig: result.config.directoryConfig,
      frontend: result.config.frontend,
      orm: result.config.orm,
      useTailwind: result.config.useTailwind
    },
    errors: [...result.errors],
    passed: result.passed,
    testTime: result.testTime,
    warnings: [...result.warnings]
  }));

  const passedCount = sortedResults.filter((result) => result.passed).length;
  const failedResults = sortedResults.filter((result) => !result.passed);

  console.log('\n=== PostgreSQL Test Summary ===\n');
  console.log(`Total: ${sortedResults.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedResults.length}`);
  console.log(
    `Success Rate: ${(
      (passedCount / Math.max(sortedResults.length, 1)) * HUNDRED_PERCENT
    ).toFixed(1)}%`
  );

  if (failedResults.length === 0) {
    return;
  }

  console.log('\nFailed Configurations:');
  failedResults.forEach((result) => {
    const failureConfig = result.config;
    console.log(
      `\n- PostgreSQL + ${failureConfig.databaseHost} + ${failureConfig.orm} + ${failureConfig.authProvider}`
    );

    result.errors.slice(0, MAX_ERRORS_TO_DISPLAY).forEach((error) => {
      console.log(`  - ${error}`);
    });
  });
};

const parseSubsetFromArgs = (argv: string[]) => {
  const [, , firstArg, secondArg] = argv;
  const hasSecondArg = typeof secondArg !== 'undefined';

  if (hasSecondArg && typeof firstArg !== 'undefined') {
    console.warn('Matrix file arguments are no longer supported; ignoring legacy value.');
  }

  if (hasSecondArg) {
    const parsed = Number.parseInt(secondArg, 10);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }

    console.warn(`Ignoring invalid subset value "${secondArg}".`);

    return undefined;
  }

  if (typeof firstArg === 'undefined') {
    return undefined;
  }

  const parsed = Number.parseInt(firstArg, 10);

  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  console.warn('Matrix file arguments are no longer supported; ignoring legacy value.');

  return undefined;
};

export const runPostgresqlTests = async (
  matrixEntriesOverride?: TestMatrixEntry[],
  testSubset?: number
) => {
  const matrixEntries = loadMatrix(matrixEntriesOverride);
  const configsToTest = typeof testSubset === 'number'
    ? matrixEntries.slice(0, testSubset)
    : matrixEntries;

  console.log(
    `Testing ${configsToTest.length} PostgreSQL configurations (${matrixEntries.length} total in matrix)...\n`
  );

  const results = await runSequentially(configsToTest, async (config, index) => {
    const authLabel = config.authProvider === 'none' ? 'no auth' : 'auth';
    const hostLabel = config.databaseHost === 'none' ? 'local' : config.databaseHost;
    console.log(
      `[${index + 1}/${configsToTest.length}] Testing PostgreSQL + ${config.orm} + ${authLabel} + ${hostLabel}...`
    );

    const outcome = await scaffoldAndTestPostgresql(config);

    if (outcome.passed) {
      console.log(`  ✓ Passed (${outcome.testTime}ms)`);

      return outcome;
    }

    console.log(`  ✗ Failed (${outcome.testTime}ms)`);
    if (outcome.errors.length > 0) {
      console.log(`    Errors: ${outcome.errors.slice(0, 2).join('; ')}`);
    }

    return outcome;
  });

  printSummary(results);

  await stopManagedPostgresDocker();

  const hasFailures = results.some((result) => !result.passed);
  process.exit(hasFailures ? 1 : 0);
};

if (import.meta.main) {
  const parsedSubset = parseSubsetFromArgs(process.argv);

  runPostgresqlTests(undefined, parsedSubset).catch((error) => {
    console.error('PostgreSQL test runner error:', error);
    process.exit(1);
  });
}
