export type SuiteGroup = 'core' | 'framework' | 'database' | 'cloud' | 'auth';

export type FunctionalRunnerMetadata = {
  args?: string[];
  runnerType?: 'bun-run' | 'bun-test';
  script: string;
};

export type BehaviouralRunnerMetadata = {
  testFiles: string[];
};

export type SuiteDefinition = {
  databases?: string[];
  description: string;
  frameworks?: string[];
  group: SuiteGroup;
  label: string;
  name: string;
  providers?: string[];
  runners: {
    behavioural?: BehaviouralRunnerMetadata;
    functional: FunctionalRunnerMetadata;
  };
};

const normalise = (value: string) => value.toLowerCase();

export const SUITE_REGISTRY: SuiteDefinition[] = [
  {
    description: 'Runs dependency, build, and server validators sequentially.',
    group: 'core',
    label: 'Functional core',
    name: 'functional',
    runners: {
      functional: {
        args: ['absolutejs-project', 'bun'],
        script: 'scripts/functional-tests/functional-test-runner.ts'
      }
    }
  },
  {
    description: 'Validates the scaffolded server boots successfully.',
    group: 'core',
    label: 'Server validator',
    name: 'server',
    runners: {
      functional: {
        script: 'scripts/functional-tests/server-startup-validator.ts'
      }
    }
  },
  {
    description: 'Checks the build pipeline compiles without errors.',
    group: 'core',
    label: 'Build validator',
    name: 'build',
    runners: {
      functional: {
        script: 'scripts/functional-tests/build-validator.ts'
      }
    }
  },
  {
    description: 'Ensures dependency installation succeeds.',
    group: 'core',
    label: 'Dependency installer',
    name: 'deps',
    runners: {
      functional: {
        script: 'scripts/functional-tests/dependency-installer-tester.ts'
      }
    }
  },
  {
    description: 'Runs the full React matrix.',
    frameworks: ['react'],
    group: 'framework',
    label: 'React suite',
    name: 'react',
    runners: {
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/frameworks/react.test.ts'
      }
    }
  },
  {
    description: 'Runs the full Vue matrix.',
    frameworks: ['vue'],
    group: 'framework',
    label: 'Vue suite',
    name: 'vue',
    runners: {
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/frameworks/vue.test.ts'
      }
    }
  },
  {
    description: 'Runs the full Svelte matrix.',
    frameworks: ['svelte'],
    group: 'framework',
    label: 'Svelte suite',
    name: 'svelte',
    runners: {
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/frameworks/svelte.test.ts'
      }
    }
  },
  {
    description: 'Runs the HTML framework matrix.',
    frameworks: ['html'],
    group: 'framework',
    label: 'HTML suite',
    name: 'html',
    runners: {
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/frameworks/html.test.ts'
      }
    }
  },
  {
    description: 'Runs the HTMX framework matrix.',
    frameworks: ['htmx'],
    group: 'framework',
    label: 'HTMX suite',
    name: 'htmx',
    runners: {
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/frameworks/htmx.test.ts'
      }
    }
  },
  {
    databases: ['sqlite'],
    description: 'Runs SQLite database validations (local + Turso).',
    group: 'database',
    label: 'SQLite suite',
    name: 'sqlite',
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/database-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/databases/sqlite.test.ts'
      }
    }
  },
  {
    databases: ['postgresql'],
    description: 'Runs PostgreSQL database validations (Neon/local).',
    group: 'database',
    label: 'PostgreSQL suite',
    name: 'postgresql',
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/database-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/databases/postgresql.test.ts'
      }
    }
  },
  {
    databases: ['mysql'],
    description: 'Runs MySQL database validations (PlanetScale/local).',
    group: 'database',
    label: 'MySQL suite',
    name: 'mysql',
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/database-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/databases/mysql.test.ts'
      }
    }
  },
  {
    databases: ['mongodb'],
    description: 'Runs MongoDB database validations.',
    group: 'database',
    label: 'MongoDB suite',
    name: 'mongodb',
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/database-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/databases/mongodb.test.ts'
      }
    }
  },
  {
    description: 'Runs supported cloud provider combinations.',
    group: 'cloud',
    label: 'Cloud providers',
    name: 'cloud',
    providers: ['neon', 'turso'],
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/cloud-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/cloud.test.ts'
      }
    }
  },
  {
    description: 'Runs absoluteAuth matrix validations.',
    group: 'auth',
    label: 'Auth suite',
    name: 'auth',
    runners: {
      behavioural: {
        testFiles: ['tests/behavioural/auth-matrix.test.ts']
      },
      functional: {
        runnerType: 'bun-test',
        script: 'tests/functional/auth.test.ts'
      }
    }
  }
];

export const SUITE_MAP = new Map(
  SUITE_REGISTRY.map((definition) => [definition.name, definition])
);

const collectUnique = (selector: (suite: SuiteDefinition) => string[] | undefined) =>
  new Set(
    SUITE_REGISTRY.flatMap((suite) => selector(suite) ?? []).map(normalise)
  );

export const KNOWN_FRAMEWORKS = collectUnique((suite) => suite.frameworks);
export const KNOWN_DATABASES = collectUnique((suite) => suite.databases);
export const KNOWN_PROVIDERS = collectUnique((suite) => suite.providers);


