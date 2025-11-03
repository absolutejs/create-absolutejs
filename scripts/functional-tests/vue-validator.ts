/*
  Vue Framework Validator
  Validates Vue-specific functionality across all backend combinations.
  Tests Vue rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type VueValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  vueSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

export async function validateVueFramework(
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
): Promise<VueValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const vueSpecific: VueValidationResult['vueSpecific'] = {
    filesExist: false,
    routesConfigured: false,
    importsCorrect: false
  };

  // Check 1: Vue-specific files exist
  // Find Vue directory (could be in src/frontend or src/frontend/vue)
  let vueDirectory = join(projectPath, 'src', 'frontend');
  const possibleVueDirs = [
    join(projectPath, 'src', 'frontend', 'vue'),
    join(projectPath, 'src', 'frontend')
  ];

  // Find which directory contains Vue files
  let foundVueDir: string | undefined;
  for (const dir of possibleVueDirs) {
    if (existsSync(join(dir, 'pages', 'VueExample.vue'))) {
      foundVueDir = dir;
      break;
    }
  }

  if (!foundVueDir) {
    errors.push('Vue directory not found - checked src/frontend and src/frontend/vue');
  } else {
    vueDirectory = foundVueDir;
  }

  const vueComponentsPath = join(vueDirectory, 'components');
  const vuePagesPath = join(vueDirectory, 'pages');
  const vueComposablesPath = join(vueDirectory, 'composables');
  const vueAssetsPath = join(projectPath, 'src', 'backend', 'assets', 'svg', 'vue-logo.svg');

  const requiredFiles = [
    join(vueComponentsPath, 'CountButton.vue'),
    join(vuePagesPath, 'VueExample.vue'),
    join(vueComposablesPath, 'useCount.ts'),
    vueAssetsPath
  ];

  const missingFiles = requiredFiles.filter((file) => !existsSync(file));

  if (missingFiles.length > 0) {
    errors.push(`Missing Vue files: ${missingFiles.join(', ')}`);
  } else {
    vueSpecific.filesExist = true;
  }

  // Check 2: Server.ts has Vue routes configured
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    try {
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for Vue imports
      if (serverContent.includes('VueExample') || serverContent.includes('handleVuePageRequest')) {
        vueSpecific.importsCorrect = true;
      } else {
        errors.push('Server.ts missing Vue imports or route handlers');
      }

      // Check for Vue routes
      if (serverContent.includes('/vue') || (serverContent.includes("'/'") && serverContent.includes('VueExample'))) {
        vueSpecific.routesConfigured = true;
      } else {
        errors.push('Server.ts missing Vue route configuration');
      }
    } catch (e: any) {
      errors.push(`Failed to read server.ts: ${e.message || e}`);
    }
  } else {
    errors.push(`Server file not found: ${serverPath}`);
  }

  // Check 3: package.json has Vue dependencies
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const hasVue = packageJson.dependencies?.vue;
      
      if (!hasVue) {
        errors.push('package.json missing Vue dependencies');
      }
    } catch (e: any) {
      warnings.push(`Could not verify Vue dependencies in package.json: ${e.message || e}`);
    }
  }

  // Check 4: TypeScript compilation for Vue files
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

  const passed = errors.length === 0 && vueSpecific.filesExist && vueSpecific.routesConfigured && vueSpecific.importsCorrect;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    vueSpecific
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
    console.error('Usage: bun run scripts/functional-tests/vue-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateVueFramework(projectPath, packageManager, {}, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== Vue Framework Validation Results ===\n');
      
      console.log('Vue-Specific Checks:');
      console.log(`  Files Exist: ${result.vueSpecific.filesExist ? '✓' : '✗'}`);
      console.log(`  Routes Configured: ${result.vueSpecific.routesConfigured ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.vueSpecific.importsCorrect ? '✓' : '✗'}`);

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
        console.log('\n✓ Vue framework validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Vue framework validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Vue framework validation error:', e);
      process.exit(1);
    });
}

