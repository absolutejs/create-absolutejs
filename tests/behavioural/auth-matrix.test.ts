import { describe, it } from 'bun:test';

import {
  runAuthScenario,
  type BehaviouralScenario
} from './utils';

const AUTH_SCENARIOS: readonly BehaviouralScenario[] = [
  {
    label: 'React + SQLite + AbsoluteAuth',
    options: {
      auth: 'absoluteAuth',
      database: 'sqlite',
      databaseHost: 'none',
      frontend: 'react'
    } as const
  },
  {
    label: 'React + SQLite + AbsoluteAuth (Drizzle)',
    options: {
      auth: 'absoluteAuth',
      database: 'sqlite',
      databaseHost: 'none',
      frontend: 'react',
      orm: 'drizzle'
    } as const
  }
] as const;

describe('AbsoluteAuth behavioural matrix', () => {
  const TEST_TIMEOUT_MS = 120_000;

  AUTH_SCENARIOS.forEach((scenario) => {
    it(
      `${scenario.label} exposes auth endpoints`,
      async () => {
        await runAuthScenario(scenario);
      },
      { timeout: TEST_TIMEOUT_MS }
    );
  });
});

