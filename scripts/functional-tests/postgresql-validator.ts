/*
  PostgreSQL Database Validator
  Validates PostgreSQL database connections and functionality across all compatible configurations.
  Tests PostgreSQL Docker setup, schema initialization, and query execution.
*/

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  countHistoryTables,
  initTemplates,
  userTables
} from '../../src/generators/db/dockerInitTemplates';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const DB_SCRIPT_TIMEOUT_MS = 2 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const POSTGRES_READY_ATTEMPTS = 10;
const POSTGRES_READY_DELAY_MS = MILLISECONDS_PER_SECOND;
const DOCKER_WARNING_SNIPPET_LENGTH = 100;
const DOCKER_ERROR_SNIPPET_LENGTH = 200;
const READY_QUERY = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';";
const FORCE_KILL_DELAY_MS = 1_000;
const DOCKER_PROJECT_NAME = 'postgresql';
const DOCKER_CACHE_DIR = join(process.cwd(), '.test-dependency-cache', 'docker', DOCKER_PROJECT_NAME);
const DOCKER_COMPOSE_FILENAME = 'docker-compose.db.yml';

let cachedBunModule: typeof import('bun') | null = null;

const loadBunModule = async () => {
  if (cachedBunModule === null) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
  failedToSpawn?: boolean;
  timedOut?: boolean;
};

const runCommand = async (
  command: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<CommandResult> => {
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
      failedToSpawn: true,
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

  return {
    exitCode: code ?? -1,
    stderr: timedOut ? 'Process timed out' : stderrChunks.join('').trim(),
    stdout: stdoutChunks.join('').trim(),
    timedOut
  };
};

const getSchemaPath = (dbDir: string, orm?: string) =>
  orm === 'drizzle' ? join(dbDir, 'schema.ts') : null;

const determineHandlerPath = (projectPath: string, authProvider?: string) => {
  const handlersDir = join(projectPath, 'src', 'backend', 'handlers');

  return authProvider && authProvider !== 'none'
    ? join(handlersDir, 'userHandlers.ts')
    : join(handlersDir, 'countHistoryHandlers.ts');
};

const dockerComposeCommand = (
  dockerComposePath: string,
  subcommand: string[],
  env?: Record<string, string>
) =>
  runCommand(
    ['docker', 'compose', '-p', 'postgresql', '-f', dockerComposePath, ...subcommand],
    { env }
  );

const handleDockerUnavailable = (stderr: string, warnings: string[]) => {
  warnings.push(
    `Docker not available or requires elevated permissions; local PostgreSQL connection tests were skipped: ${stderr.slice(0, DOCKER_WARNING_SNIPPET_LENGTH)}`
  );
};

const getDockerStartErrors = (stderr: string, warnings: string[]) => {
  const lowerStderr = stderr.toLowerCase();
  const requiresDockerAccess = stderr.includes('sudo') || lowerStderr.includes('docker');

  if (requiresDockerAccess) {
    handleDockerUnavailable(stderr, warnings);

    return [];
  }

  return [`Failed to start Docker container: ${stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH)}`];
};

const waitForPostgresReady = async (dockerComposePath: string, attempt = 0) => {
  if (attempt >= POSTGRES_READY_ATTEMPTS) {
    return false;
  }

  const readyResult = await dockerComposeCommand(
    dockerComposePath,
    ['exec', '-T', 'db', 'pg_isready', '-U', 'user', '-h', 'localhost']
  );

  if (readyResult.exitCode === 0) {
    return true;
  }

  const bunModule = await loadBunModule();
  await bunModule.sleep(POSTGRES_READY_DELAY_MS);

  return waitForPostgresReady(dockerComposePath, attempt + 1);
};

type PostgresLocalResult = {
  errors: string[];
  postgresqlSpecific: PostgreSQLValidationResult['postgresqlSpecific'];
  warnings: string[];
};

type DockerState = {
  active: boolean;
  composePath: string;
};

const dockerState: DockerState = {
  active: false,
  composePath: ''
};

const ensureSharedComposeFile = (sourceComposePath: string) => {
  const targetDir = DOCKER_CACHE_DIR;
  const targetPath = join(targetDir, DOCKER_COMPOSE_FILENAME);

  if (!existsSync(targetPath)) {
    mkdirSync(targetDir, { recursive: true });
    copyFileSync(sourceComposePath, targetPath);
  }

  dockerState.composePath = targetPath;

  return targetPath;
};

const isContainerRunning = async (composePath: string) => {
  const result = await dockerComposeCommand(
    composePath,
    ['ps', '--status', 'running', '--services']
  );

  if (result.exitCode !== 0) {
    return false;
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line === 'db');
};

const runPostgresSeedScripts = async (
  seeds: readonly string[],
  executeSeed: (seed: string) => Promise<CommandResult>,
  errors: string[]
) => {
  let resultPromise = Promise.resolve(true);

  seeds.forEach((seed) => {
    resultPromise = resultPromise.then(async (previousSucceeded) => {
      if (!previousSucceeded) {
        return false;
      }

      const seedResult = await executeSeed(seed);

      if (seedResult.exitCode !== 0) {
        errors.push(
          `Failed to initialise PostgreSQL schema: ${seedResult.stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH) || 'Unknown error'}`
        );

        return false;
      }

      return true;
    });
  });

  return resultPromise;
};

const startDockerContainer = async (
  composePath: string,
  _authProvider: string | undefined,
  warnings: string[],
  postgresqlSpecific: PostgreSQLValidationResult['postgresqlSpecific'],
  errors: string[]
) => {
  const upResult = await dockerComposeCommand(composePath, ['up', '-d', 'db']);

  if (upResult.exitCode !== 0) {
    const startErrors = getDockerStartErrors(upResult.stderr || '', warnings);

    errors.push(...startErrors);

    return false;
  }

  const { wait, cli } = initTemplates.postgresql;

  const seeds = [userTables.postgresql, countHistoryTables.postgresql] as const;

  const executeSeed = async (seed: string) =>
    dockerComposeCommand(composePath, [
      'exec',
      '-T',
      'db',
      'bash',
      '-lc',
      `${wait} && ${cli} "${seed}"`
    ]);

  const seeded = await runPostgresSeedScripts(seeds, executeSeed, errors);

  if (!seeded) {
    await dockerComposeCommand(composePath, ['down']).catch(() => undefined);

    return false;
  }

  return true;
};

const stopManagedPostgresContainerInternal = async () => {
  const { composePath } = dockerState;

  if (!composePath) {
    dockerState.active = false;
    dockerState.composePath = '';

    return;
  }

  dockerState.active = false;
  dockerState.composePath = '';

  await dockerComposeCommand(composePath, ['down']).catch(() => undefined);
};

export const stopManagedPostgresDocker = async () => {
  await stopManagedPostgresContainerInternal().catch(() => undefined);
};

export const isPostgresDockerManaged = () => dockerState.active;

const runPostgresQuery = async (
  dockerComposePath: string,
  query: string
) =>
  dockerComposeCommand(
    dockerComposePath,
    ['exec', '-T', 'db', 'psql', '-U', 'user', '-d', 'database', '-c', query],
    { PGPASSWORD: 'password' }
  );

const validateLocalPostgres = async (
  _projectPath: string,
  dockerComposePath: string,
  authProvider?: string
): Promise<PostgresLocalResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const postgresqlSpecific: PostgreSQLValidationResult['postgresqlSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: true,
    queriesWork: false,
    schemaFileExists: true
  };

  const sharedComposePath = ensureSharedComposeFile(dockerComposePath);
  let usingExistingContainer = dockerState.active;

  if (usingExistingContainer && !(await isContainerRunning(sharedComposePath))) {
    dockerState.active = false;
    usingExistingContainer = false;
  }

  const startLabel = usingExistingContainer ? 'Reusing' : 'Starting';

  process.stdout.write(`    ${startLabel} Docker container... `);
  const startTime = Date.now();

  if (
    !usingExistingContainer &&
    !(await startDockerContainer(sharedComposePath, authProvider, warnings, postgresqlSpecific, errors))
  ) {
    console.log('✗');

    return { errors, postgresqlSpecific, warnings };
  }

  const ready = await waitForPostgresReady(sharedComposePath);

  if (!ready) {
    errors.push('PostgreSQL container did not become ready within timeout');
    console.log('✗');

    const stopAction = usingExistingContainer
      ? stopManagedPostgresContainerInternal
      : async () => {
          await dockerComposeCommand(sharedComposePath, ['down']).catch(() => undefined);
        };

    await stopAction().catch(() => undefined);

    return { errors, postgresqlSpecific, warnings };
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`✓ (${elapsedMs}ms)`);

  const connectionResult = await runPostgresQuery(sharedComposePath, READY_QUERY);

  if (connectionResult.exitCode !== 0) {
    errors.push(
      `Database connection test failed: ${connectionResult.stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH) || 'Unknown error'}`
    );
    await stopManagedPostgresContainerInternal().catch(() => undefined);

    return { errors, postgresqlSpecific, warnings };
  }

  postgresqlSpecific.connectionWorks = true;
  dockerState.active = true;

  const tablesOutput = connectionResult.stdout;
  const expectsUsers = authProvider && authProvider !== 'none';
  const hasUsers = tablesOutput.includes('users');
  const hasCountHistory = tablesOutput.includes('count_history');
  const missingTable = expectsUsers ? !hasUsers : !hasCountHistory;

  if (missingTable) {
    const requiredTable = expectsUsers ? 'users' : 'count_history';
    errors.push(`${requiredTable} table not found in database`);
  } else {
    postgresqlSpecific.queriesWork = true;
  }

  return { errors, postgresqlSpecific, warnings };
};

export type PostgreSQLValidationResult = {
  errors: string[];
  passed: boolean;
  postgresqlSpecific: {
    connectionWorks: boolean;
    dockerComposeExists: boolean;
    queriesWork: boolean;
    schemaFileExists: boolean;
  };
  warnings: string[];
};

export const validatePostgreSQLDatabase = async (
  projectPath: string,
  config: {
    authProvider?: string;
    databaseHost?: string;
    orm?: string;
  } = {}
): Promise<PostgreSQLValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const postgresqlSpecific: PostgreSQLValidationResult['postgresqlSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: false,
    queriesWork: false,
    schemaFileExists: false
  };

  const dbDir = join(projectPath, 'db');
  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);

    return { errors, passed: false, postgresqlSpecific, warnings };
  }

  const dockerComposePath = join(dbDir, 'docker-compose.db.yml');
  const schemaPath = getSchemaPath(dbDir, config.orm);

  const isLocal = config.databaseHost === 'none' || !config.databaseHost;
  const isNeon = config.databaseHost === 'neon';

  if (isLocal && !existsSync(dockerComposePath)) {
    errors.push(`Docker compose file not found: ${dockerComposePath}`);

    return { errors, passed: false, postgresqlSpecific, warnings };
  }

  if (isLocal) {
    postgresqlSpecific.dockerComposeExists = true;
  }

  if (isNeon) {
    warnings.push('Neon remote database - skipping Docker compose check');
  }

  if (schemaPath && !existsSync(schemaPath)) {
    errors.push(`Drizzle schema file not found: ${schemaPath}`);

    return { errors, passed: false, postgresqlSpecific, warnings };
  }

  postgresqlSpecific.schemaFileExists = true;

  if (isLocal) {
    const localResult = await validateLocalPostgres(
      projectPath,
      dockerComposePath,
      config.authProvider
    );

    errors.push(...localResult.errors);
    warnings.push(...localResult.warnings);
    postgresqlSpecific.connectionWorks = localResult.postgresqlSpecific.connectionWorks;
    postgresqlSpecific.queriesWork = localResult.postgresqlSpecific.queriesWork;
  }

  if (isNeon) {
    warnings.push('Neon remote database - skipping connection test (requires credentials)');
    postgresqlSpecific.connectionWorks = true;
    postgresqlSpecific.queriesWork = true;
  }

  const handlersPath = determineHandlerPath(projectPath, config.authProvider);
  if (!existsSync(handlersPath)) {
    errors.push(`Database handler file not found: ${handlersPath}`);
  }

  const passed =
    errors.length === 0 &&
    postgresqlSpecific.schemaFileExists &&
    (postgresqlSpecific.dockerComposeExists || config.databaseHost === 'neon') &&
    postgresqlSpecific.connectionWorks &&
    postgresqlSpecific.queriesWork;

  return { errors, passed, postgresqlSpecific, warnings };
};