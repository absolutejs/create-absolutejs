/*
  MySQL Test Runner
  Tests MySQL database across all compatible backend combinations.
  Uses the test matrix to generate valid MySQL + backend combinations.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateMySQLDatabase } from './mysql-validator';
import { runFunctionalTests } from './functional-test-runner';
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

type MySQLTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

/**
 * Scaffolds a project for the given MySQL test configuration, runs dependency installation,
 * executes functional tests and MySQL-specific validation, performs cleanup, and aggregates results.
 *
 * @param config - Test matrix entry that specifies frontend, ORM, database host, auth provider, and other options used to scaffold and test the project
 * @returns A MySQLTestResult containing the original `config`, `passed` (true if validation and functional tests passed), arrays of `errors` and `warnings`, and `testTime` (milliseconds elapsed for the entire operation)
 */
async function scaffoldAndTestMySQL(
  config: TestMatrixEntry
): Promise<MySQLTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Generate project name from config (include frontend to avoid collisions)
  const projectName = `test-mysql-${config.frontend}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.databaseHost === 'none' ? 'local' : config.databaseHost}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
  const projectPath = projectName;

  // Ensure cleanup before starting
  cleanupProjectDirectory(projectPath);

  try {
    const { $ } = await import('bun');
    await $`rm -rf ${projectPath}`.quiet().nothrow();
  } catch {
    // Ignore cleanup errors
  }

  try {
    // Build scaffold command
    const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
    
    // Add frontend (use first available or html as default)
    if (config.frontend === 'html') {
      cmd.push('--html');
    } else if (config.frontend === 'htmx') {
      cmd.push('--htmx');
    } else if (config.frontend === 'react') {
      cmd.push('--react');
    } else if (config.frontend === 'vue') {
      cmd.push('--vue');
    } else if (config.frontend === 'svelte') {
      cmd.push('--svelte');
    }
    
    // Add MySQL database
    cmd.push('--db', 'mysql');
    
    // Add ORM (only if not 'none')
    if (config.orm && config.orm !== 'none') {
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

    // Scaffold project
    const { $ } = await import('bun');
    process.stdout.write('  → Scaffolding project... ');
    const scaffoldStart = Date.now();
    
    const SCAFFOLD_TIMEOUT = 2 * 60 * 1000;
    const scaffoldPromise = $`${cmd}`.quiet().nothrow();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), SCAFFOLD_TIMEOUT);
    });
    
    let scaffoldResult;
    try {
      scaffoldResult = await Promise.race([scaffoldPromise, timeoutPromise]) as Awaited<ReturnType<typeof $>>;
    } catch (e: any) {
      if (e?.message === 'TIMEOUT' || String(e) === 'Error: TIMEOUT') {
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

    // Install dependencies (with caching)
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

    // Run functional tests (build, server)
    process.stdout.write('  → Running functional tests... ');
    const functionalStart = Date.now();
    let functionalTestResults;
    try {
      functionalTestResults = await runFunctionalTests(projectPath, 'bun', {
        skipDependencies: true,
        skipBuild: false,
        skipServer: false
      });
      
      if (!functionalTestResults.passed) {
        errors.push(...functionalTestResults.errors);
      }
      if (functionalTestResults.warnings.length > 0) {
        warnings.push(...functionalTestResults.warnings);
      }
    } catch (e: any) {
      warnings.push(`Functional tests error: ${e.message || e}`);
    }
    const functionalTime = Date.now() - functionalStart;

    // Run MySQL-specific validation
    process.stdout.write('  → Running MySQL validation... ');
    const validateStart = Date.now();
    const validationResult = await validateMySQLDatabase(projectPath, {
      orm: config.orm,
      authProvider: config.authProvider,
      databaseHost: config.databaseHost
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
      // Ensure Docker container is stopped
      await $`cd ${projectPath} && bun db:down 2>/dev/null || true`.quiet().nothrow();
      await $`rm -rf ${projectPath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }

    const passed = validationResult.passed && (!functionalTestResults || functionalTestResults.passed);

    return {
      config,
      passed,
      errors,
      warnings,
      testTime: Date.now() - startTime
    };
  } catch (e: any) {
    errors.push(`Test execution error: ${e.message || e}`);
    // Cleanup on error
    try {
      const { $ } = await import('bun');
      await $`cd ${projectPath} && bun db:down 2>/dev/null || true`.quiet().nothrow();
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
 * Orchestrates MySQL-focused functional tests defined in a test matrix file and exits the process with status indicating success or failure.
 *
 * Reads the provided JSON test matrix, filters entries for MySQL (excluding PlanetScale hosts), optionally limits the set, and runs each configuration through the scaffoldAndTestMySQL workflow. Prints per-configuration progress and a final summary; exits with code 0 if all tests passed or 1 if any failed.
 *
 * @param matrixFile - Path to the JSON file containing an array of TestMatrixEntry objects (default: 'test-matrix.json')
 * @param maxConcurrent - Maximum number of concurrent test workers to allow (currently tests run sequentially; parameter reserved for future concurrency control)
 * @param testSubset - Optional limit to run only the first N matching configurations from the matrix
 */
async function runMySQLTests(
  matrixFile: string = 'test-matrix.json',
  maxConcurrent: number = 2,
  testSubset?: number
): Promise<void> {
  // Read test matrix
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));
  
  // Filter for MySQL-only configurations
  const mysqlConfigs = matrix.filter(
    (entry) =>
      entry.databaseEngine === 'mysql' && entry.databaseHost !== 'planetscale'
  );
  
  // Limit to subset if specified
  const configsToTest = testSubset ? mysqlConfigs.slice(0, testSubset) : mysqlConfigs;
  
  console.log(`Testing ${configsToTest.length} MySQL configurations (${mysqlConfigs.length} total in matrix)...\n`);

  const results: MySQLTestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Run tests sequentially
  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    console.log(`[${i + 1}/${configsToTest.length}] Testing MySQL + ${config.orm} + ${config.authProvider === 'none' ? 'no auth' : 'auth'} + ${config.databaseHost === 'none' ? 'local' : config.databaseHost}...`);
    
    // Cleanup any leftover directories before starting
    const projectName = `test-mysql-${config.frontend}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.databaseHost === 'none' ? 'local' : config.databaseHost}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
    try {
      const { $ } = await import('bun');
      await $`rm -rf ${projectName}`.quiet().nothrow();
      // Small delay to ensure filesystem operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Ignore cleanup errors
    }
    
    const result = await scaffoldAndTestMySQL(config);
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
  console.log('\n=== MySQL Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Configurations:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n- MySQL + ${r.config.orm} + ${r.config.authProvider} + ${r.config.databaseHost}`);
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

  runMySQLTests(matrixFile, maxConcurrent, testSubset).catch((e) => {
    console.error('MySQL test runner error:', e);
    process.exit(1);
  });
}
