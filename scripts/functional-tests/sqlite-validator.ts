import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const MILLISECONDS_PER_SECOND = 1_000;
const SQLITE_TIMEOUT_SECONDS = 5;
const SQLITE_TIMEOUT_MS = SQLITE_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND;
const FORCE_KILL_DELAY_MS = 1_000;

const terminateChildProcess = (child: ReturnType<typeof spawn>) => {
  try {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
  } catch {
    // Ignore kill errors; the process may already have exited.
  }
};

const runSqliteCommand = async (databaseFile: string, query: string) => {
  let child: ReturnType<typeof spawn>;

  try {
    child = spawn('sqlite3', [databaseFile, query], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return {
      exitCode: -1,
      failedToSpawn: true,
      stderr: error.message,
      stdout: ''
    };
  }

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()));

  const closePromise = once(child, 'close') as Promise<[number | null, string | null]>;
  const errorPromise = once(child, 'error').then(([error]) => ({
    error: error instanceof Error ? error : new Error(String(error)),
    kind: 'error' as const
  }));
  const timeoutPromise = delay(SQLITE_TIMEOUT_MS).then(() => ({ kind: 'timeout' as const }));

  const outcome = await Promise.race([
    closePromise.then(([code]) => ({ code, kind: 'close' as const })),
    errorPromise,
    timeoutPromise
  ]);

  if (outcome.kind === 'timeout') {
    terminateChildProcess(child);
    await closePromise.catch(() => undefined);

    return null;
  }

  if (outcome.kind === 'error') {
    return {
      exitCode: -1,
      failedToSpawn: true,
      stderr: outcome.error.message,
      stdout: ''
    };
  }

  return {
    exitCode: outcome.code ?? -1,
    stderr: stderrChunks.join('').trim(),
    stdout: stdoutChunks.join('').trim()
  };
};

const determineTableName = (authProvider?: string) =>
  authProvider && authProvider !== 'none' ? 'users' : 'count_history';

export type SQLiteValidationResult = {
  errors: string[];
  passed: boolean;
  sqliteSpecific: {
    connectionWorks: boolean;
    queriesWork: boolean;
  };
  warnings: string[];
};

type TableCheckResult = {
  errors: string[];
  flags: SQLiteValidationResult['sqliteSpecific'];
  warnings: string[];
};

const validateLocalDatabaseTables = async (
  databaseFile: string,
  authProvider?: string
): Promise<TableCheckResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const flags: SQLiteValidationResult['sqliteSpecific'] = {
    connectionWorks: false,
    queriesWork: false
  };
  const tableName = determineTableName(authProvider);
  const tableResult = await runSqliteCommand(
    databaseFile,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
  );

  if (tableResult === null) {
    errors.push('Database connection test timed out');

    return { errors, flags, warnings };
  }

  if (tableResult.failedToSpawn) {
    errors.push(
      `sqlite3 command unavailable: ${tableResult.stderr || 'Executable not found'}`
    );

    return { errors, flags, warnings };
  }

  if (tableResult.exitCode !== 0) {
    errors.push(`Database connection test failed: ${tableResult.stderr || 'Unknown error'}`);

    return { errors, flags, warnings };
  }

  flags.connectionWorks = true;

  if (!tableResult.stdout.includes(tableName)) {
    errors.push(`${tableName} table not found in database (runtime query returned no rows)`);

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
  const sqliteSpecific: SQLiteValidationResult['sqliteSpecific'] = {
    connectionWorks: false,
    queriesWork: false
  };

  const isLocal = config.databaseHost === 'none' || !config.databaseHost;
  const dbDir = join(projectPath, 'db');
  const databaseFile = join(dbDir, 'database.sqlite');

  if (isLocal) {
    const localResult = await validateLocalDatabaseTables(databaseFile, config.authProvider);
    errors.push(...localResult.errors);
    warnings.push(...localResult.warnings);
    sqliteSpecific.connectionWorks = localResult.flags.connectionWorks;
    sqliteSpecific.queriesWork = localResult.flags.queriesWork;
  } else if (config.databaseHost === 'turso') {
    warnings.push('Turso remote database - skipping local file and query checks');
    sqliteSpecific.connectionWorks = true;
    sqliteSpecific.queriesWork = true;
  }

  const passed =
    errors.length === 0 && sqliteSpecific.connectionWorks && sqliteSpecific.queriesWork;

  return { errors, passed, sqliteSpecific, warnings };
};

const logSQLiteSummary = (result: SQLiteValidationResult) => {
  console.log('\n=== SQLite Database Validation Results ===\n');
  console.log('SQLite-Specific Checks:');
  console.log(`  Connection Works: ${result.sqliteSpecific.connectionWorks ? '✓' : '✗'}`);
  console.log(`  Queries Work: ${result.sqliteSpecific.queriesWork ? '✓' : '✗'}`);
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
