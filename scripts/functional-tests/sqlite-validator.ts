import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const MILLISECONDS_PER_SECOND = 1_000;
const SQLITE_TIMEOUT_SECONDS = 5;
const SQLITE_TIMEOUT_MS = SQLITE_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND;
const FORCE_KILL_DELAY_MS = 1_000;

const runSqliteCommand = async (databaseFile: string, query: string) => {
  const child = spawn('sqlite3', [databaseFile, query], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
  }, SQLITE_TIMEOUT_MS);

  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()));

  const [code] = (await once(child, 'close')) as [number | null, string | null];
  clearTimeout(timeoutId);

  if (timedOut) {
    return null;
  }

  return {
    exitCode: code ?? -1,
    stderr: stderrChunks.join('').trim(),
    stdout: stdoutChunks.join('').trim()
  };
};

const getSchemaPath = (dbDir: string, orm?: string) =>
  orm === 'drizzle' ? join(dbDir, 'schema.ts') : join(dbDir, 'schema.sql');

const determineTableName = (authProvider?: string) =>
  authProvider && authProvider !== 'none' ? 'users' : 'count_history';

const getHandlersPath = (projectPath: string, authProvider?: string) => {
  const handlersDir = join(projectPath, 'src', 'backend', 'handlers');

  return authProvider && authProvider !== 'none'
    ? join(handlersDir, 'userHandlers.ts')
    : join(handlersDir, 'countHistoryHandlers.ts');
};

export type SQLiteValidationResult = {
  errors: string[];
  passed: boolean;
  sqliteSpecific: {
    connectionWorks: boolean;
    databaseFileExists: boolean;
    queriesWork: boolean;
    schemaFileExists: boolean;
  };
  warnings: string[];
};

type SqliteValidationFlags = SQLiteValidationResult['sqliteSpecific'];

type TableCheckResult = {
  errors: string[];
  flags: SqliteValidationFlags;
  warnings: string[];
};

const validateLocalDatabase = async (databaseFile: string, authProvider?: string) => {
  const result = await runSqliteCommand(
    databaseFile,
    "SELECT name FROM sqlite_master WHERE type='table';"
  );

  if (result === null || result.exitCode !== 0) {
    return { error: 'Could not verify table existence via sqlite3 query' } as const;
  }

  const expectedTable = determineTableName(authProvider);
  const tableFound = result.stdout.includes(expectedTable);

  if (!tableFound) {
    return { error: `${expectedTable} table not found in database` } as const;
  }

  return { success: true } as const;
};

const recordTableValidationError = (
  errorMessage: string | undefined,
  errors: string[],
  warnings: string[]
) => {
  if (!errorMessage) {
    return;
  }

  if (errorMessage.includes('Could not verify')) {
    warnings.push(errorMessage);
  } else {
    errors.push(errorMessage);
  }
};

const INITIAL_FLAGS: SqliteValidationFlags = {
  connectionWorks: false,
  databaseFileExists: false,
  queriesWork: false,
  schemaFileExists: false
};

const validateLocalDatabaseTables = async (
  databaseFile: string,
  authProvider?: string
): Promise<TableCheckResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const flags: SqliteValidationFlags = { ...INITIAL_FLAGS };

  if (!existsSync(databaseFile)) {
    errors.push(`SQLite database file not found: ${databaseFile}`);

    return { errors, flags, warnings };
  }

  flags.databaseFileExists = true;
  const tableName = determineTableName(authProvider);
  const tableResult = await runSqliteCommand(
    databaseFile,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
  );

  if (tableResult === null) {
    errors.push('Database connection test timed out');

    return { errors, flags, warnings };
  }

  if (tableResult.exitCode !== 0) {
    errors.push(`Database connection test failed: ${tableResult.stderr || 'Unknown error'}`);

    return { errors, flags, warnings };
  }

  flags.connectionWorks = true;

  if (tableResult.stdout.trim().length === 0) {
    warnings.push('Database connection test returned empty result');

    return { errors, flags, warnings };
  }

  const tableValidation = await validateLocalDatabase(databaseFile, authProvider);

  if (!tableValidation.success) {
    recordTableValidationError(tableValidation.error, errors, warnings);

    return { errors, flags, warnings };
  }

  flags.queriesWork = true;

  return { errors, flags, warnings };
};

export const validateSQLiteDatabase = async (
  projectPath: string,
  config: {
    authProvider?: string;
    databaseHost?: string;
    orm?: string;
  } = {}
): Promise<SQLiteValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sqliteSpecific: SqliteValidationFlags = { ...INITIAL_FLAGS };

  const dbDir = join(projectPath, 'db');
  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);

    return { errors, passed: false, sqliteSpecific, warnings };
  }

  const schemaPath = getSchemaPath(dbDir, config.orm);
  if (!existsSync(schemaPath)) {
    errors.push(`SQLite schema file not found: ${schemaPath}`);

    return { errors, passed: false, sqliteSpecific, warnings };
  }

  sqliteSpecific.schemaFileExists = true;

  const isLocal = config.databaseHost === 'none' || !config.databaseHost;
  const databaseFile = join(dbDir, 'database.sqlite');

  if (isLocal) {
    const localResult = await validateLocalDatabaseTables(databaseFile, config.authProvider);
    errors.push(...localResult.errors);
    warnings.push(...localResult.warnings);
    sqliteSpecific.databaseFileExists = localResult.flags.databaseFileExists;
    sqliteSpecific.connectionWorks = localResult.flags.connectionWorks;
    sqliteSpecific.queriesWork = localResult.flags.queriesWork;
  } else if (config.databaseHost === 'turso') {
    warnings.push('Turso remote database - skipping local file and query checks');
    sqliteSpecific.connectionWorks = true;
    sqliteSpecific.queriesWork = true;
  }

  const handlersPath = getHandlersPath(projectPath, config.authProvider);
  if (!existsSync(handlersPath)) {
    errors.push(`Database handler file not found: ${handlersPath}`);
  }

  const passed =
    errors.length === 0 &&
    sqliteSpecific.schemaFileExists &&
    (sqliteSpecific.databaseFileExists || !isLocal) &&
    sqliteSpecific.connectionWorks &&
    sqliteSpecific.queriesWork;

  return { errors, passed, sqliteSpecific, warnings };
};

const logSQLiteSummary = (result: SQLiteValidationResult) => {
  console.log('\n=== SQLite Database Validation Results ===\n');
  console.log('SQLite-Specific Checks:');
  console.log(`  Connection Works: ${result.sqliteSpecific.connectionWorks ? '✓' : '✗'}`);
  console.log(`  Database File Exists: ${result.sqliteSpecific.databaseFileExists ? '✓' : '✗'}`);
  console.log(`  Queries Work: ${result.sqliteSpecific.queriesWork ? '✓' : '✗'}`);
  console.log(`  Schema File Exists: ${result.sqliteSpecific.schemaFileExists ? '✓' : '✗'}`);
};

const logWarnings = (warnings: string[]) => {
  if (warnings.length === 0) {
    return;
  }

  console.log('\nWarnings:');
  warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const logErrors = (errors: string[]) => {
  if (errors.length === 0) {
    return;
  }

  console.log('\nErrors:');
  errors.forEach((error) => console.error(`  - ${error}`));
};

const parseCliArguments = (argv: string[]) => {
  const [, , projectPath, orm, authProvider, databaseHost] = argv;

  return {
    authProvider: authProvider ?? 'none',
    databaseHost: databaseHost ?? 'none',
    orm: orm ?? 'none',
    projectPath
  } as const;
};

const exitWithResult = (result: SQLiteValidationResult) => {
  console.log(`\nOverall: ${result.passed ? 'PASS' : 'FAIL'}`);
  process.exit(result.passed ? 0 : 1);
};

const runFromCli = async () => {
  const { authProvider, databaseHost, orm, projectPath } = parseCliArguments(process.argv);

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/sqlite-validator.ts <project-path> [orm] [auth-provider] [database-host]');
    process.exit(1);
  }

  try {
    const result = await validateSQLiteDatabase(projectPath, { authProvider, databaseHost, orm });
    logSQLiteSummary(result);
    logWarnings(result.warnings);
    logErrors(result.errors);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('SQLite validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('SQLite validation error:', error);
    process.exit(1);
  });
}
