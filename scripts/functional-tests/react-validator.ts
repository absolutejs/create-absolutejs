/*
  React Framework Validator
  Validates React-specific functionality across all backend combinations.
  Tests React rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type ReactValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  reactSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

/**
 * Validates a project's React integration and runs functional tests to assess React-specific readiness.
 *
 * Performs checks for required React files, server route and import configuration, presence of React dependencies,
 * and executes the functional test suite; aggregates errors, warnings, functional test results, and React-specific flags.
 *
 * @param projectPath - Filesystem path to the root of the project to validate
 * @param packageManager - Package manager to use when running functional tests (`bun`, `npm`, `pnpm`, or `yarn`)
 * @param config - Optional project configuration hints (databaseEngine, orm, authProvider, useTailwind, codeQualityTool, isMultiFrontend)
 * @param options - Execution options to skip steps: `skipDependencies`, `skipBuild`, `skipServer`
 * @returns The validation result containing:
 * - `passed`: `true` if no errors were found and all React-specific checks (filesExist, routesConfigured, importsCorrect) passed, `false` otherwise.
 * - `errors`: array of error messages discovered during validation.
 * - `warnings`: array of non-fatal issues or parse/read warnings.
 * - `functionalTestResults`: optional detailed results from the functional test runner.
 * - `reactSpecific`: object with boolean flags `filesExist`, `routesConfigured`, and `importsCorrect`.
 */
export async function validateReactFramework(
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
): Promise<ReactValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const reactSpecific: ReactValidationResult['reactSpecific'] = {
    filesExist: false,
    routesConfigured: false,
    importsCorrect: false
  };

  // Check 1: React-specific files exist
  const reactComponentsPath = join(projectPath, 'src', 'frontend', 'components');
  const reactPagesPath = join(projectPath, 'src', 'frontend', 'pages');
  const reactStylesPath = join(projectPath, 'src', 'frontend', 'styles');
  const reactAssetsPath = join(projectPath, 'src', 'backend', 'assets', 'svg', 'react.svg');

  const requiredFiles = [
    join(reactComponentsPath, 'App.tsx'),
    join(reactComponentsPath, 'Head.tsx'),
    join(reactComponentsPath, 'Dropdown.tsx'),
    join(reactPagesPath, 'ReactExample.tsx'),
    join(reactStylesPath, 'react-example.css'),
    reactAssetsPath
  ];

  const missingFiles = requiredFiles.filter((file) => !existsSync(file));

  if (missingFiles.length > 0) {
    errors.push(`Missing React files: ${missingFiles.join(', ')}`);
  } else {
    reactSpecific.filesExist = true;
  }

  // Check 2: Server.ts has React routes configured
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    try {
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for React imports
      if (serverContent.includes('ReactExample') || serverContent.includes('handleReactPageRequest')) {
        reactSpecific.importsCorrect = true;
      } else {
        errors.push('Server.ts missing React imports or route handlers');
      }

      // Check for React routes
      if (serverContent.includes('/react') || serverContent.includes("'/'") && serverContent.includes('ReactExample')) {
        reactSpecific.routesConfigured = true;
      } else {
        errors.push('Server.ts missing React route configuration');
      }
    } catch (e: any) {
      errors.push(`Failed to read server.ts: ${e.message || e}`);
    }
  } else {
    errors.push(`Server file not found: ${serverPath}`);
  }

  // Check 3: package.json has React dependencies
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const hasReact = packageJson.dependencies?.react || packageJson.devDependencies?.['@types/react'];
      
      if (!hasReact) {
        errors.push('package.json missing React dependencies');
      }
    } catch (e: any) {
      warnings.push(`Could not verify React dependencies in package.json: ${e.message || e}`);
    }
  }

  // Check 4: TypeScript compilation for React files
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

  const passed = errors.length === 0 && reactSpecific.filesExist && reactSpecific.routesConfigured && reactSpecific.importsCorrect;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    reactSpecific
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
    console.error('Usage: bun run scripts/functional-tests/react-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateReactFramework(projectPath, packageManager, {}, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== React Framework Validation Results ===\n');
      
      console.log('React-Specific Checks:');
      console.log(`  Files Exist: ${result.reactSpecific.filesExist ? '✓' : '✗'}`);
      console.log(`  Routes Configured: ${result.reactSpecific.routesConfigured ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.reactSpecific.importsCorrect ? '✓' : '✗'}`);

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
        console.log('\n✓ React framework validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ React framework validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ React framework validation error:', e);
      process.exit(1);
    });
}
