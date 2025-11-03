/*
  HTML Framework Validator
  Validates HTML-specific functionality across all backend combinations.
  Tests HTML page generation, scripts, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type HTMLValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  htmlSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

export async function validateHTMLFramework(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  config: {
    databaseEngine?: string;
    orm?: string;
    authProvider?: string;
    useTailwind?: boolean;
    codeQualityTool?: string;
    isMultiFrontend?: boolean;
    useHTMLScripts?: boolean;
  } = {},
  options: {
    skipDependencies?: boolean;
    skipBuild?: boolean;
    skipServer?: boolean;
  } = {}
): Promise<HTMLValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const htmlSpecific: HTMLValidationResult['htmlSpecific'] = {
    filesExist: false,
    routesConfigured: false,
    importsCorrect: false
  };

  // Check 1: HTML-specific files exist
  // Find HTML directory (could be in src/frontend or src/frontend/html)
  let htmlDirectory = join(projectPath, 'src', 'frontend');
  const possibleHtmlDirs = [
    join(projectPath, 'src', 'frontend', 'html'),
    join(projectPath, 'src', 'frontend')
  ];

  // Find which directory contains HTML files
  let foundHtmlDir: string | undefined;
  for (const dir of possibleHtmlDirs) {
    if (existsSync(join(dir, 'pages', 'HTMLExample.html'))) {
      foundHtmlDir = dir;
      break;
    }
  }

  if (!foundHtmlDir) {
    errors.push('HTML directory not found - checked src/frontend and src/frontend/html');
  } else {
    htmlDirectory = foundHtmlDir;
  }

  const htmlPagesPath = join(htmlDirectory, 'pages');
  const htmlScriptsPath = join(htmlDirectory, 'scripts');
  const htmlStylesPath = join(htmlDirectory, 'styles');
  const htmlAssetsPath = join(projectPath, 'src', 'backend', 'assets', 'svg', 'HTML5_Badge.svg');

  const requiredFiles = [
    join(htmlPagesPath, 'HTMLExample.html'),
    join(htmlStylesPath, 'html-example.css'),
    htmlAssetsPath
  ];

  // Scripts directory is always created, but script file may not be referenced if useHTMLScripts is false
  if (!existsSync(htmlScriptsPath)) {
    warnings.push('Scripts directory not found (expected even if scripts are disabled)');
  }

  // Check if scripts directory has the expected file
  const scriptFile = join(htmlScriptsPath, 'typescript-example.ts');
  if (existsSync(scriptFile)) {
    // Script exists, verify it's referenced in HTML if useHTMLScripts is true
    if (config.useHTMLScripts) {
      try {
        const htmlContent = readFileSync(join(htmlPagesPath, 'HTMLExample.html'), 'utf-8');
        if (!htmlContent.includes('typescript-example.ts')) {
          warnings.push('Script file exists but is not referenced in HTML (useHTMLScripts may be false)');
        }
      } catch (e: any) {
        warnings.push(`Could not verify script reference in HTML: ${e.message || e}`);
      }
    }
  } else if (config.useHTMLScripts) {
    warnings.push('Script file not found but useHTMLScripts is true');
  }

  const missingFiles = requiredFiles.filter((file) => !existsSync(file));

  if (missingFiles.length > 0) {
    errors.push(`Missing HTML files: ${missingFiles.join(', ')}`);
  } else {
    htmlSpecific.filesExist = true;
  }

  // Check 2: Server.ts has HTML routes configured
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    try {
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for HTML imports
      if (serverContent.includes('HTMLExample') || serverContent.includes('handleHTMLPageRequest')) {
        htmlSpecific.importsCorrect = true;
      } else {
        errors.push('Server.ts missing HTML imports or route handlers');
      }

      // Check for HTML routes
      if (serverContent.includes('/html') || (serverContent.includes("'/'") && serverContent.includes('HTMLExample'))) {
        htmlSpecific.routesConfigured = true;
      } else {
        errors.push('Server.ts missing HTML route configuration');
      }
    } catch (e: any) {
      errors.push(`Failed to read server.ts: ${e.message || e}`);
    }
  } else {
    errors.push(`Server file not found: ${serverPath}`);
  }

  // Check 3: HTML page content validation
  if (htmlSpecific.filesExist) {
    try {
      const htmlContent = readFileSync(join(htmlPagesPath, 'HTMLExample.html'), 'utf-8');
      
      // Basic HTML structure checks
      if (!htmlContent.includes('<!doctype html>') && !htmlContent.includes('<!DOCTYPE html>')) {
        warnings.push('HTML page may be missing proper DOCTYPE declaration');
      }
      
      if (!htmlContent.includes('<title>AbsoluteJS + HTML</title>')) {
        warnings.push('HTML page may be missing expected title');
      }
      
      if (!htmlContent.includes('html-example.css')) {
        warnings.push('HTML page may be missing CSS link');
      }
    } catch (e: any) {
      warnings.push(`Could not validate HTML content: ${e.message || e}`);
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

  const passed = errors.length === 0 && htmlSpecific.filesExist && htmlSpecific.routesConfigured && htmlSpecific.importsCorrect;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    htmlSpecific
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
    console.error('Usage: bun run scripts/functional-tests/html-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateHTMLFramework(projectPath, packageManager, {}, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== HTML Framework Validation Results ===\n');
      
      console.log('HTML-Specific Checks:');
      console.log(`  Files Exist: ${result.htmlSpecific.filesExist ? '✓' : '✗'}`);
      console.log(`  Routes Configured: ${result.htmlSpecific.routesConfigured ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.htmlSpecific.importsCorrect ? '✓' : '✗'}`);

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
        console.log('\n✓ HTML framework validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ HTML framework validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ HTML framework validation error:', e);
      process.exit(1);
    });
}

