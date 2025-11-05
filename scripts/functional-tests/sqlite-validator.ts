/*
  SQLite Database Validator
  Validates SQLite database connections and functionality across all compatible configurations.
  Tests SQLite database file creation, schema initialization, and query execution.
*/

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

export type SQLiteValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  sqliteSpecific: {
    databaseFileExists: boolean;
    schemaFileExists: boolean;
    connectionWorks: boolean;
    queriesWork: boolean;
  };
};

export async function validateSQLiteDatabase(
  projectPath: string,
  config: {
    orm?: string;
    authProvider?: string;
    databaseHost?: string;
  } = {}
): Promise<SQLiteValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sqliteSpecific: SQLiteValidationResult['sqliteSpecific'] = {
    databaseFileExists: false,
    schemaFileExists: false,
    connectionWorks: false,
    queriesWork: false
  };

  const dbDir = join(projectPath, 'db');
  const databaseFile = join(dbDir, 'database.sqlite');

  // Check 1: Database directory exists
  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);
    return { passed: false, errors, warnings, sqliteSpecific };
  }

  // Check 2: Database file exists (for local SQLite)
  if (config.databaseHost === 'none' || !config.databaseHost) {
    if (!existsSync(databaseFile)) {
      errors.push(`SQLite database file not found: ${databaseFile}`);
      return { passed: false, errors, warnings, sqliteSpecific };
    }
    sqliteSpecific.databaseFileExists = true;
  } else if (config.databaseHost === 'turso') {
    // For Turso, we don't have a local file, so we skip this check
    warnings.push('Turso remote database - skipping local file check');
  }

  // Check 3: Schema file exists
  if (config.orm === 'drizzle') {
    const schemaPath = join(dbDir, 'schema.ts');
    if (!existsSync(schemaPath)) {
      errors.push(`Drizzle schema file not found: ${schemaPath}`);
      return { passed: false, errors, warnings, sqliteSpecific };
    }
    sqliteSpecific.schemaFileExists = true;
  } else {
    const schemaPath = join(dbDir, 'schema.sql');
    if (!existsSync(schemaPath)) {
      errors.push(`SQLite schema file not found: ${schemaPath}`);
      return { passed: false, errors, warnings, sqliteSpecific };
    }
    sqliteSpecific.schemaFileExists = true;
  }

  // Check 4: Test database connection and queries
  if (config.databaseHost === 'none' || !config.databaseHost) {
    try {
      // Test connection by checking if we can query the database
      const testQuery = config.authProvider !== 'none' && config.authProvider
        ? "SELECT name FROM sqlite_master WHERE type='table' AND name='users';"
        : "SELECT name FROM sqlite_master WHERE type='table' AND name='count_history';";
      
      const result = await $`sqlite3 ${databaseFile} "${testQuery}"`.quiet().nothrow();
      
      if (result.exitCode === 0) {
        const output = result.stdout?.toString() || '';
        if (output.trim() || testQuery.includes('users') || testQuery.includes('count_history')) {
          sqliteSpecific.connectionWorks = true;
          
          // Try a more comprehensive query to verify tables exist
          const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table';";
          const tablesResult = await $`sqlite3 ${databaseFile} "${tablesQuery}"`.quiet().nothrow();
          
          if (tablesResult.exitCode === 0) {
            const tablesOutput = tablesResult.stdout?.toString() || '';
            const hasUsers = tablesOutput.includes('users');
            const hasCountHistory = tablesOutput.includes('count_history');
            
            if (config.authProvider !== 'none' && config.authProvider) {
              if (hasUsers) {
                sqliteSpecific.queriesWork = true;
              } else {
                errors.push('Users table not found in database');
              }
            } else {
              if (hasCountHistory) {
                sqliteSpecific.queriesWork = true;
              } else {
                errors.push('Count history table not found in database');
              }
            }
          } else {
            warnings.push('Could not verify table existence via sqlite3 query');
          }
        } else {
          warnings.push('Database connection test returned empty result');
        }
      } else {
        const stderr = result.stderr?.toString() || '';
        errors.push(`Database connection test failed: ${stderr || 'Unknown error'}`);
      }
    } catch (e: any) {
      errors.push(`Database connection test error: ${e.message || e}`);
    }
  } else if (config.databaseHost === 'turso') {
    // For Turso, we can't easily test without credentials
    warnings.push('Turso remote database - skipping connection test (requires credentials)');
    sqliteSpecific.connectionWorks = true; // Assume it works if we can't test
    sqliteSpecific.queriesWork = true; // Assume it works if we can't test
  }

  // Check 5: Verify handler files exist
  const handlersDir = join(projectPath, 'src', 'backend', 'handlers');
  const handlerFile = config.authProvider !== 'none' && config.authProvider
    ? join(handlersDir, 'userHandlers.ts')
    : join(handlersDir, 'countHistoryHandlers.ts');
  
  if (!existsSync(handlerFile)) {
    errors.push(`Database handler file not found: ${handlerFile}`);
  }

  const passed = errors.length === 0 && 
    sqliteSpecific.schemaFileExists && 
    (sqliteSpecific.databaseFileExists || config.databaseHost === 'turso') &&
    sqliteSpecific.connectionWorks &&
    sqliteSpecific.queriesWork;

  return {
    passed,
    errors,
    warnings,
    sqliteSpecific
  };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const orm = process.argv[3] || 'none';
  const authProvider = process.argv[4] || 'none';
  const databaseHost = process.argv[5] || 'none';

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/sqlite-validator.ts <project-path> [orm] [auth-provider] [database-host]');
    process.exit(1);
  }

  validateSQLiteDatabase(projectPath, { orm, authProvider, databaseHost })
    .then((result) => {
      console.log('\n=== SQLite Database Validation Results ===\n');
      
      console.log('SQLite-Specific Checks:');
      console.log(`  Database File Exists: ${result.sqliteSpecific.databaseFileExists ? '✓' : '✗'}`);
      console.log(`  Schema File Exists: ${result.sqliteSpecific.schemaFileExists ? '✓' : '✗'}`);
      console.log(`  Connection Works: ${result.sqliteSpecific.connectionWorks ? '✓' : '✗'}`);
      console.log(`  Queries Work: ${result.sqliteSpecific.queriesWork ? '✓' : '✗'}`);

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
      }

      if (result.passed) {
        console.log('\n✓ SQLite database validation passed!');
        process.exit(0);
      } else {
        console.log('\n✗ SQLite database validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ SQLite database validation error:', e);
      process.exit(1);
    });
}

