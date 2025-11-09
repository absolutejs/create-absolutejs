/*
  Database Connection Tester
  Tests that scaffolded projects can connect to their configured databases.
  Note: This is a placeholder for future implementation.
  Database testing requires:
  - Docker containers for local databases
  - Cloud provider credentials for cloud databases
  - ORM-specific query testing
*/

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

export type DatabaseConnectionResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

const NO_DATABASE_WARNING = 'No database configured - skipping database connection test';
const NOT_IMPLEMENTED_WARNING = 'Database connection testing is not yet fully implemented';
const INFRA_WARNING = 'This requires Docker for local databases or cloud provider credentials';

const hasDatabaseConfigured = (databaseEngine?: string) =>
  typeof databaseEngine === 'string' && databaseEngine !== 'none';

const validateDrizzleSchema = (dbDir: string, errors: string[]) => {
  const schemaPath = join(dbDir, 'schema.ts');

  if (!existsSync(schemaPath)) {
    errors.push(`Drizzle schema file not found: ${schemaPath}`);

    return false;
  }

  return true;
};

export const testDatabaseConnection = async (
  projectPath: string,
  config: {
    databaseEngine?: string;
    databaseHost?: string;
    orm?: string;
  }
): Promise<DatabaseConnectionResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasDatabaseConfigured(config.databaseEngine)) {
    warnings.push(NO_DATABASE_WARNING);

    return { errors, passed: true, warnings };
  }

  const dbDir = join(projectPath, 'db');

  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);

    return { errors, passed: false, warnings };
  }

  warnings.push(NOT_IMPLEMENTED_WARNING, INFRA_WARNING);

  if (config.orm === 'drizzle' && !validateDrizzleSchema(dbDir, errors)) {
    return { errors, passed: false, warnings };
  }

  return { errors, passed: true, warnings };
};

const parseCliArgs = () => {
  const [, , projectPath, databaseEngine, databaseHost, orm] = process.argv;

  return { databaseEngine, databaseHost, orm, projectPath } as const;
};

const runFromCli = async () => {
  const { databaseEngine, databaseHost, orm, projectPath } = parseCliArgs();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/database-connection-tester.ts <project-path> [database-engine] [database-host] [orm]');
    process.exit(1);
  }

  const result = await testDatabaseConnection(projectPath, {
    databaseEngine,
    databaseHost,
    orm
  }).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Database connection test error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ Database connection test failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
    process.exit(1);
  }

  console.log('✓ Database connection test passed');
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Database connection tester encountered an unexpected error:', error);
    process.exit(1);
  });
}
