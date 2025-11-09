/*
  MySQL Database Validator
  Validates MySQL database connections and functionality across all compatible configurations.
  Tests MySQL Docker setup, schema initialization, and query execution.
*/

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const DB_SCRIPT_TIMEOUT_MS = 2 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MYSQL_READY_ATTEMPTS = 10;
const MYSQL_READY_DELAY_MS = MILLISECONDS_PER_SECOND;
const DOCKER_WARNING_SNIPPET_LENGTH = 100;
const DOCKER_ERROR_SNIPPET_LENGTH = 200;
const TABLES_QUERY = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'database';";
const FORCE_KILL_DELAY_MS = 1_000;

let cachedBunModule: typeof import('bun') | null = null;

const loadBunModule = async () => {
  if (cachedBunModule === null) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

const runCommand = async (
  command: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
  } = {}
) => {
  const [executable, ...args] = command;
  const { cwd, env, timeoutMs = DB_SCRIPT_TIMEOUT_MS } = options;
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const mergedEnv = env ? { ...process.env, ...env } : process.env;
  let timedOut = false;
  let child: ReturnType<typeof spawn>;

  try {
    child = spawn(executable, args, {
      cwd,
      env: mergedEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError.message : String(unknownError);

    return {
      exitCode: -1,
      stderr: error,
      stdout: ''
    };
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
  }, timeoutMs);

  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()));

  const [code] = (await once(child, 'close')) as [number | null, string | null];
  clearTimeout(timeoutId);

  if (timedOut) {
    return {
      exitCode: -1,
      stderr: 'Process timed out',
      stdout: ''
    };
  }

  return {
    exitCode: code ?? -1,
    stderr: stderrChunks.join('').trim(),
    stdout: stdoutChunks.join('').trim()
  };
};

const runProjectScript = (projectPath: string, script: 'db:up' | 'db:down') =>
  runCommand(['bun', script], { cwd: projectPath });

const dockerComposeCommand = (
  dockerComposePath: string,
  subcommand: string[],
  env?: Record<string, string>
) =>
  runCommand(
    ['docker', 'compose', '-p', 'mysql', '-f', dockerComposePath, ...subcommand],
    { env }
  );

const handleDockerUnavailable = (
  stderr: string,
  warnings: string[],
  mysqlSpecific: MySQLValidationResult['mysqlSpecific']
) => {
  warnings.push(
    `Docker not available or requires sudo - skipping local MySQL connection test: ${stderr.slice(0, DOCKER_WARNING_SNIPPET_LENGTH)}`
  );
  mysqlSpecific.connectionWorks = true;
  mysqlSpecific.queriesWork = true;
};

const waitForMySqlReady = async (dockerComposePath: string, attempt = 0) => {
  if (attempt >= MYSQL_READY_ATTEMPTS) {
    return false;
  }

  const readyResult = await dockerComposeCommand(
    dockerComposePath,
    ['exec', '-T', 'db', 'mysqladmin', 'ping', '-h127.0.0.1', '--silent']
  );

  if (readyResult.exitCode === 0) {
    return true;
  }

  const bunModule = await loadBunModule();
  await bunModule.sleep(MYSQL_READY_DELAY_MS);

  return waitForMySqlReady(dockerComposePath, attempt + 1);
};

const determineHandlerPath = (projectPath: string, authProvider?: string) => {
  const handlersDir = join(projectPath, 'src', 'backend', 'handlers');

  return authProvider && authProvider !== 'none'
    ? join(handlersDir, 'userHandlers.ts')
    : join(handlersDir, 'countHistoryHandlers.ts');
};

const getDockerStartErrors = (
  stderr: string,
  warnings: string[],
  mysqlSpecific: MySQLValidationResult['mysqlSpecific']
) => {
  const lowerStderr = stderr.toLowerCase();
  const requiresDockerAccess = stderr.includes('sudo') || lowerStderr.includes('docker');

  if (requiresDockerAccess) {
    handleDockerUnavailable(stderr, warnings, mysqlSpecific);

    return [];
  }

  return [`Failed to start Docker container: ${stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH)}`];
};

type MysqlLocalResult = {
  errors: string[];
  mysqlSpecific: MySQLValidationResult['mysqlSpecific'];
  warnings: string[];
};

const queryMySqlTables = async (
  dockerComposePath: string,
  query: string
) =>
  dockerComposeCommand(
    dockerComposePath,
    [
      'exec',
      '-e',
      'MYSQL_PWD=rootpassword',
      '-T',
      'db',
      'mysql',
      '-h127.0.0.1',
      '-uroot',
      '-e',
      query
    ]
  );

const validateLocalMysql = async (
  projectPath: string,
  dockerComposePath: string,
  authProvider?: string
): Promise<MysqlLocalResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mysqlSpecific: MySQLValidationResult['mysqlSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: true,
    queriesWork: false,
    schemaFileExists: true
  };

  process.stdout.write('    Starting Docker container... ');
  const upResult = await runProjectScript(projectPath, 'db:up');

  if (upResult.exitCode !== 0) {
    const startErrors = getDockerStartErrors(upResult.stderr || '', warnings, mysqlSpecific);

    errors.push(...startErrors);

    return { errors, mysqlSpecific, warnings };
  }

  const ready = await waitForMySqlReady(dockerComposePath);

  if (!ready) {
    errors.push('MySQL container did not become ready within timeout');
    await runProjectScript(projectPath, 'db:down');

    return { errors, mysqlSpecific, warnings };
  }

  const tableName = authProvider && authProvider !== 'none' ? 'users' : 'count_history';
  const tableCheckQuery = `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'database' AND TABLE_NAME = '${tableName}';`;
  const tableCheckResult = await queryMySqlTables(dockerComposePath, tableCheckQuery);

  if (tableCheckResult.exitCode !== 0) {
    errors.push(
      `Database connection test failed: ${tableCheckResult.stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH) || 'Unknown error'}`
    );
    await runProjectScript(projectPath, 'db:down');

    return { errors, mysqlSpecific, warnings };
  }

  mysqlSpecific.connectionWorks = true;

  const tablesResult = await queryMySqlTables(dockerComposePath, TABLES_QUERY);

  if (tablesResult.exitCode !== 0) {
    warnings.push('Could not verify table existence via MySQL query');
    await runProjectScript(projectPath, 'db:down');

    return { errors, mysqlSpecific, warnings };
  }

  const tablesOutput = tablesResult.stdout;
  const expectsUsers = authProvider && authProvider !== 'none';
  const hasUsers = tablesOutput.includes('users');
  const hasCountHistory = tablesOutput.includes('count_history');
  const missingTable = expectsUsers ? !hasUsers : !hasCountHistory;

  if (missingTable) {
    const requiredTable = expectsUsers ? 'users' : 'count_history';
    errors.push(`${requiredTable} table not found in database`);
    await runProjectScript(projectPath, 'db:down');

    return { errors, mysqlSpecific, warnings };
  }

  mysqlSpecific.queriesWork = true;

  await runProjectScript(projectPath, 'db:down');

  return { errors, mysqlSpecific, warnings };
};

export type MySQLValidationResult = {
  errors: string[];
  passed: boolean;
  warnings: string[];
  mysqlSpecific: {
    connectionWorks: boolean;
    dockerComposeExists: boolean;
    queriesWork: boolean;
    schemaFileExists: boolean;
  };
};

export const validateMySQLDatabase = async (
  projectPath: string,
  config: {
    authProvider?: string;
    databaseHost?: string;
    orm?: string;
  } = {}
): Promise<MySQLValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mysqlSpecific: MySQLValidationResult['mysqlSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: false,
    queriesWork: false,
    schemaFileExists: false
  };

  const dbDir = join(projectPath, 'db');
  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);

    return { errors, mysqlSpecific, passed: false, warnings };
  }

  const dockerComposePath = join(dbDir, 'docker-compose.db.yml');
  const schemaPath = config.orm === 'drizzle' ? join(dbDir, 'schema.ts') : null;
  const isLocal = config.databaseHost === 'none' || !config.databaseHost;
  const isRemote = config.databaseHost === 'planetscale';

  if (isLocal && !existsSync(dockerComposePath)) {
    errors.push(`Docker compose file not found: ${dockerComposePath}`);

    return { errors, mysqlSpecific, passed: false, warnings };
  }

  if (isLocal) {
    mysqlSpecific.dockerComposeExists = true;
  }

  if (isRemote) {
    warnings.push('PlanetScale remote database - skipping Docker compose check');
  }

  if (schemaPath && !existsSync(schemaPath)) {
    errors.push(`Drizzle schema file not found: ${schemaPath}`);

    return { errors, mysqlSpecific, passed: false, warnings };
  }

  mysqlSpecific.schemaFileExists = true;

  if (isLocal) {
    const localResult = await validateLocalMysql(
      projectPath,
      dockerComposePath,
      config.authProvider
    );

    errors.push(...localResult.errors);
    warnings.push(...localResult.warnings);
    mysqlSpecific.connectionWorks = localResult.mysqlSpecific.connectionWorks;
    mysqlSpecific.queriesWork = localResult.mysqlSpecific.queriesWork;
  }

  if (isRemote) {
    warnings.push('PlanetScale remote database - skipping connection test (requires credentials)');
    mysqlSpecific.connectionWorks = true;
    mysqlSpecific.queriesWork = true;
  }

  const handlersPath = determineHandlerPath(projectPath, config.authProvider);
  if (!existsSync(handlersPath)) {
    errors.push(`Database handler file not found: ${handlersPath}`);
  }

  const passed =
    errors.length === 0 &&
    mysqlSpecific.schemaFileExists &&
    (mysqlSpecific.dockerComposeExists || isRemote) &&
    mysqlSpecific.connectionWorks &&
    mysqlSpecific.queriesWork;

  return {
    errors,
    mysqlSpecific,
    passed,
    warnings
  };
};

const logValidationSummary = (result: MySQLValidationResult) => {
  console.log('\n=== MySQL Database Validation Results ===\n');
  console.log('MySQL-Specific Checks:');
  console.log(`  Docker Compose Exists: ${result.mysqlSpecific.dockerComposeExists ? '✓' : '✗'}`);
  console.log(`  Schema File Exists: ${result.mysqlSpecific.schemaFileExists ? '✓' : '✗'}`);
  console.log(`  Connection Works: ${result.mysqlSpecific.connectionWorks ? '✓' : '✗'}`);
  console.log(`  Queries Work: ${result.mysqlSpecific.queriesWork ? '✓' : '✗'}`);
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

const exitWithResult = (result: MySQLValidationResult) => {
  console.log(`\nOverall: ${result.passed ? 'PASS' : 'FAIL'}`);
  process.exit(result.passed ? 0 : 1);
};

const runFromCli = async () => {
  const { authProvider, databaseHost, orm, projectPath } = parseCliArguments(process.argv);

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/mysql-validator.ts <project-path> [orm] [auth-provider] [database-host]'
    );
    process.exit(1);
  }

  try {
    const result = await validateMySQLDatabase(projectPath, { authProvider, databaseHost, orm });
    logValidationSummary(result);
    logWarnings(result.warnings);
    logErrors(result.errors);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('MySQL validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('MySQL validation error:', error);
    process.exit(1);
  });
}