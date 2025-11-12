import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTENDS = ['react', 'html', 'svelte', 'vue', 'htmx'] as const;
const DATABASE_ENGINES = [
  'postgresql',
  'mysql',
  'sqlite',
  'mongodb',
  'mariadb',
  'gel',
  'singlestore',
  'cockroachdb',
  'mssql',
  'none'
] as const;
const ORMS = ['drizzle', 'none'] as const;
const DATABASE_HOSTS = ['neon', 'planetscale', 'turso', 'none'] as const;
const AUTH_PROVIDERS = ['absoluteAuth', 'none'] as const;
const CODE_QUALITY_TOOLS = ['eslint+prettier'] as const;
const DIRECTORY_CONFIGS = ['default', 'custom'] as const;
const TAILWIND_OPTIONS = [true, false] as const;

const DRIZZLE_COMPATIBLE = ['gel', 'mysql', 'postgresql', 'sqlite', 'singlestore'] as const;

const HOST_CONSTRAINTS: Record<string, readonly string[]> = {
  neon: ['postgresql'],
  planetscale: ['postgresql', 'mysql'],
  turso: ['sqlite']
};

export type MatrixConfig = {
  authProvider: (typeof AUTH_PROVIDERS)[number];
  codeQualityTool?: (typeof CODE_QUALITY_TOOLS)[number];
  databaseEngine: (typeof DATABASE_ENGINES)[number];
  databaseHost: (typeof DATABASE_HOSTS)[number];
  directoryConfig: (typeof DIRECTORY_CONFIGS)[number];
  frontend: (typeof FRONTENDS)[number];
  orm: (typeof ORMS)[number];
  useTailwind: boolean;
};

export const isValidMatrixConfig = (config: MatrixConfig) => {
  const { databaseEngine, orm, databaseHost } = config;

  if (orm === 'drizzle' && (!DRIZZLE_COMPATIBLE.includes(databaseEngine) || databaseEngine === 'none')) {
    return false;
  }

  if (databaseEngine === 'none') {
    return orm === 'none' && databaseHost === 'none';
  }

  if (databaseHost !== 'none') {
    const allowed = HOST_CONSTRAINTS[databaseHost];

    if (Array.isArray(allowed) && !allowed.includes(databaseEngine)) {
      return false;
    }
  }

  return true;
};

type MatrixField = {
  key: keyof MatrixConfig;
  values: ReadonlyArray<MatrixConfig[keyof MatrixConfig]>;
};

const MATRIX_FIELDS: MatrixField[] = [
  { key: 'frontend', values: FRONTENDS },
  { key: 'databaseEngine', values: DATABASE_ENGINES },
  { key: 'orm', values: ORMS },
  { key: 'databaseHost', values: DATABASE_HOSTS },
  { key: 'authProvider', values: AUTH_PROVIDERS },
  { key: 'codeQualityTool', values: [...CODE_QUALITY_TOOLS, undefined] },
  { key: 'directoryConfig', values: DIRECTORY_CONFIGS },
  { key: 'useTailwind', values: TAILWIND_OPTIONS }
];

export const createMatrix = () =>
  MATRIX_FIELDS.reduce<Partial<MatrixConfig>[]>
  ((accumulated, field) =>
    accumulated.flatMap((partial) =>
      field.values.map((value) => ({
        ...partial,
        [field.key]: value
      }))
    ),
  [{}])
    .map((entry) => entry as MatrixConfig)
    .filter(isValidMatrixConfig);

export const writeMatrixFile = (matrix: MatrixConfig[], outputPath: string) => {
  writeFileSync(outputPath, `${JSON.stringify(matrix, null, 2)}\n`);
};

export const getMatrixOutputPath = () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  return join(__dirname, '..', '..', 'test-matrix.json');
};
