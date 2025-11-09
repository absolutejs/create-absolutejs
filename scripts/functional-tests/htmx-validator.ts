/*
  HTMX Framework Validator
  Validates HTMX-specific functionality across all backend combinations.
  Tests HTMX page generation, routes, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type HTMXValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  htmxSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

/**
 * Validate that an HTMX example is present and correctly wired in a project and run associated functional tests.
 *
 * @param projectPath - Path to the project root to validate
 * @param packageManager - Package manager to use when running functional tests (`bun`, `npm`, `pnpm`, or `yarn`)
 * @param config - Optional project configuration hints (databaseEngine, orm, authProvider, useTailwind, codeQualityTool, isMultiFrontend)
 * @param options - Optional execution flags; use `skipDependencies`, `skipBuild`, or `skipServer` to skip corresponding functional-test phases
 * @returns An HTMXValidationResult containing overall pass/fail, aggregated `errors` and `warnings`, optional `functionalTestResults`, and HTMX-specific flags (`filesExist`, `routesConfigured`, `importsCorrect`)
 */
export async function validateHTMXFramework(
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
): Promise<HTMXValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const htmxSpecific: HTMXValidationResult['htmxSpecific'] = {
    filesExist: false,
    routesConfigured: false,
    importsCorrect: false
  };

  // Check 1: HTMX-specific files exist
  // Find HTMX directory (could be in src/frontend or src/frontend/htmx)
  let htmxDirectory = join(projectPath, 'src', 'frontend');
  const possibleHtmxDirs = [
    join(projectPath, 'src', 'frontend', 'htmx'),
    join(projectPath, 'src', 'frontend')
  ];

  // Find which directory contains HTMX files
  let foundHtmxDir: string | undefined;
  for (const dir of possibleHtmxDirs) {
    if (existsSync(join(dir, 'pages', 'HTMXExample.html'))) {
      foundHtmxDir = dir;
      break;
    }
  }

  if (!foundHtmxDir) {
    errors.push('HTMX directory not found - checked src/frontend and src/frontend/htmx');
  } else {
    htmxDirectory = foundHtmxDir;
  }

  const htmxPagesPath = join(htmxDirectory, 'pages');
  const htmxStylesPath = join(htmxDirectory, 'styles');
  const htmxScriptsPath = join(htmxDirectory);
  const htmxAssetsPath = join(projectPath, 'src', 'backend', 'assets', 'svg', 'htmx-logo-black.svg');
  const htmxAssetsPathWhite = join(projectPath, 'src', 'backend', 'assets', 'svg', 'htmx-logo-white.svg');

  const requiredFiles = [
    join(htmxPagesPath, 'HTMXExample.html'),
    join(htmxStylesPath, 'htmx-example.css'),
    join(htmxScriptsPath, 'htmx.min.js'),
    htmxAssetsPath,
    htmxAssetsPathWhite
  ];

  const missingFiles = requiredFiles.filter((file) => !existsSync(file));

  if (missingFiles.length > 0) {
    errors.push(`Missing HTMX files: ${missingFiles.join(', ')}`);
  } else {
    htmxSpecific.filesExist = true;
  }

  // Check 2: Server.ts has HTMX routes configured
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    try {
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for HTMX imports
      if (serverContent.includes('HTMXExample') || serverContent.includes('handleHTMXPageRequest')) {
        htmxSpecific.importsCorrect = true;
      } else {
        errors.push('Server.ts missing HTMX imports or route handlers');
      }

      // Check for HTMX routes
      const hasHtmxRoutes = 
        ((serverContent.includes('/htmx') || (serverContent.includes("'/'") && serverContent.includes('HTMXExample')))) &&
        serverContent.includes('/htmx/reset') &&
        serverContent.includes('/htmx/count') &&
        serverContent.includes('/htmx/increment');
      
      if (hasHtmxRoutes) {
        htmxSpecific.routesConfigured = true;
      } else {
        errors.push('Server.ts missing HTMX route configuration (expected /htmx, /htmx/reset, /htmx/count, /htmx/increment)');
      }
    } catch (e: any) {
      errors.push(`Failed to read server.ts: ${e.message || e}`);
    }
  } else {
    errors.push(`Server file not found: ${serverPath}`);
  }

  // Check 3: HTMX page content validation
  if (htmxSpecific.filesExist) {
    try {
      const htmxContent = readFileSync(join(htmxPagesPath, 'HTMXExample.html'), 'utf-8');
      
      // Basic HTML structure checks
      if (!htmxContent.includes('<!doctype html>') && !htmxContent.includes('<!DOCTYPE html>')) {
        warnings.push('HTMX page may be missing proper DOCTYPE declaration');
      }
      
      if (!htmxContent.includes('<title>AbsoluteJS + HTMX</title>')) {
        warnings.push('HTMX page may be missing expected title');
      }
      
      if (!htmxContent.includes('htmx-example.css')) {
        warnings.push('HTMX page may be missing CSS link');
      }

      if (!htmxContent.includes('htmx.min.js')) {
        warnings.push('HTMX page may be missing htmx.min.js script reference');
      }

      // Check for HTMX attributes
      if (!htmxContent.includes('hx-')) {
        warnings.push('HTMX page may be missing HTMX attributes (hx-post, hx-trigger, etc.)');
      }
    } catch (e: any) {
      warnings.push(`Could not validate HTMX content: ${e.message || e}`);
    }
  }

  // Check 4: Run functional tests (build, server, etc.)
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

  const passed = errors.length === 0 && htmxSpecific.filesExist && htmxSpecific.routesConfigured && htmxSpecific.importsCorrect;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    htmxSpecific
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
    console.error('Usage: bun run scripts/functional-tests/htmx-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateHTMXFramework(projectPath, packageManager, {}, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== HTMX Framework Validation Results ===\n');
      
      console.log('HTMX-Specific Checks:');
      console.log(`  Files Exist: ${result.htmxSpecific.filesExist ? '✓' : '✗'}`);
      console.log(`  Routes Configured: ${result.htmxSpecific.routesConfigured ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.htmxSpecific.importsCorrect ? '✓' : '✗'}`);

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
        console.log('\n✓ HTMX framework validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ HTMX framework validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ HTMX framework validation error:', e);
      process.exit(1);
    });
}
