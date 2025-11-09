/*
  React Framework Validator
  Validates React-specific functionality across all backend combinations.
  Tests React rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

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

type ReactSpecificChecks = {
  errors: string[];
  warnings: string[];
  filesExist: boolean;
  routesConfigured: boolean;
  importsCorrect: boolean;
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

const REQUIRED_COMPONENT_FILES = [
  ['src', 'frontend', 'components', 'App.tsx'],
  ['src', 'frontend', 'components', 'Head.tsx'],
  ['src', 'frontend', 'components', 'Dropdown.tsx'],
  ['src', 'frontend', 'pages', 'ReactExample.tsx'],
  ['src', 'frontend', 'styles', 'react-example.css'],
  ['src', 'backend', 'assets', 'svg', 'react.svg']
];

const extractMissingFiles = (projectPath: string) =>
  REQUIRED_COMPONENT_FILES
    .map((segments) => join(projectPath, ...segments))
    .filter((filePath) => !existsSync(filePath));

const checkReactFiles = (projectPath: string, errors: string[]) => {
  const missingFiles = extractMissingFiles(projectPath);

  if (missingFiles.length > 0) {
    errors.push(`Missing React files: ${missingFiles.join(', ')}`);

    return false;
  }

  return true;
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
    return JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error };
  }
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

  const importsCorrect = serverContent.includes('ReactExample') || serverContent.includes('handleReactPageRequest');

  if (!importsCorrect) {
    errors.push('Server.ts missing React imports or route handlers');
  }

  const routesConfigured =
    serverContent.includes("'/react'") ||
    (serverContent.includes("'/'") && serverContent.includes('ReactExample'));

  if (!routesConfigured) {
    errors.push('Server.ts missing React route configuration');
  }

  return { importsCorrect, routesConfigured };
};

const checkPackageJson = (projectPath: string, warnings: string[], errors: string[]) => {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    warnings.push('package.json not found – unable to verify React dependencies');

    return;
  }

  const packageJson = readFileSafe(packageJsonPath);

  if (typeof packageJson !== 'string') {
    warnings.push(`Could not verify React dependencies in package.json: ${packageJson.error.message}`);

    return;
  }

  const parsed = parsePackageJsonContent(packageJson);

  if ('error' in parsed) {
    warnings.push(`Could not verify React dependencies in package.json: ${parsed.error.message}`);

    return;
  }

  const hasReact = Boolean(parsed.dependencies?.react || parsed.devDependencies?.['@types/react']);

  if (!hasReact) {
    errors.push('package.json missing React dependencies');
  }
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

const evaluateReactSpecificChecks = (projectPath: string): ReactSpecificChecks => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const filesExist = checkReactFiles(projectPath, errors);
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

export const validateReactFramework = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  _config: ValidatorConfig = {},
  options: ValidatorOptions = {}
): Promise<ReactValidationResult> => {
  void _config;
  const errors: string[] = [];
  const warnings: string[] = [];

  const specificChecks = evaluateReactSpecificChecks(projectPath);
  errors.push(...specificChecks.errors);
  warnings.push(...specificChecks.warnings);

  const functionalTestResults = await runFunctionalSuite(
    projectPath,
    packageManager,
    options,
    errors,
    warnings
  );

  const passed =
    errors.length === 0 &&
    specificChecks.filesExist &&
    specificChecks.routesConfigured &&
    specificChecks.importsCorrect;

  return {
    errors,
    functionalTestResults,
    passed,
    reactSpecific: {
      filesExist: specificChecks.filesExist,
      importsCorrect: specificChecks.importsCorrect,
      routesConfigured: specificChecks.routesConfigured
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

const logReactSpecificSummary = (reactSpecific: ReactValidationResult['reactSpecific']) => {
  console.log('React-Specific Checks:');
  console.log(`  Files Exist: ${reactSpecific.filesExist ? '✓' : '✗'}`);
  console.log(`  Routes Configured: ${reactSpecific.routesConfigured ? '✓' : '✗'}`);
  console.log(`  Imports Correct: ${reactSpecific.importsCorrect ? '✓' : '✗'}`);
};

const logBuildSummary = (build?: FunctionalTestResult['results']['build']) => {
  if (!build) {
    return;
  }

  console.log(`  Build: ${build.passed ? '✓' : '✗'}`);

  if (typeof build.compileTime !== 'number') {
    return;
  }

  console.log(`    Compile time: ${build.compileTime}ms`);
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

const exitWithResult = (result: ReactValidationResult) => {
  if (result.passed) {
    console.log('\n✓ React framework validation passed!');
    process.exit(0);
  }

  console.log('\n✗ React framework validation failed:');
  result.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath, skipBuild, skipDependencies, skipServer } = parseCliArguments();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/react-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  try {
    const result = await validateReactFramework(
      projectPath,
      packageManager,
      {},
      { skipBuild, skipDependencies, skipServer }
    );

    console.log('\n=== React Framework Validation Results ===\n');
    logReactSpecificSummary(result.reactSpecific);
    logFunctionalSummary(result.functionalTestResults);
    logWarnings(result.warnings);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ React framework validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ React validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
