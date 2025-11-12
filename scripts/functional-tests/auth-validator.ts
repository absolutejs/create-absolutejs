/*
  Auth Configuration Validator
  Validates auth-enabled scaffolded projects by ensuring required files,
  schema definitions, and runtime wiring exist, then runs core functional tests.
*/

import process from 'node:process';
import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

const DEFAULT_PACKAGE_MANAGER = 'bun';

type AuthValidationResult = {
  errors: string[];
  functionalTestResults?: FunctionalTestResult;
  passed: boolean;
  warnings: string[];
};

type ValidatorConfig = {
  authProvider?: string;
  databaseEngine?: string;
  orm?: string;
};

type ValidatorOptions = {
  skipBuild?: boolean;
  skipDependencies?: boolean;
  skipServer?: boolean;
};

const runFunctionalSuite = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn',
  options: ValidatorOptions
) => {
  try {
    return await runFunctionalTests(projectPath, packageManager, options);
  } catch (error) {
    throw new Error(`Functional tests failed: ${(error as Error).message}`);
  }
};

const processFunctionalResults = (
  result: FunctionalTestResult | undefined,
  errors: string[],
  warnings: string[]
) => {
  if (!result) {
    return;
  }

  if (!result.passed) {
    errors.push(...result.errors);
  }

  if (result.warnings.length > 0) {
    warnings.push(...result.warnings);
  }
};

export const validateAuthConfiguration = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = DEFAULT_PACKAGE_MANAGER,
  config: ValidatorConfig = {},
  options: ValidatorOptions = {}
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.authProvider || config.authProvider === 'none') {
    return {
      errors: ['Auth validator requires a configuration with an auth provider enabled.'],
      passed: false,
      warnings
    };
  }

  let functionalTestResults: FunctionalTestResult | undefined;

  try {
    functionalTestResults = await runFunctionalSuite(projectPath, packageManager, options);
    processFunctionalResults(functionalTestResults, errors, warnings);
  } catch (error) {
    errors.push((error as Error).message);
  }

  const passed = errors.length === 0 && (functionalTestResults?.passed ?? false);

  return {
    errors,
    functionalTestResults,
    passed,
    warnings
  } satisfies AuthValidationResult;
};

const printFunctionalSummary = (result: FunctionalTestResult) => {
  console.log('\nFunctional Test Summary:');
  console.log(`  Passed: ${result.passed ? '✓' : '✗'}`);
  result.errors.forEach((error) => console.error(`  - ${error}`));
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const printValidationResults = (result: AuthValidationResult) => {
  console.log('\n=== Auth Configuration Validation Results ===\n');

  if (result.functionalTestResults) {
    printFunctionalSummary(result.functionalTestResults);
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }

  console.log(`\nOverall: ${result.passed ? 'PASS' : 'FAIL'}`);
};

const parseCliArguments = (argv: string[]) => {
  const [, , projectPath, packageManager, databaseEngine, orm, authProvider] = argv;

  return {
    authProvider: authProvider ?? 'none',
    databaseEngine: databaseEngine ?? 'none',
    options: {
      skipBuild: argv.includes('--skip-build'),
      skipDependencies: argv.includes('--skip-deps'),
      skipServer: argv.includes('--skip-server')
    },
    orm: orm ?? 'none',
    packageManager: (packageManager as 'bun' | 'npm' | 'pnpm' | 'yarn') ?? DEFAULT_PACKAGE_MANAGER,
    projectPath
  };
};

if (import.meta.main) {
  const { authProvider, databaseEngine, options, packageManager, projectPath, orm } =
    parseCliArguments(process.argv);

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/auth-validator.ts <project-path> [package-manager] [databaseEngine] [orm] [authProvider] [--skip-deps] [--skip-build] [--skip-server]'
    );
    process.exit(1);
  }

  validateAuthConfiguration(projectPath, packageManager, { authProvider, databaseEngine, orm }, options)
    .then((result) => {
      printValidationResults(result);
      process.exit(result.passed ? 0 : 1);

      return undefined;
    })
    .catch((error) => {
      console.error('Auth validation error:', error);
      process.exit(1);
    });
}

