import type { DatabaseMatrixDefinition } from './database-matrix';
import {
  createMongoHooks,
  createMysqlHooks,
  createPostgresHooks
} from './database-hooks';

const POSTGRES_ENV = {
  DATABASE_URL: 'postgresql://user:password@127.0.0.1:5433/database',
  PGDATABASE: 'database',
  PGHOST: '127.0.0.1',
  PGPASSWORD: 'password',
  PGPORT: '5433',
  PGUSER: 'user'
} as const;

export const DATABASE_MATRIX_DEFINITIONS: readonly DatabaseMatrixDefinition[] = [
  {
    database: 'postgresql',
    name: 'PostgreSQL',
    suiteLabel: 'PostgreSQL behavioural matrix',
    baseOptions: {
      databaseHost: 'none',
      env: { ...POSTGRES_ENV }
    },
    createHooks: createPostgresHooks,
    scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ]
  },
  {
    database: 'mysql',
    name: 'MySQL',
    suiteLabel: 'MySQL behavioural matrix',
    baseOptions: {
      databaseHost: 'none'
    },
    createHooks: createMysqlHooks,
    scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ]
  },
  {
    database: 'mongodb',
    name: 'MongoDB',
    suiteLabel: 'MongoDB behavioural matrix',
    createHooks: createMongoHooks,
    scenarios: [
      { frontend: 'react' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ]
  },
  {
    database: 'sqlite',
    name: 'SQLite',
    suiteLabel: 'SQLite behavioural matrix',
    scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ]
  }
] as const;

