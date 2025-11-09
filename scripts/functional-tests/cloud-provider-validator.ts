/*
  Cloud Database Provider Validator
  Validates cloud database provider configurations (Neon, PlanetScale, Turso).
  Tests connection code generation, imports, dependencies, and environment configuration.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

const VALID_PROVIDERS = new Set(['neon', 'planetscale', 'turso']);
const DEFAULT_PACKAGE_MANAGER = 'bun';
const SERVER_FILE = join('src', 'backend', 'server.ts');
const PACKAGE_JSON = 'package.json';
const ENV_FILE = '.env';
const DOCKER_COMPOSE = join('db', 'docker-compose.db.yml');
const DATABASE_URL_KEY = 'DATABASE_URL=';

const NEON_POOL_SNIPPET = 'new Pool({ connectionString: getEnv("DATABASE_URL") })';
const NEON_FUNCTION_SNIPPET = 'neon(getEnv("DATABASE_URL"))';
const PLANETSCALE_SNIPPET = 'connect({ url: getEnv("DATABASE_URL") })';
const TURSO_SNIPPET = 'createClient({ url: getEnv("DATABASE_URL") })';

const NEON_POOL_IMPORT = "import { Pool } from '@neondatabase/serverless'";
const NEON_FUNCTION_IMPORT = "import { neon } from '@neondatabase/serverless'";
const PLANETSCALE_IMPORT = "import { connect } from '@planetscale/database'";
const TURSO_IMPORT = "import { createClient } from '@libsql/client'";

const GET_ENV_IMPORT_PATTERN = /import\s+.*getEnv.*from\s+['"]@absolutejs\/absolute['"]/;

const PROVIDER_DEPENDENCIES: Record<'neon' | 'planetscale' | 'turso', string> = {
  neon: '@neondatabase/serverless',
  planetscale: '@planetscale/database',
  turso: '@libsql/client'
};

const readFileIfExists = (filePath: string) => {
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${(error as Error).message}`);
  }
};

const parsePackageJson = (packageJsonPath: string) => {
  const content = readFileIfExists(packageJsonPath);

  if (!content) {
    return undefined;
  }

  try {
    return JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch (error) {
    throw new Error(`Failed to parse package.json: ${(error as Error).message}`);
  }
};

type CloudSpecificChecks = {
  connectionCodeCorrect: boolean;
  dependenciesInstalled: boolean;
  envConfigured: boolean;
  importsCorrect: boolean;
  noDockerFiles: boolean;
};

type CloudProviderValidationResult = {
  cloudSpecific: CloudSpecificChecks;
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

type ProviderValidation = {
  connectionCodeCorrect: boolean;
  errors: string[];
  importsCorrect: boolean;
};

const validateProviderConnection = (
  provider: 'neon' | 'planetscale' | 'turso',
  orm: string,
  serverContent: string
): ProviderValidation => {
  if (provider === 'neon' && orm === 'drizzle') {
    const connectionCodeCorrect = serverContent.includes(NEON_POOL_SNIPPET);
    const importsCorrect = serverContent.includes(NEON_POOL_IMPORT);
    const errors = [
      connectionCodeCorrect
        ? null
        : 'Neon + Drizzle: Missing or incorrect connection code (expected Pool from @neondatabase/serverless)',
      importsCorrect ? null : 'Neon + Drizzle: Missing import for Pool from @neondatabase/serverless'
    ].filter(Boolean) as string[];

    return { connectionCodeCorrect, errors, importsCorrect };
  }

  if (provider === 'neon') {
    const connectionCodeCorrect = serverContent.includes(NEON_FUNCTION_SNIPPET);
    const importsCorrect = serverContent.includes(NEON_FUNCTION_IMPORT);
    const errors = [
      connectionCodeCorrect
        ? null
        : 'Neon without ORM: Missing or incorrect connection code (expected neon() function)',
      importsCorrect ? null : 'Neon without ORM: Missing import for neon from @neondatabase/serverless'
    ].filter(Boolean) as string[];

    return { connectionCodeCorrect, errors, importsCorrect };
  }

  if (provider === 'planetscale') {
    const connectionCodeCorrect = serverContent.includes(PLANETSCALE_SNIPPET);
    const importsCorrect = serverContent.includes(PLANETSCALE_IMPORT);
    const errors = [
      connectionCodeCorrect
        ? null
        : 'PlanetScale: Missing or incorrect connection code (expected connect() from @planetscale/database)',
      importsCorrect ? null : 'PlanetScale: Missing import for connect from @planetscale/database'
    ].filter(Boolean) as string[];

    return { connectionCodeCorrect, errors, importsCorrect };
  }

  const connectionCodeCorrect = serverContent.includes(TURSO_SNIPPET);
  const importsCorrect = serverContent.includes(TURSO_IMPORT);
  const errors = [
    connectionCodeCorrect
      ? null
      : 'Turso: Missing or incorrect connection code (expected createClient() from @libsql/client)',
    importsCorrect ? null : 'Turso: Missing import for createClient from @libsql/client'
  ].filter(Boolean) as string[];

  return { connectionCodeCorrect, errors, importsCorrect };
};

const validateDependencies = (
  provider: 'neon' | 'planetscale' | 'turso',
  packageJsonPath: string
) => {
  const pkg = parsePackageJson(packageJsonPath);

  if (!pkg) {
    return { dependenciesInstalled: false, errors: [`package.json not found: ${packageJsonPath}`] };
  }

  const deps: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {})
  };
  const requiredDependency = PROVIDER_DEPENDENCIES[provider];

  if (!deps[requiredDependency]) {
    return { dependenciesInstalled: false, errors: [`Missing dependency: ${requiredDependency}`] };
  }

  return { dependenciesInstalled: true, errors: [] };
};

const validateEnvFile = (envPath: string) => {
  const envContent = readFileIfExists(envPath);

  if (!envContent) {
    return { envConfigured: false, warnings: ['.env file not found. Cloud providers require DATABASE_URL environment variable.'] };
  }

  if (!envContent.includes(DATABASE_URL_KEY)) {
    return {
      envConfigured: false,
      warnings: ['.env file exists but DATABASE_URL not found. Cloud providers require DATABASE_URL.']
    };
  }

  return { envConfigured: true, warnings: [] };
};

const buildValidationResult = (
  cloudSpecific: CloudSpecificChecks,
  errors: string[],
  warnings: string[],
  functionalTestResults?: FunctionalTestResult
) => ({
  cloudSpecific,
  errors,
  functionalTestResults,
  passed:
    errors.length === 0 &&
    cloudSpecific.connectionCodeCorrect &&
    cloudSpecific.importsCorrect &&
    cloudSpecific.dependenciesInstalled &&
    cloudSpecific.noDockerFiles &&
    cloudSpecific.envConfigured,
  warnings
} satisfies CloudProviderValidationResult);

export const validateCloudProvider = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = DEFAULT_PACKAGE_MANAGER,
  config: ValidationConfig = {},
  options: ValidationOptions = {}
) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cloudSpecific: CloudSpecificChecks = {
    connectionCodeCorrect: false,
    dependenciesInstalled: false,
    envConfigured: false,
    importsCorrect: false,
    noDockerFiles: true
  };

  const provider = (config.databaseHost ?? 'none') as 'neon' | 'planetscale' | 'turso' | 'none';
  const orm = config.orm ?? 'none';
  const serverPath = join(projectPath, SERVER_FILE);
  const packageJsonPath = join(projectPath, PACKAGE_JSON);
  const envPath = join(projectPath, ENV_FILE);
  const dockerComposePath = join(projectPath, DOCKER_COMPOSE);

  if (!VALID_PROVIDERS.has(provider)) {
    return buildValidationResult(
      cloudSpecific,
      [`Invalid cloud provider: ${provider}. Expected: neon, planetscale, or turso`],
      warnings
    );
  }

  if (existsSync(dockerComposePath)) {
    cloudSpecific.noDockerFiles = false;
    errors.push(`Docker compose file found for cloud provider ${provider}. Cloud providers should not have Docker setup.`);
  }

  const serverContent = readFileIfExists(serverPath);

  if (!serverContent) {
    return buildValidationResult(cloudSpecific, [`Server file not found: ${serverPath}`], warnings);
  }

  const providerValidation = validateProviderConnection(provider, orm, serverContent);
  cloudSpecific.connectionCodeCorrect = providerValidation.connectionCodeCorrect;
  cloudSpecific.importsCorrect = providerValidation.importsCorrect;
  errors.push(...providerValidation.errors);

  if (!GET_ENV_IMPORT_PATTERN.test(serverContent)) {
    errors.push('Missing import for getEnv from @absolutejs/absolute');
  }

  const dependencyValidation = validateDependencies(provider, packageJsonPath);
  cloudSpecific.dependenciesInstalled = dependencyValidation.dependenciesInstalled;
  errors.push(...dependencyValidation.errors);

  const envValidation = validateEnvFile(envPath);
  cloudSpecific.envConfigured = envValidation.envConfigured;
  warnings.push(...envValidation.warnings);

  if (errors.length > 0) {
    return buildValidationResult(cloudSpecific, errors, warnings);
  }

  let functionalTestResults: FunctionalTestResult | undefined;

  try {
    functionalTestResults = await runFunctionalSuite(projectPath, packageManager, options);
    processFunctionalResults(functionalTestResults, errors, warnings);
  } catch (error) {
    errors.push((error as Error).message);
  }

  return buildValidationResult(cloudSpecific, errors, warnings, functionalTestResults);
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

  console.log('\nCloud-Specific Checks:');
  console.log(`  Connection Code Correct: ${result.cloudSpecific.connectionCodeCorrect ? '✓' : '✗'}`);
  console.log(`  Imports Correct: ${result.cloudSpecific.importsCorrect ? '✓' : '✗'}`);
  console.log(`  Dependencies Installed: ${result.cloudSpecific.dependenciesInstalled ? '✓' : '✗'}`);
  console.log(`  No Docker Files: ${result.cloudSpecific.noDockerFiles ? '✓' : '✗'}`);
  console.log(`  Environment Configured: ${result.cloudSpecific.envConfigured ? '✓' : '✗'}`);

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
