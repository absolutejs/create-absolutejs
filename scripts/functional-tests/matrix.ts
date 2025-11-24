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
  // Optional metadata for test harness
  skip?: boolean;
  skipReason?: string;
  requiredEnv?: string[];
};

export const isValidMatrixConfig = () => 
	// Keep validation permissive here; skip/invalid combinations are annotated
	// and handled by the test harness so they appear in generated matrix with
	// an explicit skip reason. This helps produce transparent reports.
	 true
;type MatrixField = {
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

// Helper to annotate host-specific constraints and requirements
const annotateHostConstraints = (cfg: MatrixConfig) => {
  if (cfg.databaseHost === 'none') {
    return;
  }

  const allowed = HOST_CONSTRAINTS[cfg.databaseHost];
  if (Array.isArray(allowed) && !allowed.includes(cfg.databaseEngine)) {
    cfg.skip = true;
    cfg.skipReason = `${cfg.databaseEngine} is not supported by host ${cfg.databaseHost}`;

    return;
  }

  // Cloud-hosted flows typically require credentials; annotate required envs
  if (cfg.databaseHost === 'neon') {
    cfg.requiredEnv = ['NEON_DATABASE_URL'];
  }

  if (cfg.databaseHost === 'turso') {
    cfg.requiredEnv = ['TURSO_DB_URL'];
  }

  if (cfg.databaseHost === 'planetscale') {
    cfg.skip = true;
    cfg.skipReason = 'PlanetScale cloud flows are not exercised by CI (skipped)';
  }
};

// Helper to annotate known unsupported combinations with skip metadata
const annotateMatrixEntry = (entry: MatrixConfig) => {
	const cfg = { ...entry } as MatrixConfig;  // Drizzle compatibility
  if (cfg.orm === 'drizzle' && (!DRIZZLE_COMPATIBLE.includes(cfg.databaseEngine) || cfg.databaseEngine === 'none')) {
    cfg.skip = true;
    cfg.skipReason = 'Drizzle ORM not compatible with selected database engine';
  }

  // AbsoluteAuth is not supported with MongoDB in our current stack
  if (cfg.authProvider === 'absoluteAuth' && cfg.databaseEngine === 'mongodb') {
    cfg.skip = true;
    cfg.skipReason = 'AbsoluteAuth is not supported with MongoDB';
  }

  // Host constraints
  annotateHostConstraints(cfg);

  // Database none special-case
  if (cfg.databaseEngine === 'none' && cfg.orm !== 'none') {
    cfg.skip = true;
    cfg.skipReason = 'ORM specified without a database engine';
  }

  return cfg;
};

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
    .map(annotateMatrixEntry)
    .filter(isValidMatrixConfig);

export const writeMatrixFile = (matrix: MatrixConfig[], outputPath: string) => {
  writeFileSync(outputPath, `${JSON.stringify(matrix, null, 2)}\n`);
};

export const getMatrixOutputPath = () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  return join(__dirname, '..', '..', 'test-matrix.json');
};
