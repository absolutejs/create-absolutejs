/*
  React Test Runner
  Tests React framework across all compatible backend combinations.
  Uses the test matrix to generate valid React + backend combinations.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateReactFramework } from './react-validator';
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

type ReactTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

const SUPPORTED_DATABASE_ENGINES = new Set(['none', 'sqlite', 'mongodb']);
const SUPPORTED_ORMS = new Set(['none', 'drizzle']);

/**
 * Scaffolds a React test project for the given configuration, installs dependencies (with caching), runs framework validation, cleans up the project directory, and returns the test outcome.
 *
 * @param config - Test matrix entry describing the test configuration (frontend, databaseEngine, orm, databaseHost, authProvider, optional codeQualityTool, useTailwind, and directoryConfig)
 * @returns `ReactTestResult` containing the original `config`, a `passed` boolean, collected `errors` and `warnings`, and `testTime` in milliseconds
 */
async function scaffoldAndTestReact(
  config: TestMatrixEntry
): Promise<ReactTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Generate project name from config
  const projectName = `test-react-${config.databaseEngine}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
  const projectPath = projectName; // Project is created in current directory

  // Ensure no leftover directory from previous runs
  cleanupProjectDirectory(projectPath);

  try {
    // Build scaffold command (without --install for now, we'll install separately)
    const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
    
    // Add React flag
    cmd.push('--react');
    
    // Add database
    if (config.databaseEngine !== 'none') {
      cmd.push('--db', config.databaseEngine);
    }
    
    // Add ORM
    if (config.orm !== 'none') {
      cmd.push('--orm', config.orm);
    }
    
    // Add database host
    if (config.databaseHost !== 'none') {
      cmd.push('--db-host', config.databaseHost);
    }
    
    // Add auth
    if (config.authProvider !== 'none') {
      cmd.push('--auth', config.authProvider);
    }
    
    // Add code quality tool
    if (config.codeQualityTool) {
      if (config.codeQualityTool === 'eslint+prettier') {
        cmd.push('--eslint+prettier');
      }
    }
    
    // Add Tailwind
    if (config.useTailwind) {
      cmd.push('--tailwind');
    }
    
    // Add directory config
    if (config.directoryConfig === 'custom') {
      cmd.push('--directory', 'custom');
    }

    // Scaffold project (run from parent directory)
    const { $ } = await import('bun');
    process.stdout.write('  → Scaffolding project... ');
    const scaffoldStart = Date.now();
    
    // Add timeout for scaffold (2 minutes max)
    const SCAFFOLD_TIMEOUT = 2 * 60 * 1000;
    const scaffoldPromise = $`${cmd}`.quiet().nothrow();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), SCAFFOLD_TIMEOUT);
    });
    
    let scaffoldResult;
    try {
      scaffoldResult = await Promise.race([scaffoldPromise, timeoutPromise]) as Awaited<ReturnType<typeof $>>;
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        console.log(`✗ (TIMEOUT after ${SCAFFOLD_TIMEOUT / 1000}s)`);
        errors.push(`Scaffold timed out after ${SCAFFOLD_TIMEOUT / 1000} seconds`);
        return {
          config,
          passed: false,
          errors,
          warnings,
          testTime: Date.now() - startTime
        };
      }
      throw e;
    }
    
    const scaffoldTime = Date.now() - scaffoldStart;
    
    if (scaffoldResult.exitCode !== 0) {
      console.log(`✗ (${scaffoldTime}ms)`);
      errors.push(`Scaffold failed with exit code ${scaffoldResult.exitCode}`);
      if (scaffoldResult.stderr) {
        const stderrStr = scaffoldResult.stderr.toString();
        errors.push(`Scaffold errors: ${stderrStr.slice(0, 200)}`);
      }
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
    }
    console.log(`✓ (${scaffoldTime}ms)`);

    // Install dependencies (with caching to speed up repeated tests)
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      errors.push('package.json not found after scaffolding');
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
    } catch (e: any) {
      console.log(`✗ (${e.message})`);
      errors.push(`Dependency installation failed: ${e.message}`);
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
    }

    // Run React validation (skip dependency test since we just installed)
    process.stdout.write('  → Running validation tests... ');
    const validateStart = Date.now();
    const validationResult = await validateReactFramework(projectPath, 'bun', {
      databaseEngine: config.databaseEngine,
      orm: config.orm,
      authProvider: config.authProvider,
      useTailwind: config.useTailwind,
      codeQualityTool: config.codeQualityTool
    }, {
      skipDependencies: true, // Skip dependency installation test since we just installed
      skipBuild: false,
      skipServer: false
    });
    const validateTime = Date.now() - validateStart;
    console.log(validationResult.passed ? `✓ (${validateTime}ms)` : `✗ (${validateTime}ms)`);

    if (!validationResult.passed) {
      errors.push(...validationResult.errors);
    }
    if (validationResult.warnings.length > 0) {
      warnings.push(...validationResult.warnings);
    }

    // Cleanup
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
  } catch (e: any) {
    errors.push(`Test execution error: ${e.message || e}`);
    // Cleanup on error
    try {
      const { $ } = await import('bun');
      await $`rm -rf ${projectPath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }
    return {
      config,
      passed: false,
      errors,
      warnings,
      testTime: Date.now() - startTime
    };
  }
}

/**
 * Runs React tests described in a test matrix file, executes each matching configuration, and prints a summary.
 *
 * Reads and parses the specified test matrix, filters entries for React with supported database engines and ORMs,
 * optionally limits the number of configurations tested, and runs each configuration through the scaffold-and-test workflow.
 * Prints per-configuration progress and a final summary of totals, pass/fail counts, and success rate.
 *
 * @param matrixFile - Path to the JSON test matrix file (default: "test-matrix.json")
 * @param maxConcurrent - Maximum number of concurrent tests to run (currently tests run sequentially; defaults to 2)
 * @param testSubset - Optional limit to the first N matching configurations to test
 *
 * Note: This function exits the process with code 0 if all tests pass or 1 if any test fails.
async function runReactTests(
  matrixFile: string = 'test-matrix.json',
  maxConcurrent: number = 2,
  testSubset?: number
): Promise<void> {
  // Read test matrix
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));
  
  const reactConfigs = matrix.filter(
    (entry) =>
      entry.frontend === 'react' &&
      SUPPORTED_DATABASE_ENGINES.has(entry.databaseEngine) &&
      SUPPORTED_ORMS.has(entry.orm)
  );
  
  // Limit to subset if specified
  const configsToTest = testSubset ? reactConfigs.slice(0, testSubset) : reactConfigs;
  
  console.log(`Testing ${configsToTest.length} React configurations (${reactConfigs.length} total in matrix)...\n`);

  const results: ReactTestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Run tests sequentially for now (can be parallelized later)
  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    console.log(`[${i + 1}/${configsToTest.length}] Testing React + ${config.databaseEngine} + ${config.orm} + ${config.authProvider === 'none' ? 'no auth' : 'auth'}...`);
    
    const result = await scaffoldAndTestReact(config);
    results.push(result);
    
    if (result.passed) {
      passed++;
      console.log(`  ✓ Passed (${result.testTime}ms)`);
    } else {
      failed++;
      console.log(`  ✗ Failed (${result.testTime}ms)`);
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.slice(0, 2).join('; ')}`);
      }
    }
  }

  // Summary
  console.log('\n=== React Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Configurations:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n- React + ${r.config.databaseEngine} + ${r.config.orm} + ${r.config.authProvider}`);
        r.errors.slice(0, 3).forEach((error) => console.log(`  - ${error}`));
      });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// CLI usage
if (require.main === module) {
  const matrixFile = process.argv[2] || 'test-matrix.json';
  const maxConcurrent = parseInt(process.argv[3] || '2', 10);
  const testSubset = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;

  runReactTests(matrixFile, maxConcurrent, testSubset).catch((e) => {
    console.error('React test runner error:', e);
    process.exit(1);
  });
}
