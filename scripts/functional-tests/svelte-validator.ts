/*
  Svelte Framework Validator
  Validates Svelte-specific functionality across all backend combinations.
  Tests Svelte rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type SvelteValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  svelteSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

export async function validateSvelteFramework(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  config: {
    databaseEngine?: string;
    orm?: string;
    authProvider?: string;
    useTailwind?: boolean;
    codeQualityTool?: string;
    isMultiFrontend?: boolean;
  } = {},
  options: {
    skipDependencies?: boolean;
    skipBuild?: boolean;
    skipServer?: boolean;
  } = {}
): Promise<SvelteValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const svelteSpecific: SvelteValidationResult['svelteSpecific'] = {
    filesExist: false,
    routesConfigured: false,
    importsCorrect: false
  };

  // Check 1: Svelte-specific files exist
  // Find Svelte directory (could be in src/frontend or src/frontend/svelte)
  let svelteDirectory = join(projectPath, 'src', 'frontend');
  const possibleSvelteDirs = [
    join(projectPath, 'src', 'frontend', 'svelte'),
    join(projectPath, 'src', 'frontend')
  ];

  // Find which directory contains Svelte files
  let foundSvelteDir: string | undefined;
  for (const dir of possibleSvelteDirs) {
    if (existsSync(join(dir, 'pages', 'SvelteExample.svelte'))) {
      foundSvelteDir = dir;
      break;
    }
  }

  if (!foundSvelteDir) {
    errors.push('Svelte directory not found - checked src/frontend and src/frontend/svelte');
  } else {
    svelteDirectory = foundSvelteDir;
  }

  const svelteComponentsPath = join(svelteDirectory, 'components');
  const sveltePagesPath = join(svelteDirectory, 'pages');
  const svelteComposablesPath = join(svelteDirectory, 'composables');
  const svelteStylesPath = join(svelteDirectory, 'styles');
  const svelteAssetsPath = join(projectPath, 'src', 'backend', 'assets', 'svg', 'svelte-logo.svg');

  const requiredFiles = [
    join(svelteComponentsPath, 'Counter.svelte'),
    join(sveltePagesPath, 'SvelteExample.svelte'),
    join(svelteComposablesPath, 'counter.svelte.ts'),
    join(svelteStylesPath, 'svelte-example.css'),
    svelteAssetsPath
  ];

  const missingFiles = requiredFiles.filter((file) => !existsSync(file));

  if (missingFiles.length > 0) {
    errors.push(`Missing Svelte files: ${missingFiles.join(', ')}`);
  } else {
    svelteSpecific.filesExist = true;
  }

  // Check 2: Server.ts has Svelte routes configured
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    try {
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for Svelte imports
      if (serverContent.includes('SvelteExample') || serverContent.includes('handleSveltePageRequest')) {
        svelteSpecific.importsCorrect = true;
      } else {
        errors.push('Server.ts missing Svelte imports or route handlers');
      }

      // Check for Svelte routes
      if (serverContent.includes('/svelte') || (serverContent.includes("'/'") && serverContent.includes('SvelteExample'))) {
        svelteSpecific.routesConfigured = true;
      } else {
        errors.push('Server.ts missing Svelte route configuration');
      }
    } catch (e: any) {
      errors.push(`Failed to read server.ts: ${e.message || e}`);
    }
  } else {
    errors.push(`Server file not found: ${serverPath}`);
  }

  // Check 3: package.json has Svelte dependencies
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const hasSvelte = packageJson.dependencies?.svelte;
      
      if (!hasSvelte) {
        errors.push('package.json missing Svelte dependencies');
      }
    } catch (e: any) {
      warnings.push(`Could not verify Svelte dependencies in package.json: ${e.message || e}`);
    }
  }

  // Check 4: TypeScript compilation for Svelte files
  // This will be handled by the functional test framework

  // Check 5: Run functional tests (build, server, etc.)
  let functionalTestResults: FunctionalTestResult | undefined;
  try {
    functionalTestResults = await runFunctionalTests(projectPath, packageManager, options);

    if (!functionalTestResults.passed) {
      errors.push(...functionalTestResults.errors);
    }
    if (functionalTestResults.warnings.length > 0) {
      warnings.push(...functionalTestResults.warnings);
    }
  } catch (e: any) {
    errors.push(`Functional tests failed: ${e.message || e}`);
  }

  const passed = errors.length === 0 && svelteSpecific.filesExist && svelteSpecific.routesConfigured && svelteSpecific.importsCorrect;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    svelteSpecific
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
    console.error('Usage: bun run scripts/functional-tests/svelte-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateSvelteFramework(projectPath, packageManager, {}, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== Svelte Framework Validation Results ===\n');
      
      console.log('Svelte-Specific Checks:');
      console.log(`  Files Exist: ${result.svelteSpecific.filesExist ? '✓' : '✗'}`);
      console.log(`  Routes Configured: ${result.svelteSpecific.routesConfigured ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.svelteSpecific.importsCorrect ? '✓' : '✗'}`);

      if (result.functionalTestResults) {
        console.log('\nFunctional Test Results:');
        if (result.functionalTestResults.results.structure) {
          console.log(`  Structure: ${result.functionalTestResults.results.structure.passed ? '✓' : '✗'}`);
        }
        if (result.functionalTestResults.results.build) {
          console.log(`  Build: ${result.functionalTestResults.results.build.passed ? '✓' : '✗'}`);
          if (result.functionalTestResults.results.build.compileTime) {
            console.log(`    Compile time: ${result.functionalTestResults.results.build.compileTime}ms`);
          }
        }
        if (result.functionalTestResults.results.server) {
          console.log(`  Server: ${result.functionalTestResults.results.server.passed ? '✓' : '✗'}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
      }

      if (result.passed) {
        console.log('\n✓ Svelte framework validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Svelte framework validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Svelte framework validation error:', e);
      process.exit(1);
    });
}

