/*
  Cloud Database Provider Validator
  Validates cloud database provider configurations (Neon, PlanetScale, Turso).
  Tests connection code generation, imports, dependencies, and environment configuration.
*/

import process from 'node:process';
import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

const VALID_PROVIDERS = new Set(['neon', 'planetscale', 'turso']);
const DEFAULT_PACKAGE_MANAGER = 'bun';
type CloudProviderValidationResult = {
  errors: string[];
  functionalTestResults?: FunctionalTestResult;
  passed: boolean;
  warnings: string[];
};

type ValidationConfig = {
  authProvider?: string;
  databaseEngine?: string;
  databaseHost?: string;
  orm?: string;
};

type ValidationOptions = {
  skipBuild?: boolean;
  skipDependencies?: boolean;
  skipServer?: boolean;
};

const runFunctionalSuite = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn',
  options: ValidationOptions
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

export const validateCloudProvider = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = DEFAULT_PACKAGE_MANAGER,
  config: ValidationConfig = {},
  options: ValidationOptions = {}
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const provider = (config.databaseHost ?? 'none') as 'neon' | 'planetscale' | 'turso' | 'none';

  if (!VALID_PROVIDERS.has(provider)) {
    return {
      errors: [`Invalid cloud provider: ${provider}. Expected: neon, planetscale, or turso`],
      functionalTestResults: undefined,
      passed: false,
      warnings
    } satisfies CloudProviderValidationResult;
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
  } satisfies CloudProviderValidationResult;
};

const printFunctionalSummary = (result: FunctionalTestResult) => {
  console.log('\nFunctional Test Summary:');
  console.log(`  Passed: ${result.passed ? '✓' : '✗'}`);
  result.errors.forEach((error) => console.error(`  - ${error}`));
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const parseCliArguments = (argv: string[]) => {
  const [, , projectPath, packageManager, databaseEngine, databaseHost, orm, authProvider] = argv;

  return {
    authProvider: authProvider ?? 'none',
    databaseEngine: databaseEngine ?? 'none',
    databaseHost: databaseHost ?? 'none',
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

const printValidationResults = (
  provider: string,
  databaseEngine: string,
  orm: string,
  result: CloudProviderValidationResult
) => {
  console.log('\n=== Cloud Provider Validation Results ===\n');
  console.log(`Provider: ${provider}`);
  console.log(`Database Engine: ${databaseEngine}`);
  console.log(`ORM: ${orm}`);

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

if (import.meta.main) {
  const { authProvider, databaseEngine, databaseHost, options, orm, packageManager, projectPath } =
    parseCliArguments(process.argv);

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/cloud-provider-validator.ts <project-path> [package-manager] [databaseEngine] [databaseHost] [orm] [authProvider] [--skip-deps] [--skip-build] [--skip-server]'
    );
    process.exit(1);
  }

  validateCloudProvider(
    projectPath,
    packageManager,
    { authProvider, databaseEngine, databaseHost, orm },
    options
  )
    .then((result) => {
      printValidationResults(databaseHost, databaseEngine, orm, result);
      process.exit(result.passed ? 0 : 1);

      return undefined;
    })
    .catch((error) => {
      console.error('Cloud provider validation error:', error);
      process.exit(1);
    });
}
