/*
  Cloud Database Provider Validator
  Validates cloud database provider configurations (Neon, PlanetScale, Turso).
  Tests connection code generation, imports, dependencies, and environment configuration.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runFunctionalTests } from './functional-test-runner';
import type { FunctionalTestResult } from './functional-test-runner';

export type CloudProviderValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  cloudSpecific: {
    connectionCodeCorrect: boolean;
    importsCorrect: boolean;
    dependenciesInstalled: boolean;
    noDockerFiles: boolean;
    envConfigured: boolean;
  };
};

/**
 * Validates a project's cloud database provider setup (Neon, PlanetScale, or Turso), verifies provider-specific code, imports and dependencies, checks environment configuration and Docker usage, and runs functional tests.
 *
 * @param projectPath - Path to the project root being validated.
 * @param packageManager - Package manager to use when running functional tests (`bun` | `npm` | `pnpm` | `yarn`).
 * @param config - Optional configuration that influences validation:
 *   - `databaseHost`: provider identifier (`neon`, `planetscale`, or `turso`) used to select provider-specific checks.
 *   - `orm`: ORM in use (e.g., `drizzle`) which adjusts Neon connection/import expectations.
 *   - `databaseEngine` and `authProvider` are accepted but not required for provider selection.
 * @param options - Execution options forwarded to the functional test runner:
 *   - `skipDependencies`: skip dependency installation step.
 *   - `skipBuild`: skip build step.
 *   - `skipServer`: skip starting the server for runtime checks.
 * @returns The CloudProviderValidationResult containing:
 *   - `passed`: whether the validation succeeded,
 *   - `errors`: array of error messages,
 *   - `warnings`: array of warnings,
 *   - `functionalTestResults` (when available),
 *   - `cloudSpecific`: detailed booleans for connection code, imports, dependencies, Docker presence, and env configuration.
 */
export async function validateCloudProvider(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  config: {
    databaseEngine?: string;
    databaseHost?: string;
    orm?: string;
    authProvider?: string;
  } = {},
  options: {
    skipDependencies?: boolean;
    skipBuild?: boolean;
    skipServer?: boolean;
  } = {}
): Promise<CloudProviderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cloudSpecific: CloudProviderValidationResult['cloudSpecific'] = {
    connectionCodeCorrect: false,
    importsCorrect: false,
    dependenciesInstalled: false,
    noDockerFiles: true,
    envConfigured: false
  };

  const databaseHost = config.databaseHost || 'none';
  const databaseEngine = config.databaseEngine || 'none';
  const orm = config.orm || 'none';

  // Validate that this is actually a cloud provider configuration
  if (!['neon', 'planetscale', 'turso'].includes(databaseHost)) {
    errors.push(`Invalid cloud provider: ${databaseHost}. Expected: neon, planetscale, or turso`);
    return { passed: false, errors, warnings, cloudSpecific };
  }

  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  const packageJsonPath = join(projectPath, 'package.json');
  const envPath = join(projectPath, '.env');
  const dbDir = join(projectPath, 'db');
  const dockerComposePath = join(dbDir, 'docker-compose.db.yml');

  // Check 1: No Docker compose files for cloud providers
  if (existsSync(dockerComposePath)) {
    errors.push(`Docker compose file found for cloud provider ${databaseHost}. Cloud providers should not have Docker setup.`);
    cloudSpecific.noDockerFiles = false;
  } else {
    cloudSpecific.noDockerFiles = true;
  }

  // Check 2: Server.ts has correct connection code
  if (!existsSync(serverPath)) {
    errors.push(`Server file not found: ${serverPath}`);
    return { passed: false, errors, warnings, cloudSpecific };
  }

  try {
    const serverContent = readFileSync(serverPath, 'utf-8');

    // Validate connection code based on provider
    if (databaseHost === 'neon') {
      if (orm === 'drizzle') {
        // Neon with Drizzle: should use Pool from @neondatabase/serverless
        if (serverContent.includes('new Pool({ connectionString: getEnv("DATABASE_URL") })')) {
          cloudSpecific.connectionCodeCorrect = true;
        } else {
          errors.push('Neon + Drizzle: Missing or incorrect connection code (expected Pool from @neondatabase/serverless)');
        }
      } else {
        // Neon without ORM: should use neon() function
        if (serverContent.includes('neon(getEnv("DATABASE_URL"))')) {
          cloudSpecific.connectionCodeCorrect = true;
        } else {
          errors.push('Neon without ORM: Missing or incorrect connection code (expected neon() function)');
        }
      }
    } else if (databaseHost === 'planetscale') {
      // PlanetScale: should use connect() from @planetscale/database
      if (serverContent.includes('connect({ url: getEnv("DATABASE_URL") })')) {
        cloudSpecific.connectionCodeCorrect = true;
      } else {
        errors.push('PlanetScale: Missing or incorrect connection code (expected connect() from @planetscale/database)');
      }
    } else if (databaseHost === 'turso') {
      // Turso: should use createClient() from @libsql/client
      if (serverContent.includes('createClient({ url: getEnv("DATABASE_URL") })')) {
        cloudSpecific.connectionCodeCorrect = true;
      } else {
        errors.push('Turso: Missing or incorrect connection code (expected createClient() from @libsql/client)');
      }
    }

    // Check 3: Correct imports based on provider
    if (databaseHost === 'neon') {
      if (orm === 'drizzle') {
        if (serverContent.includes("import { Pool } from '@neondatabase/serverless'")) {
          cloudSpecific.importsCorrect = true;
        } else {
          errors.push('Neon + Drizzle: Missing import for Pool from @neondatabase/serverless');
        }
      } else {
        if (serverContent.includes("import { neon } from '@neondatabase/serverless'")) {
          cloudSpecific.importsCorrect = true;
        } else {
          errors.push('Neon without ORM: Missing import for neon from @neondatabase/serverless');
        }
      }
    } else if (databaseHost === 'planetscale') {
      if (serverContent.includes("import { connect } from '@planetscale/database'")) {
        cloudSpecific.importsCorrect = true;
      } else {
        errors.push('PlanetScale: Missing import for connect from @planetscale/database');
      }
    } else if (databaseHost === 'turso') {
      if (serverContent.includes("import { createClient } from '@libsql/client'")) {
        cloudSpecific.importsCorrect = true;
      } else {
        errors.push('Turso: Missing import for createClient from @libsql/client');
      }
    }

    // Check for getEnv import (can be bundled with other imports)
    const getEnvImportPattern = /import\s+.*getEnv.*from\s+['"]@absolutejs\/absolute['"]/;
    if (!getEnvImportPattern.test(serverContent)) {
      errors.push('Missing import for getEnv from @absolutejs/absolute');
    }
  } catch (e: any) {
    errors.push(`Failed to read server.ts: ${e.message || e}`);
  }

  // Check 4: Dependencies in package.json
  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${packageJsonPath}`);
    return { passed: false, errors, warnings, cloudSpecific };
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (databaseHost === 'neon') {
      if (dependencies['@neondatabase/serverless']) {
        cloudSpecific.dependenciesInstalled = true;
      } else {
        errors.push('Missing dependency: @neondatabase/serverless');
      }
    } else if (databaseHost === 'planetscale') {
      if (dependencies['@planetscale/database']) {
        cloudSpecific.dependenciesInstalled = true;
      } else {
        errors.push('Missing dependency: @planetscale/database');
      }
    } else if (databaseHost === 'turso') {
      if (dependencies['@libsql/client']) {
        cloudSpecific.dependenciesInstalled = true;
      } else {
        errors.push('Missing dependency: @libsql/client');
      }
    }
  } catch (e: any) {
    errors.push(`Failed to read package.json: ${e.message || e}`);
  }

  // Check 5: .env file configured with DATABASE_URL
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      if (envContent.includes('DATABASE_URL=')) {
        cloudSpecific.envConfigured = true;
      } else {
        warnings.push('.env file exists but DATABASE_URL not found. Cloud providers require DATABASE_URL.');
      }
    } catch (e: any) {
      warnings.push(`Could not read .env file: ${e.message || e}`);
    }
  } else {
    warnings.push('.env file not found. Cloud providers require DATABASE_URL environment variable.');
  }

  // Check 6: Run functional tests (build, server, etc.)
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

  const passed = errors.length === 0 && 
                 cloudSpecific.connectionCodeCorrect && 
                 cloudSpecific.importsCorrect && 
                 cloudSpecific.noDockerFiles;

  return {
    passed,
    errors,
    warnings,
    functionalTestResults,
    cloudSpecific
  };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';
  const databaseEngine = process.argv[4];
  const databaseHost = process.argv[5];
  const orm = process.argv[6];
  const authProvider = process.argv[7];
  const skipDeps = process.argv.includes('--skip-deps');
  const skipBuild = process.argv.includes('--skip-build');
  const skipServer = process.argv.includes('--skip-server');

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/cloud-provider-validator.ts <project-path> [package-manager] [databaseEngine] [databaseHost] [orm] [authProvider] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  validateCloudProvider(projectPath, packageManager, { databaseEngine, databaseHost, orm, authProvider }, {
    skipDependencies: skipDeps,
    skipBuild,
    skipServer
  })
    .then((result) => {
      console.log('\n=== Cloud Provider Validation Results ===\n');
      
      console.log(`Provider: ${databaseHost || 'unknown'}`);
      console.log(`Database Engine: ${databaseEngine || 'unknown'}`);
      console.log(`ORM: ${orm || 'none'}\n`);
      
      console.log('Cloud-Specific Checks:');
      console.log(`  Connection Code Correct: ${result.cloudSpecific.connectionCodeCorrect ? '✓' : '✗'}`);
      console.log(`  Imports Correct: ${result.cloudSpecific.importsCorrect ? '✓' : '✗'}`);
      console.log(`  Dependencies Installed: ${result.cloudSpecific.dependenciesInstalled ? '✓' : '✗'}`);
      console.log(`  No Docker Files: ${result.cloudSpecific.noDockerFiles ? '✓' : '✗'}`);
      console.log(`  Environment Configured: ${result.cloudSpecific.envConfigured ? '✓' : '✗'}`);

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
        console.log('\n✓ Cloud provider validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Cloud provider validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Cloud provider validation error:', e);
      process.exit(1);
    });
}
