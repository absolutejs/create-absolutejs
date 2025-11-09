/*
  Auth Configuration Validator
  Validates auth-enabled scaffolded projects by ensuring required files,
  schema definitions, and runtime wiring exist, then runs core functional tests.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

type AuthValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  authSpecific: {
    handlerExists: boolean;
    schemaIncludesUsers: boolean;
    serverUsesAuth: boolean;
    packageHasAuthDependency: boolean;
  };
};

type ValidatorConfig = {
  databaseEngine?: string;
  orm?: string;
  authProvider?: string;
};

type ValidatorOptions = {
  skipDependencies?: boolean;
  skipBuild?: boolean;
  skipServer?: boolean;
};

const relationalEngines = new Set([
  'sqlite',
  'postgresql',
  'mysql'
]);

/**
 * Validates that a scaffolded project's authentication configuration and wiring are present and correct.
 *
 * Performs checks for a user handler, database schema (engine- and ORM-aware), server plugin wiring, and
 * presence of the `@absolutejs/auth` dependency, then optionally runs shared functional tests and aggregates results.
 *
 * @param projectPath - Filesystem path to the project root to validate
 * @param packageManager - Package manager to use when running functional tests (`bun`, `npm`, `pnpm`, or `yarn`)
 * @param config - Validator configuration: may include `databaseEngine` (e.g., 'sqlite', 'postgresql', 'mysql', 'mongodb', or 'none'), `orm` (e.g., 'drizzle'), and `authProvider`
 * @param options - Runtime options to alter test behavior; supports `skipDependencies`, `skipBuild`, and `skipServer` flags
 * @returns An AuthValidationResult containing:
 *  - `passed`: `true` if all required checks and (if run) functional tests passed, `false` otherwise;
 *  - `errors`: list of failure messages observed during validation;
 *  - `warnings`: list of non-fatal observations or coverage gaps;
 *  - `functionalTestResults` (optional): aggregated results from the shared functional test suite when executed;
 *  - `authSpecific`: object with boolean flags `handlerExists`, `schemaIncludesUsers`, `serverUsesAuth`, and `packageHasAuthDependency` indicating individual check outcomes.
 */
export async function validateAuthConfiguration(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  config: ValidatorConfig = {},
  options: ValidatorOptions = {}
): Promise<AuthValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const authSpecific: AuthValidationResult['authSpecific'] = {
    handlerExists: false,
    schemaIncludesUsers: false,
    serverUsesAuth: false,
    packageHasAuthDependency: false
  };

  if (config.authProvider === undefined || config.authProvider === 'none') {
    errors.push('Auth validator requires a configuration with an auth provider enabled.');
    return {
      passed: false,
      errors,
      warnings,
      authSpecific
    };
  }

  // 1. Ensure userHandlers exists
  const handlerPath = join(projectPath, 'src', 'backend', 'handlers', 'userHandlers.ts');
  if (existsSync(handlerPath)) {
    authSpecific.handlerExists = true;
  } else {
    errors.push(`Auth handler not found at ${handlerPath}`);
  }

  // 2. Schema verification (relational engines)
  const engine = config.databaseEngine ?? 'none';
  const usingDrizzle = config.orm === 'drizzle';
  if (relationalEngines.has(engine)) {
    if (usingDrizzle) {
      const schemaPath = join(projectPath, 'db', 'schema.ts');
      if (existsSync(schemaPath)) {
        const schemaContent = readFileSync(schemaPath, 'utf-8');
        if (schemaContent.includes('export const users')) {
          authSpecific.schemaIncludesUsers = true;
        } else {
          errors.push('Drizzle schema does not include `users` table definition.');
        }
      } else {
        errors.push(`Drizzle schema file not found at ${schemaPath}`);
      }
    } else {
      const sqlSchemaPath = join(projectPath, 'db', 'schema.sql');
      if (existsSync(sqlSchemaPath)) {
        const schemaContent = readFileSync(sqlSchemaPath, 'utf-8');
        if (schemaContent.toLowerCase().includes('create table') && schemaContent.includes('users')) {
          authSpecific.schemaIncludesUsers = true;
        } else {
          errors.push('SQL schema does not include a `users` table definition.');
        }
      } else {
        errors.push(`SQL schema file not found at ${sqlSchemaPath}`);
      }
    }
  } else if (engine === 'mongodb') {
    // MongoDB relies on runtime collection creation; mark as satisfied if handler exists.
    authSpecific.schemaIncludesUsers = authSpecific.handlerExists;
  } else {
    // Unhandled engine - warn so we know coverage gap.
    warnings.push(`Auth validator does not have schema checks for database engine "${engine}".`);
  }

  // 3. Server wiring check
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (existsSync(serverPath)) {
    const serverContent = readFileSync(serverPath, 'utf-8');
    if (serverContent.includes('absoluteAuth')) {
      authSpecific.serverUsesAuth = true;
    } else {
      errors.push('Server does not appear to use absoluteAuth plugin.');
    }
  } else {
    errors.push(`Server file not found at ${serverPath}`);
  }

  // 4. Package dependencies
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };
      if (deps['@absolutejs/auth']) {
        authSpecific.packageHasAuthDependency = true;
      } else {
        errors.push('`@absolutejs/auth` dependency is missing from package.json.');
      }
    } catch (error) {
      errors.push(`Failed to parse package.json: ${(error as Error).message}`);
    }
  } else {
    errors.push(`package.json not found at ${packageJsonPath}`);
  }

  // 5. Run shared functional tests if basic checks passed
  let functionalTestResults: FunctionalTestResult | undefined;
  if (errors.length === 0) {
    try {
      functionalTestResults = await runFunctionalTests(projectPath, packageManager, options);
      if (!functionalTestResults.passed) {
        errors.push(...functionalTestResults.errors);
      }
      if (functionalTestResults.warnings.length > 0) {
        warnings.push(...functionalTestResults.warnings);
      }
    } catch (error) {
      errors.push(`Functional tests failed: ${(error as Error).message}`);
    }
  }

  const passed =
    errors.length === 0 &&
    authSpecific.handlerExists &&
    authSpecific.schemaIncludesUsers &&
    authSpecific.serverUsesAuth &&
    authSpecific.packageHasAuthDependency &&
    (!functionalTestResults || functionalTestResults.passed);

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    authSpecific
  };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';
  const databaseEngine = process.argv[4];
  const orm = process.argv[5];
  const authProvider = process.argv[6];
  const skipDeps = process.argv.includes('--skip-deps');
  const skipBuild = process.argv.includes('--skip-build');
  const skipServer = process.argv.includes('--skip-server');

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/auth-validator.ts <project-path> [package-manager] [databaseEngine] [orm] [authProvider] [--skip-deps] [--skip-build] [--skip-server]'
    );
    process.exit(1);
  }

  validateAuthConfiguration(
    projectPath,
    packageManager,
    { databaseEngine, orm, authProvider },
    {
      skipDependencies: skipDeps,
      skipBuild,
      skipServer
    }
  )
    .then((result) => {
      console.log('\n=== Auth Configuration Validation Results ===\n');

      console.log('Auth-Specific Checks:');
      console.log(`  Handler Exists: ${result.authSpecific.handlerExists ? '✓' : '✗'}`);
      console.log(
        `  Schema Includes Users: ${result.authSpecific.schemaIncludesUsers ? '✓' : '✗'}`
      );
      console.log(`  Server Uses Auth Plugin: ${result.authSpecific.serverUsesAuth ? '✓' : '✗'}`);
      console.log(
        `  package.json has @absolutejs/auth: ${
          result.authSpecific.packageHasAuthDependency ? '✓' : '✗'
        }`
      );

      if (result.functionalTestResults) {
        console.log('\nFunctional Test Results:');
        if (result.functionalTestResults.results.structure) {
          console.log(
            `  Structure: ${
              result.functionalTestResults.results.structure.passed ? '✓' : '✗'
            }`
          );
        }
        if (result.functionalTestResults.results.dependencies) {
          console.log(
            `  Dependencies: ${
              result.functionalTestResults.results.dependencies.passed ? '✓' : '✗'
            }`
          );
        }
        if (result.functionalTestResults.results.build) {
          console.log(
            `  Build: ${result.functionalTestResults.results.build.passed ? '✓' : '✗'}`
          );
          if (result.functionalTestResults.results.build.compileTime) {
            console.log(
              `    Compile time: ${result.functionalTestResults.results.build.compileTime}ms`
            );
          }
        }
        if (result.functionalTestResults.results.server) {
          console.log(
            `  Server: ${result.functionalTestResults.results.server.passed ? '✓' : '✗'}`
          );
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
      }

      if (result.passed) {
        console.log('\n✓ Auth configuration validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Auth configuration validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('✗ Auth configuration validation error:', error);
      process.exit(1);
    });
}

