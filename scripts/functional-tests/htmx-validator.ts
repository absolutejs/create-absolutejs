/*
  HTMX Framework Validator
  Validates HTMX-specific functionality across all backend combinations.
  Tests HTMX page generation, routes, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

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

type ValidatorOptions = {
  skipDependencies?: boolean;
  skipBuild?: boolean;
  skipServer?: boolean;
};

type ValidatorConfig = {
  databaseEngine?: string;
  orm?: string;
  authProvider?: string;
  useTailwind?: boolean;
  codeQualityTool?: string;
  isMultiFrontend?: boolean;
};

type HtmxSpecificChecks = {
  errors: string[];
  warnings: string[];
  filesExist: boolean;
  importsCorrect: boolean;
  routesConfigured: boolean;
};

const HTMX_DIRECTORY_CANDIDATES = ['src/frontend/htmx', 'src/frontend'];
const REQUIRED_HTMX_FILES = [
  ['pages', 'HTMXExample.html'],
  ['styles', 'htmx-example.css'],
  ['htmx.min.js']
];
const REQUIRED_HTMX_ROUTES = ['/htmx/reset', '/htmx/count', '/htmx/increment'];
const HTMX_ASSET_PATHS = [
  ['src', 'backend', 'assets', 'svg', 'htmx-logo-black.svg'],
  ['src', 'backend', 'assets', 'svg', 'htmx-logo-white.svg']
];
const REQUIRED_TITLE = '<title>AbsoluteJS + HTMX</title>';

const findHtmxDirectory = (projectPath: string) => {
  for (const relative of HTMX_DIRECTORY_CANDIDATES) {
    const candidate = join(projectPath, relative);
    const pagePath = join(candidate, 'pages', 'HTMXExample.html');

    if (existsSync(pagePath)) {
      return candidate;
    }
  }

  return null;
};

const readFileSafe = (filePath: string) => {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const checkHtmxFiles = (htmxDirectory: string, projectPath: string, errors: string[]) => {
  const required = REQUIRED_HTMX_FILES.map((segments) => join(htmxDirectory, ...segments));
  HTMX_ASSET_PATHS.forEach((segments) => {
    required.push(join(projectPath, ...segments));
  });

  const missingFiles = required.filter((filePath) => !existsSync(filePath));

  if (missingFiles.length > 0) {
    errors.push(`Missing HTMX files: ${missingFiles.join(', ')}`);

    return false;
  }

  return true;
};

const checkServerRoutes = (projectPath: string, errors: string[]) => {
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');

  if (!existsSync(serverPath)) {
    errors.push(`Server file not found: ${serverPath}`);

    return { importsCorrect: false, routesConfigured: false };
  }

  const serverContent = readFileSafe(serverPath);

  if (typeof serverContent !== 'string') {
    errors.push(`Failed to read server.ts: ${serverContent.error.message}`);

    return { importsCorrect: false, routesConfigured: false };
  }

  const importsCorrect = serverContent.includes('HTMXExample') || serverContent.includes('handleHTMXPageRequest');

  if (!importsCorrect) {
    errors.push('Server.ts missing HTMX imports or route handlers');
  }

  const baseRoutePresent = serverContent.includes("'/htmx'") ||
    (serverContent.includes("'/'") && serverContent.includes('HTMXExample'));
  const missingRoutes = REQUIRED_HTMX_ROUTES.filter((route) => !serverContent.includes(route));
  const routesConfigured = missingRoutes.length === 0 && baseRoutePresent;

  if (!routesConfigured) {
    errors.push('Server.ts missing HTMX route configuration (expected /htmx, /htmx/reset, /htmx/count, /htmx/increment)');
  }

  return { importsCorrect, routesConfigured };
};

const checkHtmxContent = (htmxDirectory: string, warnings: string[]) => {
  const pagePath = join(htmxDirectory, 'pages', 'HTMXExample.html');
  const htmlContent = readFileSafe(pagePath);

  if (typeof htmlContent !== 'string') {
    warnings.push(`Could not validate HTMX content: ${htmlContent.error.message}`);

    return;
  }

  if (!htmlContent.includes('<!doctype html>') && !htmlContent.includes('<!DOCTYPE html>')) {
    warnings.push('HTMX page may be missing proper DOCTYPE declaration');
  }

  if (!htmlContent.includes(REQUIRED_TITLE)) {
    warnings.push('HTMX page may be missing expected title');
  }

  if (!htmlContent.includes('htmx-example.css')) {
    warnings.push('HTMX page may be missing CSS link');
  }

  if (!htmlContent.includes('htmx.min.js')) {
    warnings.push('HTMX page may be missing htmx.min.js script reference');
  }

  if (!htmlContent.includes('hx-')) {
    warnings.push('HTMX page may be missing HTMX attributes (hx-post, hx-trigger, etc.)');
  }
};

const evaluateHtmxSpecificChecks = (projectPath: string): HtmxSpecificChecks => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const htmxDirectory = findHtmxDirectory(projectPath);

  if (!htmxDirectory) {
    errors.push('HTMX directory not found - checked src/frontend and src/frontend/htmx');

    return {
      errors,
      filesExist: false,
      importsCorrect: false,
      routesConfigured: false,
      warnings
    };
  }

  const filesExist = checkHtmxFiles(htmxDirectory, projectPath, errors);
  const { importsCorrect, routesConfigured } = checkServerRoutes(projectPath, errors);

  if (filesExist) {
    checkHtmxContent(htmxDirectory, warnings);
  }

  return {
    errors,
    filesExist,
    importsCorrect,
    routesConfigured,
    warnings
  };
};

const runFunctionalSuite = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn',
  options: ValidatorOptions,
  errors: string[],
  warnings: string[]
) => {
  const results = await runFunctionalTests(projectPath, packageManager, options).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    errors.push(`Functional tests failed: ${error.message}`);

    return undefined;
  });

  if (!results) {
    return undefined;
  }

  if (!results.passed) {
    errors.push(...results.errors);
  }

  if (results.warnings.length > 0) {
    warnings.push(...results.warnings);
  }

  return results;
};

export const validateHTMXFramework = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  _config: ValidatorConfig = {},
  options: ValidatorOptions = {}
): Promise<HTMXValidationResult> => {
  void _config;
  const errors: string[] = [];
  const warnings: string[] = [];

  const htmxChecks = evaluateHtmxSpecificChecks(projectPath);
  errors.push(...htmxChecks.errors);
  warnings.push(...htmxChecks.warnings);

  const functionalTestResults = await runFunctionalSuite(
    projectPath,
    packageManager,
    options,
    errors,
    warnings
  );

  const passed =
    errors.length === 0 &&
    htmxChecks.filesExist &&
    htmxChecks.routesConfigured &&
    htmxChecks.importsCorrect;

  return {
    errors,
    functionalTestResults,
    htmxSpecific: {
      filesExist: htmxChecks.filesExist,
      importsCorrect: htmxChecks.importsCorrect,
      routesConfigured: htmxChecks.routesConfigured
    },
    passed,
    warnings
  };
};

const parseCliArguments = () => {
  const [, , projectPath, packageManagerArg, ...flags] = process.argv;
  const packageManager = (packageManagerArg as 'bun' | 'npm' | 'pnpm' | 'yarn' | undefined) ?? 'bun';

  const skipDependencies = flags.includes('--skip-deps');
  const skipBuild = flags.includes('--skip-build');
  const skipServer = flags.includes('--skip-server');

  return {
    packageManager,
    projectPath,
    skipBuild,
    skipDependencies,
    skipServer
  } as const;
};

const logHtmxSpecificSummary = (htmxSpecific: HTMXValidationResult['htmxSpecific']) => {
  console.log('HTMX-Specific Checks:');
  console.log(`  Files Exist: ${htmxSpecific.filesExist ? '✓' : '✗'}`);
  console.log(`  Routes Configured: ${htmxSpecific.routesConfigured ? '✓' : '✗'}`);
  console.log(`  Imports Correct: ${htmxSpecific.importsCorrect ? '✓' : '✗'}`);
};

const logBuildSummary = (build?: FunctionalTestResult['results']['build']) => {
  if (!build) {
    return;
  }

  console.log(`  Build: ${build.passed ? '✓' : '✗'}`);

  if (typeof build.compileTime === 'number') {
    console.log(`    Compile time: ${build.compileTime}ms`);
  }
};

const logServerSummary = (server?: FunctionalTestResult['results']['server']) => {
  if (!server) {
    return;
  }

  console.log(`  Server: ${server.passed ? '✓' : '✗'}`);
};

const logFunctionalSummary = (functionalTestResults?: FunctionalTestResult) => {
  if (!functionalTestResults) {
    return;
  }

  console.log('\nFunctional Test Results:');
  const { results } = functionalTestResults;
  logBuildSummary(results.build);
  logServerSummary(results.server);
};

const logWarnings = (warnings: string[]) => {
  if (warnings.length === 0) {
    return;
  }

  console.log('\nWarnings:');
  warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const exitWithResult = (result: HTMXValidationResult) => {
  if (result.passed) {
    console.log('\n✓ HTMX framework validation passed!');
    process.exit(0);
  }

  console.log('\n✗ HTMX framework validation failed:');
  result.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath, skipBuild, skipDependencies, skipServer } = parseCliArguments();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/htmx-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  try {
    const result = await validateHTMXFramework(
      projectPath,
      packageManager,
      {},
      { skipBuild, skipDependencies, skipServer }
    );

    console.log('\n=== HTMX Framework Validation Results ===\n');
    logHtmxSpecificSummary(result.htmxSpecific);
    logFunctionalSummary(result.functionalTestResults);
    logWarnings(result.warnings);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ HTMX framework validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ HTMX validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
