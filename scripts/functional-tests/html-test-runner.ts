/*
  HTML Test Runner
  Tests HTML framework across all compatible backend combinations.
  Uses the test matrix to generate valid HTML + backend combinations.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateHTMLFramework } from './html-validator';
import { hasCachedDependencies, getOrInstallDependencies } from './dependency-cache';
import { cleanupProjectDirectory } from './test-utils';
import { spawn } from 'child_process';

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

type HTMLTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

const SUPPORTED_DATABASE_ENGINES = new Set(['none', 'sqlite', 'mongodb']);
const SUPPORTED_ORMS = new Set(['none', 'drizzle']);

/**
 * Scaffolds an HTML project for the given test configuration, runs dependency installation and framework validation, and returns the aggregated test result.
 *
 * Attempts to scaffold a project using Bun with flags derived from `config`, installs dependencies (using a cache when available), runs HTML framework validation with dependency checks skipped, cleans up the scaffolded project, and collects any errors and warnings encountered during the process.
 *
 * @param config - TestMatrixEntry describing the test configuration (frontend, databaseEngine, orm, databaseHost, authProvider, optional codeQualityTool, useTailwind, and directoryConfig) used to determine scaffold flags and validation options
 * @returns An HTMLTestResult containing the original `config`, `passed` indicating validation success, `errors` and `warnings` arrays with any messages collected, and `testTime` as the total elapsed time in milliseconds for the test run
 */
async function scaffoldAndTestHTML(
  config: TestMatrixEntry
): Promise<HTMLTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Generate project name from config
  const projectName = `test-html-${config.databaseEngine}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
  const projectPath = projectName; // Project is created in current directory

  cleanupProjectDirectory(projectPath);

  const { $ } = await import('bun');

  try {
    // Build scaffold command (without --install for now, we'll install separately)
    const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
    
    // Add HTML flag
    cmd.push('--html');
    
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

    // Note: HTML scripting is not included in test matrix, so we won't add --html-scripts
    // This means useHTMLScripts will default to false when --skip is used

    // Scaffold project (run from parent directory)
    process.stdout.write('  → Scaffolding project... ');
    const scaffoldStart = Date.now();
    
    // Add timeout for scaffold (2 minutes max)
    const SCAFFOLD_TIMEOUT = 2 * 60 * 1000;
    const scaffoldResult = await new Promise<{
      exitCode: number;
      stdout: string;
      stderr: string;
    }>((resolve, reject) => {
      const child = spawn(cmd[0], cmd.slice(1), {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('TIMEOUT'));
      }, SCAFFOLD_TIMEOUT);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
        });
      });
    }).catch((e: any) => {
      if (e?.message === 'TIMEOUT' || String(e) === 'Error: TIMEOUT') {
        console.log(`✗ (TIMEOUT after ${SCAFFOLD_TIMEOUT / 1000}s)`);
        errors.push(`Scaffold timed out after ${SCAFFOLD_TIMEOUT / 1000} seconds`);
        return null;
      }
      throw e;
    });

    if (!scaffoldResult) {
      return {
        config,
        passed: false,
        errors,
        warnings,
        testTime: Date.now() - startTime
      };
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

    // Run HTML validation (skip dependency test since we just installed)
    process.stdout.write('  → Running validation tests... ');
    const validateStart = Date.now();
    const validationResult = await validateHTMLFramework(projectPath, 'bun', {
      databaseEngine: config.databaseEngine,
      orm: config.orm,
      authProvider: config.authProvider,
      useTailwind: config.useTailwind,
      codeQualityTool: config.codeQualityTool,
      useHTMLScripts: false // Default when --skip is used
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
 * Runs HTML framework validation for configurations from a test matrix file and exits with status 0 on success or 1 on any failure.
 *
 * Reads and parses `matrixFile`, filters entries for the HTML frontend and supported database/ORM combinations, optionally limits execution to the first `testSubset` entries, and runs each configuration sequentially via `scaffoldAndTestHTML`. Prints per-run progress and a final summary; the process exits with code 0 if all tests passed or 1 if any failed.
 *
 * @param matrixFile - Path to the JSON test matrix (defaults to 'test-matrix.json')
 * @param maxConcurrent - Maximum concurrent tests (currently unused; tests run sequentially)
 * @param testSubset - If provided, limit execution to the first N matching configurations
 */
async function runHTMLTests(
  matrixFile: string = 'test-matrix.json',
  maxConcurrent: number = 2,
  testSubset?: number
): Promise<void> {
  // Read test matrix
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));
  
  const htmlConfigs = matrix.filter(
    (entry) =>
      entry.frontend === 'html' &&
      SUPPORTED_DATABASE_ENGINES.has(entry.databaseEngine) &&
      SUPPORTED_ORMS.has(entry.orm)
  );
  
  // Limit to subset if specified
  const configsToTest = testSubset ? htmlConfigs.slice(0, testSubset) : htmlConfigs;
  
  console.log(`Testing ${configsToTest.length} HTML configurations (${htmlConfigs.length} total in matrix)...\n`);

  const results: HTMLTestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Run tests sequentially for now (can be parallelized later)
  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    console.log(`[${i + 1}/${configsToTest.length}] Testing HTML + ${config.databaseEngine} + ${config.orm} + ${config.authProvider === 'none' ? 'no auth' : 'auth'}...`);
    
    const result = await scaffoldAndTestHTML(config);
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
  console.log('\n=== HTML Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Configurations:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n- HTML + ${r.config.databaseEngine} + ${r.config.orm} + ${r.config.authProvider}`);
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

  runHTMLTests(matrixFile, maxConcurrent, testSubset).catch((e) => {
    console.error('HTML test runner error:', e);
    process.exit(1);
  });
}
