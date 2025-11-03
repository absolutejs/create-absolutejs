/*
  Functional Test Runner
  Orchestrates all functional tests for a scaffolded project.
*/

import { validateServerStartup } from './server-startup-validator';
import { validateBuild } from './build-validator';
import { testDependencyInstallation } from './dependency-installer-tester';
import { checkProjectStructure } from '../check-project-structure.js';

export type FunctionalTestResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  results: {
    structure?: { passed: boolean };
    dependencies?: { passed: boolean; installTime?: number };
    build?: { passed: boolean; compileTime?: number };
    server?: { passed: boolean; compileTime?: number };
  };
  totalTime?: number;
};

export async function runFunctionalTests(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  options: {
    skipDependencies?: boolean;
    skipBuild?: boolean;
    skipServer?: boolean;
  } = {}
): Promise<FunctionalTestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const results: FunctionalTestResult['results'] = {};
  const startTime = Date.now();

  // Test 1: Structure check (always run - fastest)
  try {
    const structureResult = checkProjectStructure(projectPath);
    results.structure = { passed: structureResult.passed };
    if (!structureResult.passed) {
      errors.push(...structureResult.errors);
    }
  } catch (e: any) {
    errors.push(`Structure check failed: ${e.message || e}`);
    results.structure = { passed: false };
  }

  // Test 2: Dependency installation (if not skipped)
  if (!options.skipDependencies) {
    try {
      const depsResult = await testDependencyInstallation(projectPath, packageManager);
      results.dependencies = { 
        passed: depsResult.passed, 
        installTime: depsResult.installTime 
      };
      if (!depsResult.passed) {
        errors.push(...depsResult.errors);
      }
    } catch (e: any) {
      errors.push(`Dependency installation test failed: ${e.message || e}`);
      results.dependencies = { passed: false };
    }
  } else {
    warnings.push('Skipped dependency installation test');
  }

  // Test 3: Build validation (if not skipped)
  if (!options.skipBuild) {
    try {
      const buildResult = await validateBuild(projectPath, packageManager);
      results.build = { 
        passed: buildResult.passed, 
        compileTime: buildResult.compileTime 
      };
      if (!buildResult.passed) {
        errors.push(...buildResult.errors);
      }
    } catch (e: any) {
      errors.push(`Build validation failed: ${e.message || e}`);
      results.build = { passed: false };
    }
  } else {
    warnings.push('Skipped build validation');
  }

  // Test 4: Server startup validation (if not skipped)
  if (!options.skipServer) {
    try {
      const serverResult = await validateServerStartup(projectPath, packageManager);
      results.server = { 
        passed: serverResult.passed, 
        compileTime: serverResult.compileTime 
      };
      if (!serverResult.passed) {
        errors.push(...serverResult.errors);
      }
      if (serverResult.warnings.length > 0) {
        warnings.push(...serverResult.warnings);
      }
    } catch (e: any) {
      errors.push(`Server startup validation failed: ${e.message || e}`);
      results.server = { passed: false };
    }
  } else {
    warnings.push('Skipped server startup validation');
  }

  const totalTime = Date.now() - startTime;
  const passed = errors.length === 0;

  return {
    passed,
    errors,
    warnings,
    results,
    totalTime
  };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';
  const skipDeps = process.argv.includes('--skip-deps');
  const skipBuild = process.argv.includes('--skip-build');
  const skipServer = process.argv.includes('--skip-server');

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/functional-test-runner.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  runFunctionalTests(projectPath, packageManager, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== Functional Test Results ===\n');
      
      if (result.results.structure) {
        console.log(`Structure Check: ${result.results.structure.passed ? '✓' : '✗'}`);
      }
      if (result.results.dependencies) {
        console.log(`Dependencies: ${result.results.dependencies.passed ? '✓' : '✗'}`);
        if (result.results.dependencies.installTime) {
          console.log(`  Install time: ${result.results.dependencies.installTime}ms`);
        }
      }
      if (result.results.build) {
        console.log(`Build: ${result.results.build.passed ? '✓' : '✗'}`);
        if (result.results.build.compileTime) {
          console.log(`  Compile time: ${result.results.build.compileTime}ms`);
        }
      }
      if (result.results.server) {
        console.log(`Server: ${result.results.server.passed ? '✓' : '✗'}`);
        if (result.results.server.compileTime) {
          console.log(`  Compile time: ${result.results.server.compileTime}ms`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
      }

      if (result.totalTime) {
        console.log(`\nTotal time: ${result.totalTime}ms`);
      }

      if (result.passed) {
        console.log('\n✓ All functional tests passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Functional tests failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Functional test runner error:', e);
      process.exit(1);
    });
}

