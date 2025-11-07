/*
  Auth Test Runner
  Validates auth-enabled configurations across supported database/front-end combinations.
  Uses the test matrix to generate valid entries, filters to supported database engines.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { validateAuthConfiguration } from './auth-validator';
import { hasCachedDependencies, getOrInstallDependencies } from './dependency-cache';
import { cleanupProjectDirectory } from './test-utils';

type TestMatrixEntry = {
  frontend: string;
  databaseEngine: string;
  orm: string;
  databaseHost: string;
  authProvider: string;
  codeQualityTool?: string;
  useTailwind: boolean;
  directoryConfig: string;
};

type AuthTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

const SUPPORTED_DATABASE_ENGINES = new Set(['sqlite', 'mongodb']);

function buildProjectName(config: TestMatrixEntry): string {
  const hostLabel = config.databaseHost === 'none' ? 'local' : config.databaseHost;
  const tailwindLabel = config.useTailwind ? 'tw' : 'notw';

  return `test-auth-${config.frontend}-${config.databaseEngine}-${config.orm}-${hostLabel}-${tailwindLabel}`
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-');
}

function buildScaffoldCommand(
  projectName: string,
  config: TestMatrixEntry
): string[] {
  const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];

  // Frontend flag
  if (config.frontend && config.frontend !== 'none') {
    cmd.push(`--${config.frontend}`);
  }

  // Database engine
  if (config.databaseEngine && config.databaseEngine !== 'none') {
    cmd.push('--db', config.databaseEngine);
  }

  // ORM
  if (config.orm && config.orm !== 'none') {
    cmd.push('--orm', config.orm);
  }

  // Database host
  if (config.databaseHost && config.databaseHost !== 'none') {
    cmd.push('--db-host', config.databaseHost);
  }

  // Auth provider (always present for auth configs)
  if (config.authProvider && config.authProvider !== 'none') {
    cmd.push('--auth', config.authProvider);
  }

  // Code quality tool
  if (config.codeQualityTool === 'eslint+prettier') {
    cmd.push('--eslint+prettier');
  }

  // Tailwind
  if (config.useTailwind) {
    cmd.push('--tailwind');
  }

  // Directory configuration
  if (config.directoryConfig === 'custom') {
    cmd.push('--directory', 'custom');
  }

  return cmd;
}

async function scaffoldAndTestAuth(
  config: TestMatrixEntry
): Promise<AuthTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  const projectName = buildProjectName(config);
  const projectPath = projectName;

  cleanupProjectDirectory(projectPath);

  try {
    const cmd = buildScaffoldCommand(projectName, config);

    process.stdout.write('  → Scaffolding project... ');
    const scaffoldStart = Date.now();

    const SCAFFOLD_TIMEOUT = 2 * 60 * 1000;
    const scaffoldPromise = $`${cmd}`.quiet().nothrow();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), SCAFFOLD_TIMEOUT)
    );

    let scaffoldResult;
    try {
      scaffoldResult = (await Promise.race([
        scaffoldPromise,
        timeoutPromise
      ])) as Awaited<ReturnType<typeof $>>;
    } catch (error) {
      if ((error as Error).message === 'TIMEOUT') {
        console.log(`✗ (TIMEOUT after ${SCAFFOLD_TIMEOUT / 1000}s)`);
        errors.push(`Scaffold timed out after ${SCAFFOLD_TIMEOUT / 1000} seconds`);
        cleanupProjectDirectory(projectPath);
        return {
          config,
          passed: false,
          errors,
          warnings,
          testTime: Date.now() - startTime
        };
      }
      throw error;
    }

    const scaffoldTime = Date.now() - scaffoldStart;
    if (scaffoldResult.exitCode !== 0) {
      console.log(`✗ (${scaffoldTime}ms)`);
      errors.push(`Scaffold failed with exit code ${scaffoldResult.exitCode}`);
      if (scaffoldResult.stderr) {
        const stderrStr = scaffoldResult.stderr.toString();
        errors.push(`Scaffold errors: ${stderrStr.slice(0, 200)}`);
      }
      cleanupProjectDirectory(projectPath);
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
    }
    console.log(`✓ (${scaffoldTime}ms)`);

    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      errors.push('package.json not found after scaffolding');
      cleanupProjectDirectory(projectPath);
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
    }

    process.stdout.write('  → Installing dependencies... ');
    const hasCache = hasCachedDependencies({
      frontend: config.frontend,
      databaseEngine: config.databaseEngine,
      orm: config.orm,
      databaseHost: config.databaseHost,
      authProvider: config.authProvider,
      useTailwind: config.useTailwind,
      codeQualityTool: config.codeQualityTool
    });

    try {
      const { cached, installTime } = await getOrInstallDependencies(
        projectPath,
        {
          frontend: config.frontend,
          databaseEngine: config.databaseEngine,
          orm: config.orm,
          databaseHost: config.databaseHost,
          authProvider: config.authProvider,
          useTailwind: config.useTailwind,
          codeQualityTool: config.codeQualityTool
        },
        packageJsonPath
      );

      if (cached) {
        console.log(`✓ (cached, ${installTime}ms)`);
      } else {
        console.log(`✓ (${installTime}ms)`);
      }
    } catch (error) {
      console.log(`✗ (${(error as Error).message})`);
      errors.push(`Dependency installation failed: ${(error as Error).message}`);
      cleanupProjectDirectory(projectPath);
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
    }

    process.stdout.write('  → Running auth validation... ');
    const validateStart = Date.now();
    const validationResult = await validateAuthConfiguration(
      projectPath,
      'bun',
      {
        databaseEngine: config.databaseEngine,
        orm: config.orm,
        authProvider: config.authProvider
      },
      {
        skipDependencies: true,
        skipBuild: false,
        skipServer: false
      }
    );
    const validateTime = Date.now() - validateStart;
    console.log(validationResult.passed ? `✓ (${validateTime}ms)` : `✗ (${validateTime}ms)`);

    if (!validationResult.passed) {
      errors.push(...validationResult.errors);
    }
    if (validationResult.warnings.length > 0) {
      warnings.push(...validationResult.warnings);
    }

    try {
      await $`rm -rf ${projectPath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }

    return {
      config,
      passed: validationResult.passed,
      errors,
      warnings,
      testTime: Date.now() - startTime
    };
  } catch (error) {
    errors.push(`Test execution error: ${(error as Error).message}`);
    cleanupProjectDirectory(projectPath);
    return {
      config,
      passed: false,
      errors,
      warnings,
      testTime: Date.now() - startTime
    };
  }
}

async function runAuthTests(
  matrixFile: string = 'test-matrix.json',
  testSubset?: number
): Promise<void> {
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));

  const authConfigs = matrix.filter(
    (entry) =>
      entry.authProvider !== 'none' &&
      SUPPORTED_DATABASE_ENGINES.has(entry.databaseEngine)
  );

  const configsToTest = testSubset ? authConfigs.slice(0, testSubset) : authConfigs;

  console.log(`Testing ${configsToTest.length} auth configurations (${authConfigs.length} total auth-enabled entries)...\n`);

  const results: AuthTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    console.log(
      `[${i + 1}/${configsToTest.length}] Testing ${config.frontend} + ${config.databaseEngine} + ${config.orm} + ${config.authProvider} + ${config.databaseHost}...`
    );

    const result = await scaffoldAndTestAuth(config);
    results.push(result);

    if (result.passed) {
      passedCount++;
      console.log(`  ✓ Passed (${result.testTime}ms)`);
    } else {
      failedCount++;
      console.log(`  ✗ Failed (${result.testTime}ms)`);
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.slice(0, 3).join('; ')}`);
      }
    }
  }

  console.log('\n=== Auth Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Success Rate: ${results.length > 0 ? ((passedCount / results.length) * 100).toFixed(1) : '0.0'}%`);

  if (failedCount > 0) {
    console.log('\nFailed Configurations:\n');
    results
      .filter((result) => !result.passed)
      .forEach((result) => {
        console.log(
          `- ${result.config.frontend} + ${result.config.databaseEngine} + ${result.config.orm} + ${result.config.authProvider} + ${result.config.databaseHost}`
        );
        result.errors.slice(0, 5).forEach((error) => console.log(`  - ${error}`));
        console.log('');
      });
    process.exit(1);
  } else {
    console.log('\n✓ All auth configurations passed validation!');
    process.exit(0);
  }
}

if (require.main === module) {
  const matrixFile = process.argv[2] || 'test-matrix.json';
  const subsetArg = process.argv[3];
  const subset = subsetArg ? parseInt(subsetArg, 10) : undefined;

  runAuthTests(matrixFile, subset).catch((error) => {
    console.error('Auth test runner error:', error);
    process.exit(1);
  });
}


