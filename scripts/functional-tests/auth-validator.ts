/*
  Auth Configuration Validator
  Validates auth-enabled scaffolded projects by ensuring required files,
  schema definitions, and runtime wiring exist, then runs core functional tests.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

const relationalEngines = new Set(['sqlite', 'postgresql', 'mysql']);
const AUTH_HANDLER_FILE = 'userHandlers.ts';
const USERS_SCHEMA_TOKEN = 'export const users';
const USERS_TABLE_TOKEN = 'users';
const SQL_CREATE_TABLE_TOKEN = 'create table';
const SERVER_AUTH_TOKEN = 'absoluteAuth';
const AUTH_PACKAGE = '@absolutejs/auth';
const DEFAULT_PACKAGE_MANAGER = 'bun';

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

type AuthValidationResult = {
  authSpecific: {
    handlerExists: boolean;
    packageHasAuthDependency: boolean;
    schemaIncludesUsers: boolean;
    serverUsesAuth: boolean;
  };
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

type SchemaValidationResult = {
  errors: string[];
  schemaIncludesUsers?: boolean;
  warnings?: string[];
};

const hasUsersInDrizzleSchema = (projectPath: string) => {
  const schemaPath = join(projectPath, 'db', 'schema.ts');
  const schemaContent = readFileIfExists(schemaPath);

  if (!schemaContent) {
    return { errors: [`Drizzle schema file not found at ${schemaPath}`] };
  }

  if (!schemaContent.includes(USERS_SCHEMA_TOKEN)) {
    return { errors: ['Drizzle schema does not include `users` table definition.'] };
  }

  return { errors: [] };
};

const hasUsersInSqlSchema = (projectPath: string) => {
  const schemaPath = join(projectPath, 'db', 'schema.sql');
  const schemaContent = readFileIfExists(schemaPath);

  if (!schemaContent) {
    return { errors: [`SQL schema file not found at ${schemaPath}`] };
  }

  const lowerContent = schemaContent.toLowerCase();

  if (!lowerContent.includes(SQL_CREATE_TABLE_TOKEN) || !schemaContent.includes(USERS_TABLE_TOKEN)) {
    return { errors: ['SQL schema does not include a `users` table definition.'] };
  }

  return { errors: [] };
};

const getSchemaValidation = (
  projectPath: string,
  engine: string,
  usingDrizzle: boolean,
  handlerExists: boolean
): SchemaValidationResult => {
  if (relationalEngines.has(engine)) {
    return usingDrizzle
      ? hasUsersInDrizzleSchema(projectPath)
      : hasUsersInSqlSchema(projectPath);
  }

  if (engine === 'mongodb') {
    return { errors: [], schemaIncludesUsers: handlerExists };
  }

  return {
    errors: [],
    schemaIncludesUsers: false,
    warnings: [`Auth validator does not have schema checks for database engine "${engine}".`]
  };
};

const getServerValidation = (projectPath: string) => {
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  const serverContent = readFileIfExists(serverPath);

  if (!serverContent) {
    return { errors: [`Server file not found at ${serverPath}`], serverUsesAuth: false };
  }

  if (!serverContent.includes(SERVER_AUTH_TOKEN)) {
    return { errors: ['Server does not appear to use absoluteAuth plugin.'], serverUsesAuth: false };
  }

  return { errors: [], serverUsesAuth: true };
};

const getPackageValidation = (
  projectPath: string
): { errors: string[]; packageHasAuthDependency: boolean } => {
  const packageJsonPath = join(projectPath, 'package.json');
  const pkg = parsePackageJson(packageJsonPath);

  if (!pkg) {
    return { errors: [`package.json not found at ${packageJsonPath}`], packageHasAuthDependency: false };
  }

  const deps: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {})
  };

  if (!deps[AUTH_PACKAGE]) {
    return { errors: ['`@absolutejs/auth` dependency is missing from package.json.'], packageHasAuthDependency: false };
  }

  return { errors: [], packageHasAuthDependency: true };
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

const buildAuthValidationResult = (
  authSpecific: AuthValidationResult['authSpecific'],
  errors: string[],
  warnings: string[],
  functionalTestResults?: FunctionalTestResult
) => ({
  authSpecific,
  errors,
  functionalTestResults,
  passed:
    errors.length === 0 &&
    authSpecific.handlerExists &&
    authSpecific.schemaIncludesUsers &&
    authSpecific.serverUsesAuth &&
    authSpecific.packageHasAuthDependency &&
    (!functionalTestResults || functionalTestResults.passed),
  warnings
} satisfies AuthValidationResult);

export const validateAuthConfiguration = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = DEFAULT_PACKAGE_MANAGER,
  config: ValidatorConfig = {},
  options: ValidatorOptions = {}
) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const authSpecific: AuthValidationResult['authSpecific'] = {
    handlerExists: false,
    packageHasAuthDependency: false,
    schemaIncludesUsers: false,
    serverUsesAuth: false
  };

  if (!config.authProvider || config.authProvider === 'none') {
    return {
      authSpecific,
      errors: ['Auth validator requires a configuration with an auth provider enabled.'],
      passed: false,
      warnings
    };
  }

  const handlerPath = join(projectPath, 'src', 'backend', 'handlers', AUTH_HANDLER_FILE);
  if (existsSync(handlerPath)) {
    authSpecific.handlerExists = true;
  } else {
    errors.push(`Auth handler not found at ${handlerPath}`);
  }

  const engine = config.databaseEngine ?? 'none';
  const usingDrizzle = config.orm === 'drizzle';
  const schemaValidation = getSchemaValidation(projectPath, engine, usingDrizzle, authSpecific.handlerExists);

  errors.push(...(schemaValidation.errors ?? []));
  if (schemaValidation.warnings) {
    warnings.push(...schemaValidation.warnings);
  }

  if (typeof schemaValidation.schemaIncludesUsers === 'boolean') {
    authSpecific.schemaIncludesUsers = schemaValidation.schemaIncludesUsers;
  } else if (errors.length === 0 && relationalEngines.has(engine)) {
    authSpecific.schemaIncludesUsers = true;
  }

  const serverValidation = getServerValidation(projectPath);
  errors.push(...serverValidation.errors);
  authSpecific.serverUsesAuth = serverValidation.serverUsesAuth;

  const packageValidation = getPackageValidation(projectPath);
  errors.push(...packageValidation.errors);
  authSpecific.packageHasAuthDependency = packageValidation.packageHasAuthDependency;

  if (errors.length > 0) {
    return buildAuthValidationResult(authSpecific, errors, warnings);
  }

  let functionalTestResults: FunctionalTestResult | undefined;

  try {
    functionalTestResults = await runFunctionalSuite(projectPath, packageManager, options);
    processFunctionalResults(functionalTestResults, errors, warnings);
  } catch (error) {
    errors.push((error as Error).message);
  }

  return buildAuthValidationResult(authSpecific, errors, warnings, functionalTestResults);
};

const printFunctionalSummary = (result: FunctionalTestResult) => {
  console.log('\nFunctional Test Summary:');
  console.log(`  Passed: ${result.passed ? '✓' : '✗'}`);
  result.errors.forEach((error) => console.error(`  - ${error}`));
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const printValidationResults = (result: AuthValidationResult) => {
  console.log('\n=== Auth Configuration Validation Results ===\n');
  console.log('Auth-Specific Checks:');
  console.log(`  Handler Exists: ${result.authSpecific.handlerExists ? '✓' : '✗'}`);
  console.log(`  Schema Includes Users: ${result.authSpecific.schemaIncludesUsers ? '✓' : '✗'}`);
  console.log(`  Server Uses Auth: ${result.authSpecific.serverUsesAuth ? '✓' : '✗'}`);
  console.log(`  @absolutejs/auth Dependency: ${result.authSpecific.packageHasAuthDependency ? '✓' : '✗'}`);

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }

  if (result.functionalTestResults) {
    printFunctionalSummary(result.functionalTestResults);
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

