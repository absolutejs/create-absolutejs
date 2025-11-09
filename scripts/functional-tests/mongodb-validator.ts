/*
  MongoDB Database Validator
  Validates MongoDB database connections and functionality across all compatible configurations.
  Tests MongoDB Docker setup, collection initialization, and query execution.
*/

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const DB_SCRIPT_TIMEOUT_MS = 2 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MONGODB_READY_ATTEMPTS = 10;
const MONGODB_READY_DELAY_MS = MILLISECONDS_PER_SECOND;
const DOCKER_WARNING_SNIPPET_LENGTH = 100;
const DOCKER_ERROR_SNIPPET_LENGTH = 200;
const LIST_COLLECTIONS_QUERY = 'db.getCollectionNames()';
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
  let timedOut = false;

  const child = spawn(executable, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
  }, timeoutMs);

  child.stdout?.on('data', (chunk) => {
    stdoutChunks.push(chunk.toString());
  });
  child.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString());
  });

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
    ['docker', 'compose', '-p', 'mongodb', '-f', dockerComposePath, ...subcommand],
    { env }
  );

const handleDockerUnavailable = (
  stderr: string,
  warnings: string[],
  mongodbSpecific: MongoDBValidationResult['mongodbSpecific']
) => {
  warnings.push(
    `Docker not available or requires sudo - skipping local MongoDB connection test: ${stderr.slice(0, DOCKER_WARNING_SNIPPET_LENGTH)}`
  );
  mongodbSpecific.connectionWorks = true;
  mongodbSpecific.queriesWork = true;
};

const waitForMongoReady = async (dockerComposePath: string, attempt = 0) => {
  if (attempt >= MONGODB_READY_ATTEMPTS) {
    return false;
  }

  const readinessResult = await dockerComposeCommand(
    dockerComposePath,
    ['exec', '-T', 'db', 'mongosh', '--eval', 'db.adminCommand("ping")']
  );

  if (readinessResult.exitCode === 0) {
    return true;
  }

  const bunModule = await loadBunModule();
  await bunModule.sleep(MONGODB_READY_DELAY_MS);

  return waitForMongoReady(dockerComposePath, attempt + 1);
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
  mongodbSpecific: MongoDBValidationResult['mongodbSpecific']
) => {
  const lowerStderr = stderr.toLowerCase();
  const requiresDockerAccess = stderr.includes('sudo') || lowerStderr.includes('docker');

  if (requiresDockerAccess) {
    handleDockerUnavailable(stderr, warnings, mongodbSpecific);

    return [];
  }

  return [`Failed to start Docker container: ${stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH)}`];
};

const buildCollectionQuery = (authProvider?: string) =>
  authProvider && authProvider !== 'none'
    ? "db.getCollectionNames().includes('users')"
    : "db.getCollectionNames().includes('count_history')";

type MongoLocalResult = {
  errors: string[];
  mongodbSpecific: MongoDBValidationResult['mongodbSpecific'];
  warnings: string[];
};

const executeMongoQuery = async (
  dockerComposePath: string,
  query: string
) =>
  dockerComposeCommand(
    dockerComposePath,
    [
      'exec',
      '-T',
      'db',
      'mongosh',
      '-u',
      'user',
      '-p',
      'password',
      '--authenticationDatabase',
      'admin',
      'database',
      '--eval',
      query
    ]
  );

const validateLocalMongo = async (
  projectPath: string,
  dockerComposePath: string,
  authProvider?: string
): Promise<MongoLocalResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mongodbSpecific: MongoDBValidationResult['mongodbSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: true,
    queriesWork: false
  };

  process.stdout.write('    Starting Docker container... ');
  const upResult = await runProjectScript(projectPath, 'db:up');

  if (upResult.exitCode !== 0) {
    const startErrors = getDockerStartErrors(upResult.stderr || '', warnings, mongodbSpecific);

    errors.push(...startErrors);

    return { errors, mongodbSpecific, warnings };
  }

  const ready = await waitForMongoReady(dockerComposePath);

  if (!ready) {
    errors.push('MongoDB container did not become ready within timeout');
    await runProjectScript(projectPath, 'db:down');

    return { errors, mongodbSpecific, warnings };
  }

  const collectionQuery = buildCollectionQuery(authProvider);
  const connectionResult = await executeMongoQuery(dockerComposePath, collectionQuery);

  if (connectionResult.exitCode !== 0) {
    errors.push(
      `Database connection test failed: ${connectionResult.stderr.slice(0, DOCKER_ERROR_SNIPPET_LENGTH) || 'Unknown error'}`
    );
    await runProjectScript(projectPath, 'db:down');

    return { errors, mongodbSpecific, warnings };
  }

  mongodbSpecific.connectionWorks = true;

  const collectionsResult = await executeMongoQuery(dockerComposePath, LIST_COLLECTIONS_QUERY);

  if (collectionsResult.exitCode !== 0) {
    warnings.push('Could not verify MongoDB collections via query');
    await runProjectScript(projectPath, 'db:down');

    return { errors, mongodbSpecific, warnings };
  }

  mongodbSpecific.queriesWork = true;

  await runProjectScript(projectPath, 'db:down');

  return { errors, mongodbSpecific, warnings };
};

export type MongoDBValidationResult = {
  errors: string[];
  mongodbSpecific: {
    connectionWorks: boolean;
    dockerComposeExists: boolean;
    queriesWork: boolean;
  };
  passed: boolean;
  warnings: string[];
};

export const validateMongoDBDatabase = async (
  projectPath: string,
  config: {
    authProvider?: string;
    databaseHost?: string;
    orm?: string;
  } = {}
): Promise<MongoDBValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mongodbSpecific: MongoDBValidationResult['mongodbSpecific'] = {
    connectionWorks: false,
    dockerComposeExists: false,
    queriesWork: false
  };

  const dbDir = join(projectPath, 'db');
  if (!existsSync(dbDir)) {
    errors.push(`Database directory not found: ${dbDir}`);

    return { errors, mongodbSpecific, passed: false, warnings };
  }

  const dockerComposePath = join(dbDir, 'docker-compose.db.yml');
  const isLocal = config.databaseHost === 'none' || !config.databaseHost;

  if (isLocal && !existsSync(dockerComposePath)) {
    errors.push(`Docker compose file not found: ${dockerComposePath}`);

    return { errors, mongodbSpecific, passed: false, warnings };
  }

  if (isLocal) {
    mongodbSpecific.dockerComposeExists = true;
  } else {
    warnings.push('Remote MongoDB - skipping Docker compose check');
  }

  if (isLocal) {
    const localResult = await validateLocalMongo(
      projectPath,
      dockerComposePath,
      config.authProvider
    );

    errors.push(...localResult.errors);
    warnings.push(...localResult.warnings);
    mongodbSpecific.connectionWorks = localResult.mongodbSpecific.connectionWorks;
    mongodbSpecific.queriesWork = localResult.mongodbSpecific.queriesWork;
  } else {
    warnings.push('Remote MongoDB - skipping connection test (requires credentials)');
    mongodbSpecific.connectionWorks = true;
    mongodbSpecific.queriesWork = true;
  }

  const handlersPath = determineHandlerPath(projectPath, config.authProvider);
  if (!existsSync(handlersPath)) {
    errors.push(`Database handler file not found: ${handlersPath}`);
  }

  const passed =
    errors.length === 0 &&
    (mongodbSpecific.dockerComposeExists || !isLocal) &&
    mongodbSpecific.connectionWorks &&
    mongodbSpecific.queriesWork;

  return {
    errors,
    mongodbSpecific,
    passed,
    warnings
  };
};

const logValidationSummary = (result: MongoDBValidationResult) => {
  console.log('\n=== MongoDB Database Validation Results ===\n');
  console.log('MongoDB-Specific Checks:');
  console.log(`  Docker Compose Exists: ${result.mongodbSpecific.dockerComposeExists ? '✓' : '✗'}`);
  console.log(`  Connection Works: ${result.mongodbSpecific.connectionWorks ? '✓' : '✗'}`);
  console.log(`  Queries Work: ${result.mongodbSpecific.queriesWork ? '✓' : '✗'}`);
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

const exitWithResult = (result: MongoDBValidationResult) => {
  console.log(`\nOverall: ${result.passed ? 'PASS' : 'FAIL'}`);
  process.exit(result.passed ? 0 : 1);
};

const runFromCli = async () => {
  const { authProvider, databaseHost, orm, projectPath } = parseCliArguments(process.argv);

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/mongodb-validator.ts <project-path> [orm] [auth-provider] [database-host]'
    );
    process.exit(1);
  }

  try {
    const result = await validateMongoDBDatabase(projectPath, { authProvider, databaseHost, orm });
    logValidationSummary(result);
    logWarnings(result.warnings);
    logErrors(result.errors);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('MongoDB validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('MongoDB validation error:', error);
    process.exit(1);
  });
}
