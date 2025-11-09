/*
  Svelte Framework Validator
  Validates Svelte-specific functionality across all backend combinations.
  Tests Svelte rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

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

type SvelteSpecificChecks = {
  errors: string[];
  warnings: string[];
  filesExist: boolean;
  importsCorrect: boolean;
  routesConfigured: boolean;
};

const SVELTE_DIRECTORY_CANDIDATES = ['src/frontend/svelte', 'src/frontend'];
const REQUIRED_SVELTE_FILES = [
  ['components', 'Counter.svelte'],
  ['pages', 'SvelteExample.svelte'],
  ['composables', 'counter.svelte.ts'],
  ['styles', 'svelte-example.css']
];
const SVELTE_ASSET_PATH = ['src', 'backend', 'assets', 'svg', 'svelte-logo.svg'];
const SVELTE_DEPENDENCY = 'svelte';

const findSvelteDirectory = (projectPath: string) => {
  for (const relative of SVELTE_DIRECTORY_CANDIDATES) {
    const candidate = join(projectPath, relative);
    const pagePath = join(candidate, 'pages', 'SvelteExample.svelte');

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

const parsePackageJsonContent = (raw: string) => {
  try {
    return JSON.parse(raw) as { dependencies?: Record<string, string> };
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const checkSvelteFiles = (svelteDirectory: string, projectPath: string, errors: string[]) => {
  const required = REQUIRED_SVELTE_FILES.map((segments) => join(svelteDirectory, ...segments));
  required.push(join(projectPath, ...SVELTE_ASSET_PATH));

  const missingFiles = required.filter((filePath) => !existsSync(filePath));

  if (missingFiles.length > 0) {
    errors.push(`Missing Svelte files: ${missingFiles.join(', ')}`);

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

  const importsCorrect = serverContent.includes('SvelteExample') || serverContent.includes('handleSveltePageRequest');

  if (!importsCorrect) {
    errors.push('Server.ts missing Svelte imports or route handlers');
  }

  const routesConfigured =
    serverContent.includes("'/svelte'") ||
    (serverContent.includes("'/'") && serverContent.includes('SvelteExample'));

  if (!routesConfigured) {
    errors.push('Server.ts missing Svelte route configuration');
  }

  return { importsCorrect, routesConfigured };
};

const checkPackageJson = (projectPath: string, warnings: string[], errors: string[]) => {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    warnings.push('package.json not found – unable to verify Svelte dependencies');

    return;
  }

  const packageJson = readFileSafe(packageJsonPath);

  if (typeof packageJson !== 'string') {
    warnings.push(`Could not verify Svelte dependencies in package.json: ${packageJson.error.message}`);

    return;
  }

  const parsed = parsePackageJsonContent(packageJson);

  if ('error' in parsed) {
    warnings.push(`Could not verify Svelte dependencies in package.json: ${parsed.error.message}`);

    return;
  }

  const hasSvelte = Boolean(parsed.dependencies?.[SVELTE_DEPENDENCY]);

  if (!hasSvelte) {
    errors.push('package.json missing Svelte dependencies');
  }
};

const evaluateSvelteSpecificChecks = (projectPath: string): SvelteSpecificChecks => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const svelteDirectory = findSvelteDirectory(projectPath);

  if (!svelteDirectory) {
    errors.push('Svelte directory not found - checked src/frontend and src/frontend/svelte');

    return {
      errors,
      filesExist: false,
      importsCorrect: false,
      routesConfigured: false,
      warnings
    };
  }

  const filesExist = checkSvelteFiles(svelteDirectory, projectPath, errors);
  const { importsCorrect, routesConfigured } = checkServerRoutes(projectPath, errors);
  checkPackageJson(projectPath, warnings, errors);

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

export const validateSvelteFramework = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  _config: ValidatorConfig = {},
  options: ValidatorOptions = {}
): Promise<SvelteValidationResult> => {
  void _config;
  const errors: string[] = [];
  const warnings: string[] = [];

  const svelteChecks = evaluateSvelteSpecificChecks(projectPath);
  errors.push(...svelteChecks.errors);
  warnings.push(...svelteChecks.warnings);

  const functionalTestResults = await runFunctionalSuite(
    projectPath,
    packageManager,
    options,
    errors,
    warnings
  );

  const passed =
    errors.length === 0 &&
    svelteChecks.filesExist &&
    svelteChecks.routesConfigured &&
    svelteChecks.importsCorrect;

  return {
    errors,
    functionalTestResults,
    passed,
    svelteSpecific: {
      filesExist: svelteChecks.filesExist,
      importsCorrect: svelteChecks.importsCorrect,
      routesConfigured: svelteChecks.routesConfigured
    },
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

const logSvelteSpecificSummary = (svelteSpecific: SvelteValidationResult['svelteSpecific']) => {
  console.log('Svelte-Specific Checks:');
  console.log(`  Files Exist: ${svelteSpecific.filesExist ? '✓' : '✗'}`);
  console.log(`  Routes Configured: ${svelteSpecific.routesConfigured ? '✓' : '✗'}`);
  console.log(`  Imports Correct: ${svelteSpecific.importsCorrect ? '✓' : '✗'}`);
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

const exitWithResult = (result: SvelteValidationResult) => {
  if (result.passed) {
    console.log('\n✓ Svelte framework validation passed!');
    process.exit(0);
  }

  console.log('\n✗ Svelte framework validation failed:');
  result.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath, skipBuild, skipDependencies, skipServer } = parseCliArguments();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/svelte-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  try {
    const result = await validateSvelteFramework(
      projectPath,
      packageManager,
      {},
      { skipBuild, skipDependencies, skipServer }
    );

    console.log('\n=== Svelte Framework Validation Results ===\n');
    logSvelteSpecificSummary(result.svelteSpecific);
    logFunctionalSummary(result.functionalTestResults);
    logWarnings(result.warnings);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Svelte framework validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Svelte validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
