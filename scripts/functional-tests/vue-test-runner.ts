/*
  Vue Test Runner
  Tests Vue framework across all compatible backend combinations.
  Uses the test matrix to generate valid Vue + backend combinations.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateVueFramework } from './vue-validator';
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

type VueTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

const SUPPORTED_DATABASE_ENGINES = new Set(['none', 'sqlite', 'mongodb']);
const SUPPORTED_ORMS = new Set(['none', 'drizzle']);

async function scaffoldAndTestVue(
  config: TestMatrixEntry
): Promise<VueTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Generate project name from config
  const projectName = `test-vue-${config.databaseEngine}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
  const projectPath = projectName; // Project is created in current directory

  cleanupProjectDirectory(projectPath);

  try {
    // Build scaffold command (without --install for now, we'll install separately)
    const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
    
    // Add Vue flag
    cmd.push('--vue');
    
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

    // Run Vue validation (skip dependency test since we just installed)
    process.stdout.write('  → Running validation tests... ');
    const validateStart = Date.now();
    const validationResult = await validateVueFramework(projectPath, 'bun', {
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

async function runVueTests(
  matrixFile: string = 'test-matrix.json',
  maxConcurrent: number = 2,
  testSubset?: number
): Promise<void> {
  // Read test matrix
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));
  
  const vueConfigs = matrix.filter(
    (entry) =>
      entry.frontend === 'vue' &&
      SUPPORTED_DATABASE_ENGINES.has(entry.databaseEngine) &&
      SUPPORTED_ORMS.has(entry.orm)
  );
  
  // Limit to subset if specified
  const configsToTest = testSubset ? vueConfigs.slice(0, testSubset) : vueConfigs;
  
  console.log(`Testing ${configsToTest.length} Vue configurations (${vueConfigs.length} total in matrix)...\n`);

  const results: VueTestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Run tests sequentially for now (can be parallelized later)
  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    console.log(`[${i + 1}/${configsToTest.length}] Testing Vue + ${config.databaseEngine} + ${config.orm} + ${config.authProvider === 'none' ? 'no auth' : 'auth'}...`);
    
    const result = await scaffoldAndTestVue(config);
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
  console.log('\n=== Vue Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Configurations:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n- Vue + ${r.config.databaseEngine} + ${r.config.orm} + ${r.config.authProvider}`);
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

  runVueTests(matrixFile, maxConcurrent, testSubset).catch((e) => {
    console.error('Vue test runner error:', e);
    process.exit(1);
  });
}

