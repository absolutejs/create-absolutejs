import { describe, it } from 'bun:test';

import {
  runCountHistoryScenario,
  type BehaviouralScenario
} from './utils';

type CloudScenarioDefinition = {
  label: string;
  options: BehaviouralScenario['options'];
  requiredEnv: Array<{ source: string; target: string }>;
};

const CLOUD_SCENARIOS: readonly CloudScenarioDefinition[] = [
  {
    label: 'React + PostgreSQL (Neon) + Drizzle',
    options: {
      auth: 'none',
      database: 'postgresql',
      databaseHost: 'neon',
      frontend: 'react',
      orm: 'drizzle'
    } as const,
    requiredEnv: [
      { source: 'ABSOLUTE_BEHAVIOURAL_NEON_DATABASE_URL', target: 'DATABASE_URL' }
    ]
  },
  {
    label: 'React + SQLite (Turso) + Drizzle',
    options: {
      auth: 'none',
      database: 'sqlite',
      databaseHost: 'turso',
      frontend: 'react',
      orm: 'drizzle'
    } as const,
    requiredEnv: [
      { source: 'ABSOLUTE_BEHAVIOURAL_TURSO_DATABASE_URL', target: 'DATABASE_URL' }
    ]
  }
] as const;

const resolveScenario = (
  definition: CloudScenarioDefinition
): BehaviouralScenario | null => {
  const missing = definition.requiredEnv.filter(
    ({ source }) => !process.env[source]
  );

  if (missing.length > 0) {
    const missingList = missing.map(({ source }) => source).join(', ');
    console.warn(
      `Skipping behavioural flow (${definition.label}): missing required environment variables (${missingList}).`
    );

    return null;
  }

  const env: Record<string, string | undefined> = {};
  definition.requiredEnv.forEach(({ source, target }) => {
    env[target] = process.env[source];
  });

  return {
    label: definition.label,
    options: {
      ...definition.options,
      env
    }
  };
};

describe('Cloud database behavioural matrix', () => {
  const TEST_TIMEOUT_MS = 180_000;

  CLOUD_SCENARIOS.forEach((definition) => {
    it(
      `${definition.label} creates and reads count history via REST API`,
      async () => {
        const scenario = resolveScenario(definition);
        if (!scenario) {
          return;
        }

        await runCountHistoryScenario(scenario);
      },
      { timeout: TEST_TIMEOUT_MS }
    );
  });
});

