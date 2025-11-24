import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  cleanupProject,
  installDependencies,
  runCommand,
  scaffoldProject,
  startServer,
  type RunningServer
} from '../harness';

export type BehaviouralScenario = {
  label: string;
  options: Parameters<typeof scaffoldProject>[0];
};

export type ScenarioHooks = {
  beforeServerStart?: (
    projectPath: string,
    scenario: BehaviouralScenario
  ) => Promise<void>;
  afterServerStop?: (
    projectPath: string,
    scenario: BehaviouralScenario
  ) => Promise<void>;
};

const DEFAULT_SERVER_PORT = 3000;
export const COUNT_ENDPOINT = `http://localhost:${DEFAULT_SERVER_PORT}/count`;
export const ROOT_READY_URL = `http://localhost:${DEFAULT_SERVER_PORT}/`;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_OK = 200;
export const HTTP_UNAUTHORIZED = 401;
export const TEST_COUNT = 7;
export const AUTH_PROVIDERS_ENDPOINT =
  'http://localhost:3000/auth/providers';
export const AUTH_SESSION_ENDPOINT = 'http://localhost:3000/auth/session';

export const installDependenciesOrThrow = async (
  projectPath: string,
  scenario: BehaviouralScenario
) => {
  await installDependencies(projectPath, scenario.options).catch((error) => {
    cleanupProject(projectPath);
    throw error;
  });

  if (process.env.ABSOLUTE_TEST_VERBOSE !== '1') {
    return;
  }

  const envPath = join(projectPath, '.env');
  const contents = await readFile(envPath, 'utf8').catch(() => null);

  if (!contents) {
    console.warn(`No .env file found for ${scenario.label}`);

    return;
  }

  console.log(`Loaded env for ${scenario.label}:\n${contents}`);
};

const ensureStatus = async (
  response: Response,
  expected: number,
  label: string
) => {
  if (response.status === expected) return;

  let body = '';

  try {
    body = await response.text();
  } catch {
    // Ignore body parsing errors for diagnostics.
  }

  const details = body.length > 0 ? ` (${body})` : '';

  throw new Error(`Expected ${expected} from ${label}${details}`);
};

const extractUid = (payload: Record<string, unknown>) => {
  const uid = payload.uid as number | undefined;

  if (typeof uid !== 'number' || uid <= 0) {
    console.error('createCount payload', payload);
    throw new Error('API did not return a numeric uid');
  }

  return uid;
};

const ensureCountMatch = (payload: Record<string, unknown>) => {
  if (payload.count !== TEST_COUNT)
    throw new Error(
      `API returned count ${String(payload.count)} instead of ${TEST_COUNT}`
    );
};

const assertHistoryPayload = (
  payload: Record<string, unknown>,
  uid: number
) => {
  if (payload.uid !== uid) throw new Error('History UID mismatch');
  if (payload.count !== TEST_COUNT) throw new Error('History count mismatch');
};

const DATABASE_ENV_KEYS: Record<string, readonly string[]> = {
  cockroachdb: [
    'DATABASE_URL',
    'PGDATABASE',
    'PGHOST',
    'PGPASSWORD',
    'PGPORT',
    'PGUSER',
    'PGSSLMODE'
  ],
  gel: ['DATABASE_URL'],
  mariadb: ['DATABASE_URL', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD'],
  mongodb: [
    'DATABASE_URL',
    'MONGODB_URL',
    'MONGODB_USER',
    'MONGODB_PASSWORD',
    'MONGODB_AUTH_DB'
  ],
  mssql: ['DATABASE_URL'],
  mysql: ['DATABASE_URL', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD'],
  postgresql: [
    'DATABASE_URL',
    'PGDATABASE',
    'PGHOST',
    'PGPASSWORD',
    'PGPORT',
    'PGUSER',
    'PGSSLMODE'
  ],
  singlestore: ['DATABASE_URL', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD'],
  sqlite: ['DATABASE_URL']
} as const;

const ALL_DATABASE_ENV_KEYS = new Set<string>(
  Object.values(DATABASE_ENV_KEYS).flatMap((keys) => keys)
);

const resolveSuiteKey = (scenario: BehaviouralScenario) => {
  const {database} = scenario.options;

  if (database && database !== 'none') {
    return database;
  }

  return 'default';
};

const buildChildEnv = (
  scenario: BehaviouralScenario,
  overrides: Record<string, string | undefined>
) => {
  const suiteKey = resolveSuiteKey(scenario);
  const allowedKeys = new Set<string>(DATABASE_ENV_KEYS[suiteKey] ?? ['DATABASE_URL']);
  const env: Record<string, string | undefined> = { ...process.env };

  ALL_DATABASE_ENV_KEYS.forEach((key) => {
    if (!allowedKeys.has(key)) {
      delete env[key];
    }
  });

  allowedKeys.forEach((key) => {
    if (!(key in overrides)) {
      delete env[key];
    }
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  });

  env.ABSOLUTE_BEHAVIOURAL_SUITE = suiteKey;

  if (process.env.ABSOLUTE_TEST_VERBOSE === '1') {
    const snapshot: Record<string, string | undefined> = {};
    const interestingKeys = [
      'DATABASE_URL',
      'MONGODB_URL',
      'MONGODB_USER',
      'MONGODB_PASSWORD',
      'MONGODB_AUTH_DB',
      'PGDATABASE',
      'PGHOST',
      'PGPASSWORD',
      'PGPORT',
      'PGUSER',
      'PGSSLMODE',
      'MYSQL_HOST',
      'MYSQL_PORT',
      'MYSQL_USER',
      'MYSQL_PASSWORD'
    ];

    interestingKeys.forEach((key) => {
      if (key in env) {
        snapshot[key] = env[key];
      }
    });

    console.log(
      `Child env for ${scenario.label} (${suiteKey}): ${JSON.stringify(snapshot)}`
    );
  }

  return env;
};

const ensurePortAvailable = async (port: number, scenarioLabel: string) => {
  if (process.platform === 'win32') {
    return;
  }

  const lookup = await runCommand(['lsof', '-ti', `tcp:${port}`], {
    label: `${scenarioLabel} port scan`
  }).catch(() => null);

  if (!lookup || lookup.exitCode !== 0 || lookup.stdout.length === 0) {
    return;
  }

  const pids = lookup.stdout
    .split('\n')
    .map((pid) => pid.trim())
    .filter((pid) => pid.length > 0);

  if (pids.length === 0) {
    return;
  }

  await Promise.all(
    pids.map((pid) =>
      runCommand(['kill', '-9', pid], {
        label: `${scenarioLabel} kill ${pid}`
      }).catch(() => undefined)
    )
  );

  if (process.env.ABSOLUTE_TEST_VERBOSE === '1') {
    console.log(`Freed port ${port} by terminating processes: ${pids.join(', ')}`);
  }
};

export const runCountHistoryScenario = async (
  scenario: BehaviouralScenario,
  hooks: ScenarioHooks = {}
) => {
  const scaffoldResult = await scaffoldProject(scenario.options).catch((error) => {
    const { message } = error as Error;

    if (
      message.includes('docker compose') ||
      message.includes('Operation not permitted')
    ) {
      console.warn(
        `Skipping behavioural flow (${scenario.label}): Docker daemon not available.`
      );

      return null;
    }

    throw error;
  });

  if (!scaffoldResult) {
    return;
  }

  const { projectPath } = scaffoldResult;

  await installDependenciesOrThrow(projectPath, scenario);

  const scenarioEnvOverrides: Record<string, string | undefined> = {
    ...(scenario.options.env ?? {})
  };

  try {
    const envPath = join(projectPath, '.env');
    const contents = await readFile(envPath, 'utf8');
    contents
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .forEach((line) => {
        const equalsIndex = line.indexOf('=');
        if (equalsIndex <= 0) return;

        const key = line.slice(0, equalsIndex).trim();
        const value = line.slice(equalsIndex + 1);

        if (key.length === 0 || value === undefined) return;
        if (!(key in scenarioEnvOverrides)) {
          scenarioEnvOverrides[key] = value;
        }
      });
  } catch {
    // Ignore missing .env files; rely on existing overrides.
  }

  const RESET_ENV_KEYS = [
    'DATABASE_URL',
    'MONGODB_URL',
    'MONGODB_USER',
    'MONGODB_PASSWORD',
    'MONGODB_AUTH_DB',
    'PGDATABASE',
    'PGHOST',
    'PGPASSWORD',
    'PGPORT',
    'PGUSER',
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD'
  ] as const;

  RESET_ENV_KEYS.forEach((key) => {
    if (key in scenarioEnvOverrides) {
      return;
    }

    if (process.env[key] !== undefined) {
      scenarioEnvOverrides[key] = undefined;
    }
  });

  if (process.env.ABSOLUTE_TEST_VERBOSE === '1') {
    console.log(
      `Effective env for ${scenario.label}: ${JSON.stringify(scenarioEnvOverrides)}`
    );
  }

  const originalEnv: Record<string, string | undefined> = {};

  const applyScenarioEnv = () => {
    const suiteKey = resolveSuiteKey(scenario);
    const allowedKeys = new Set<string>(DATABASE_ENV_KEYS[suiteKey] ?? ['DATABASE_URL']);
    originalEnv.ABSOLUTE_BEHAVIOURAL_SUITE = process.env.ABSOLUTE_BEHAVIOURAL_SUITE;
    process.env.ABSOLUTE_BEHAVIOURAL_SUITE = suiteKey;

    ALL_DATABASE_ENV_KEYS.forEach((key) => {
      if (!allowedKeys.has(key)) {
        originalEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    allowedKeys.forEach((key) => {
      if (!(key in scenarioEnvOverrides)) {
        originalEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    Object.entries(scenarioEnvOverrides).forEach(([key, value]) => {
      originalEnv[key] = process.env[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  const restoreEnv = () => {
    if (originalEnv.ABSOLUTE_BEHAVIOURAL_SUITE === undefined) {
      delete process.env.ABSOLUTE_BEHAVIOURAL_SUITE;
    } else {
      process.env.ABSOLUTE_BEHAVIOURAL_SUITE = originalEnv.ABSOLUTE_BEHAVIOURAL_SUITE;
    }

    Object.entries(originalEnv).forEach(([key, value]) => {
      if (key === 'ABSOLUTE_BEHAVIOURAL_SUITE') {
        return;
      }

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  applyScenarioEnv();

  const stopServer = async (serverInstance: RunningServer | undefined) => {
    if (!serverInstance) {
      return;
    }

    try {
      await serverInstance.stop();
    } catch {
      // Ignore shutdown errors to surface the original failure, if any.
    }
  };

  const runAfterHook = async () => {
    if (!hooks.afterServerStop) {
      return;
    }

    try {
      await hooks.afterServerStop(projectPath, scenario);
    } catch {
      // Ignore teardown errors; cleanup continues regardless.
    }
  };

  const runBeforeHook = async () => {
    if (!hooks.beforeServerStart) {
      return;
    }

    if (scenario.options.env) {
      console.log(
        `Applying scenario env overrides for ${scenario.label}: ${JSON.stringify(
          scenario.options.env
        )}`
      );
    }

    await hooks.beforeServerStart(projectPath, scenario);
  };

  let server: RunningServer | undefined;

  const finalize = async () => {
    await stopServer(server);
    await runAfterHook();
    if (process.env.ABSOLUTE_TEST_KEEP !== '1') {
      cleanupProject(projectPath);
    }
    restoreEnv();
  };

  await ensurePortAvailable(DEFAULT_SERVER_PORT, scenario.label);
  await runBeforeHook();
  try {
    server = await startServer(projectPath, {
      command: ['bun', 'run', 'src/backend/server.ts'],
      env: buildChildEnv(scenario, scenarioEnvOverrides),
      readyTimeoutMs: 30_000,
      readyUrl: ROOT_READY_URL
    });

    const createResponse = await fetch(COUNT_ENDPOINT, {
      body: JSON.stringify({ count: TEST_COUNT }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    await ensureStatus(createResponse, HTTP_OK, 'POST /count');

    const created = (await createResponse.json()) as Record<string, unknown>;
    const uid = extractUid(created);
    ensureCountMatch(created);

    const readResponse = await fetch(`${COUNT_ENDPOINT}/${uid}`);
    await ensureStatus(readResponse, HTTP_OK, 'GET /count/:uid');

    const history = (await readResponse.json()) as Record<string, unknown>;
    assertHistoryPayload(history, uid);
  } finally {
    await finalize();
  }
};

const ensureJson = async (response: Response) => {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from ${response.url}: ${(error as Error).message}`
    );
  }
};

export const runAuthScenario = async (
  scenario: BehaviouralScenario,
  hooks: ScenarioHooks = {}
) => {
  const scaffoldResult = await scaffoldProject(scenario.options).catch((error) => {
    const { message } = error as Error;

    if (
      message.includes('docker compose') ||
      message.includes('Operation not permitted')
    ) {
      console.warn(
        `Skipping behavioural flow (${scenario.label}): Docker daemon not available.`
      );

      return null;
    }

    throw error;
  });

  if (!scaffoldResult) {
    return;
  }

  const { projectPath } = scaffoldResult;

  await installDependenciesOrThrow(projectPath, scenario);

  const stopServer = async (serverInstance: RunningServer | undefined) => {
    if (!serverInstance) {
      return;
    }

    try {
      await serverInstance.stop();
    } catch {
      // Ignore shutdown errors to surface the original failure, if any.
    }
  };

  const runAfterHook = async () => {
    if (!hooks.afterServerStop) {
      return;
    }

    try {
      await hooks.afterServerStop(projectPath, scenario);
    } catch {
      // Ignore teardown errors; cleanup continues regardless.
    }
  };

  const runBeforeHook = async () => {
    if (!hooks.beforeServerStart) {
      return;
    }

    await hooks.beforeServerStart(projectPath, scenario);
  };

  let server: RunningServer | undefined;
  await runBeforeHook();
  try {
    server = await startServer(projectPath, {
      command: ['bun', 'run', 'src/backend/server.ts'],
      env: scenario.options.env,
      readyTimeoutMs: 30_000,
      readyUrl: ROOT_READY_URL
    });

    const providersResponse = await fetch(AUTH_PROVIDERS_ENDPOINT);
    await ensureStatus(providersResponse, HTTP_OK, 'GET /auth/providers');
    const providers = await ensureJson(providersResponse);

    if (!Array.isArray(providers)) {
      throw new Error('Expected provider list to be an array');
    }

    const sessionResponse = await fetch(AUTH_SESSION_ENDPOINT, {
      method: 'POST'
    });

    // Without credentials this should indicate unauthorized access.
    if (
      sessionResponse.status !== HTTP_UNAUTHORIZED &&
      sessionResponse.status !== HTTP_BAD_REQUEST
    ) {
      throw new Error(
        `Expected ${HTTP_BAD_REQUEST} or ${HTTP_UNAUTHORIZED} from POST /auth/session without credentials, got ${sessionResponse.status}`
      );
    }
  } finally {
    await stopServer(server);
    await runAfterHook();
    cleanupProject(projectPath);
  }
};

