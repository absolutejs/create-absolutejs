/*
  Svelte Framework Validator
  Executes the functional test suite for Svelte scaffold combinations.
*/

import process from 'node:process';

import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

export type SvelteValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
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

  const functionalTestResults = await runFunctionalSuite(
    projectPath,
    packageManager,
    options,
    errors,
    warnings
  );

  const passed = errors.length === 0;

  return {
    errors,
    functionalTestResults,
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
