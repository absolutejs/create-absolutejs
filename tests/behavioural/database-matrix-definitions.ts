import {
  createMongoHooks,
  createMysqlHooks,
  createPostgresHooks
} from './database-hooks';
import type { DatabaseMatrixDefinition } from './database-matrix';

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
    baseOptions: {
      databaseHost: 'none',
      env: { ...POSTGRES_ENV }
    }, createHooks: createPostgresHooks, database: 'postgresql', name: 'PostgreSQL', scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ], suiteLabel: 'PostgreSQL behavioural matrix'
  },
  {
    baseOptions: {
      databaseHost: 'none'
    }, createHooks: createMysqlHooks, database: 'mysql', name: 'MySQL', scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ], suiteLabel: 'MySQL behavioural matrix'
  },
  {
    createHooks: createMongoHooks, database: 'mongodb', name: 'MongoDB', scenarios: [
      { frontend: 'react' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ], suiteLabel: 'MongoDB behavioural matrix'
  },
  {
    database: 'sqlite', name: 'SQLite', scenarios: [
      { frontend: 'react' },
      { frontend: 'react', orm: 'drizzle' },
      { frontend: 'vue' },
      { frontend: 'svelte' },
      { frontend: 'html' },
      { frontend: 'htmx' }
    ], suiteLabel: 'SQLite behavioural matrix'
  }
] as const;

