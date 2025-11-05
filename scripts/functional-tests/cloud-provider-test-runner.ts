/*
  Cloud Provider Test Runner
  Tests cloud database provider configurations across all compatible backend combinations.
  Uses the test matrix to generate valid cloud provider + backend combinations.
*/

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateCloudProvider } from './cloud-provider-validator';
import { hasCachedDependencies, getOrInstallDependencies } from './dependency-cache';

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

type CloudProviderTestResult = {
  config: TestMatrixEntry;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testTime?: number;
};

async function scaffoldAndTestCloudProvider(
  config: TestMatrixEntry
): Promise<CloudProviderTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Generate project name from config
  const projectName = `test-cloud-${config.databaseHost}-${config.databaseEngine}-${config.orm}-${config.frontend}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
  const projectPath = projectName;

  // Ensure cleanup before starting
  try {
    const { $ } = await import('bun');
    await $`rm -rf ${projectPath}`.quiet().nothrow();
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch {
    // Ignore cleanup errors
  }

  try {
    // Build scaffold command
    const cmd = ['bun', 'run', 'src/index.ts', projectName, '--skip'];
    
    // Add frontend
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
    
    // Add database engine
    cmd.push('--db', config.databaseEngine);
    
    // Add ORM (only if not 'none')
    if (config.orm && config.orm !== 'none') {
      cmd.push('--orm', config.orm);
    }
    
    // Add database host (cloud provider)
    cmd.push('--db-host', config.databaseHost);
    
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

    process.stdout.write('  → Running cloud provider validation... ');
    const validateStart = Date.now();
    const validationResult = await validateCloudProvider(projectPath, 'bun', {
      databaseEngine: config.databaseEngine,
      databaseHost: config.databaseHost,
      orm: config.orm,
      authProvider: config.authProvider,
    }, {
      skipDependencies: true,
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

    try {
      await $`rm -rf ${projectPath}`.quiet();
    } catch {
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
    try {
      const { $ } = await import('bun');
      await $`rm -rf ${projectPath}`.quiet();
    } catch {
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

async function runCloudProviderTests(
  matrixFile: string = 'test-matrix.json',
  testSubset?: number
): Promise<void> {
  // Read test matrix
  const matrix: TestMatrixEntry[] = JSON.parse(readFileSync(matrixFile, 'utf-8'));
  
  // Filter for cloud provider configurations only
  const cloudConfigs = matrix.filter(
    (entry) => entry.databaseHost === 'neon' || entry.databaseHost === 'planetscale' || entry.databaseHost === 'turso'
  );
  
  // Limit to subset if specified
  const configsToTest = testSubset ? cloudConfigs.slice(0, testSubset) : cloudConfigs;
  
  console.log(`Testing ${configsToTest.length} cloud provider configurations (${cloudConfigs.length} total in matrix)...\n`);

  const results: CloudProviderTestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Run tests sequentially
  for (let i = 0; i < configsToTest.length; i++) {
    const config = configsToTest[i];
    const providerName = config.databaseHost === 'neon' ? 'Neon' : config.databaseHost === 'planetscale' ? 'PlanetScale' : 'Turso';
    console.log(`[${i + 1}/${configsToTest.length}] Testing ${providerName} + ${config.databaseEngine} + ${config.orm} + ${config.authProvider === 'none' ? 'no auth' : 'auth'}...`);
    
    // Cleanup any leftover directories before starting
    const projectName = `test-cloud-${config.databaseHost}-${config.databaseEngine}-${config.orm}-${config.frontend}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${config.useTailwind ? 'tw' : 'notw'}`.replace(/[^a-z0-9-]/g, '-');
    try {
      const { $ } = await import('bun');
      await $`rm -rf ${projectName}`.quiet().nothrow();
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Ignore cleanup errors
    }
    
    const result = await scaffoldAndTestCloudProvider(config);
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
  console.log('\n=== Cloud Provider Test Summary ===\n');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Group results by provider
  const byProvider: Record<string, { total: number; passed: number; failed: number }> = {};
  results.forEach(r => {
    const provider = r.config.databaseHost;
    if (!byProvider[provider]) {
      byProvider[provider] = { total: 0, passed: 0, failed: 0 };
    }
    byProvider[provider].total++;
    if (r.passed) {
      byProvider[provider].passed++;
    } else {
      byProvider[provider].failed++;
    }
  });

  console.log('\nBy Provider:');
  Object.entries(byProvider).forEach(([provider, stats]) => {
    const providerName = provider === 'neon' ? 'Neon' : provider === 'planetscale' ? 'PlanetScale' : 'Turso';
    console.log(`  ${providerName}: ${stats.passed}/${stats.total} passed (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
  });

  if (failed > 0) {
    console.log('\nFailed Configurations:\n');
    results.filter(r => !r.passed).forEach(r => {
      const providerName = r.config.databaseHost === 'neon' ? 'Neon' : r.config.databaseHost === 'planetscale' ? 'PlanetScale' : 'Turso';
      console.log(`- ${providerName} + ${r.config.databaseEngine} + ${r.config.orm} + ${r.config.authProvider === 'none' ? 'none' : r.config.authProvider}`);
      r.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('\n✓ All cloud provider configurations passed validation!');
    process.exit(0);
  }
}

// CLI usage
if (require.main === module) {
  runCloudProviderTests().catch(console.error);
}

