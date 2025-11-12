import { describe, it } from 'bun:test';

import type { BehaviouralScenario, ScenarioHooks } from './utils';
import { runCountHistoryScenario } from './utils';

type Frontend = NonNullable<BehaviouralScenario['options']['frontend']>;
type Orm = NonNullable<BehaviouralScenario['options']['orm']>;
type DatabaseEngine = NonNullable<BehaviouralScenario['options']['database']>;

type ScenarioConfig = {
  frontend: Frontend;
  orm?: Orm;
  label?: string;
  options?: Partial<Omit<BehaviouralScenario['options'], 'database' | 'frontend' | 'orm'>>;
  labelSuffix?: string;
};

export type DatabaseMatrixDefinition = {
  database: DatabaseEngine;
  name: string;
  suiteLabel: string;
  baseOptions?: Partial<Omit<BehaviouralScenario['options'], 'database'>>;
  scenarios: readonly ScenarioConfig[];
  createHooks?: (label: string) => ScenarioHooks;
  timeoutMs?: number;
};

const capitalize = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const formatFrontendName = (frontend: Frontend) => {
  if (frontend === 'htmx') return 'HTMX';
  if (frontend === 'html') return 'HTML';

  return capitalize(frontend);
};

const buildScenario = (
  definition: DatabaseMatrixDefinition,
  config: ScenarioConfig
): BehaviouralScenario => {
  const { env: baseEnv = {}, ...baseRest } = definition.baseOptions ?? {};
  const { env: entryEnv = {}, ...entryRest } = config.options ?? {};

  const mergedEnv = { ...baseEnv, ...entryEnv } as Record<string, string>;
  const hasEnv = Object.keys(mergedEnv).length > 0;

  const options: BehaviouralScenario['options'] = {
    ...baseRest,
    ...entryRest,
    database: definition.database,
    frontend: config.frontend
  };

  if (config.orm) {
    options.orm = config.orm;
  }

  if (hasEnv) {
    options.env = mergedEnv;
  }

  const drizzleSuffix = config.orm === 'drizzle' ? ' (Drizzle)' : '';
  const extraSuffix = config.labelSuffix ? ` ${config.labelSuffix}` : '';
  const defaultLabel = `${formatFrontendName(config.frontend)} + ${
    definition.name
  }${drizzleSuffix}${extraSuffix}`;

  return {
    label: config.label ?? defaultLabel,
    options
  };
};

export const describeDatabaseMatrix = (definition: DatabaseMatrixDefinition) => {
  const filter = process.env.ABSOLUTE_BEHAVIOURAL_DATABASE_FILTER?.toLowerCase();
  if (filter && filter !== definition.name.toLowerCase()) {
    return;
  }

  const scenarios = definition.scenarios.map((scenario) =>
    buildScenario(definition, scenario)
  );
  const timeoutMs = definition.timeoutMs ?? 120_000;

  describe(definition.suiteLabel, () => {
    scenarios.forEach((scenario) => {
      it(
        `${scenario.label} creates and reads count history via REST API`,
        async () => {
          const hooks = definition.createHooks?.(scenario.label);
          await runCountHistoryScenario(scenario, hooks);
        },
        { timeout: timeoutMs }
      );
    });
  });
};

