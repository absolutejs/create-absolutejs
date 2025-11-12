import { validateCloudProvider } from '../../scripts/functional-tests/cloud-provider-validator';
import type { MatrixConfig } from '../../scripts/functional-tests/matrix';
import { runMatrixSuite } from './frameworks/test-utils';

type CloudMatrixEntry = MatrixConfig & {
  databaseHost: 'turso' | 'neon';
  directoryConfig: 'default';
};

const SUPPORTED_DATABASE_ENGINES = new Set(['sqlite', 'postgresql']);
const SUPPORTED_ORMS = new Set(['none', 'drizzle']);
const SUPPORTED_FRONTENDS = new Set(['html', 'react', 'vue', 'svelte']);

const createProjectName = (config: CloudMatrixEntry) =>
  `test-cloud-${config.databaseHost}-${config.databaseEngine}-${config.orm}-${config.frontend}-${
    config.authProvider === 'none' ? 'noauth' : 'auth'
  }-${config.useTailwind ? 'tw' : 'notw'}`
    .replace(/[^a-z0-9-]/g, '-')
    .toLowerCase();

const describeConfig = (config: CloudMatrixEntry) => {
  const segments = [
    'Cloud',
    config.databaseHost,
    config.databaseEngine,
    config.frontend,
    config.orm,
    config.authProvider === 'none' ? 'no-auth' : config.authProvider,
    config.useTailwind ? 'tailwind' : 'no-tailwind'
  ];

  if (config.codeQualityTool) {
    segments.push(config.codeQualityTool);
  }

  return segments.join(' + ');
};

runMatrixSuite({
  createProjectName,
  describeBlock: 'Cloud provider matrix',
  describeConfig,
  buildScaffoldOptions: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    directoryConfig: config.directoryConfig,
    framework: config.frontend === 'none' ? undefined : config.frontend,
    orm: config.orm,
    useTailwind: config.useTailwind
  }),
  createFingerprint: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    frontend: config.frontend,
    orm: config.orm,
    useTailwind: config.useTailwind
  }),
  filterMatrix: (config): config is CloudMatrixEntry =>
    config.databaseHost !== 'none' &&
    SUPPORTED_DATABASE_ENGINES.has(config.databaseEngine) &&
    SUPPORTED_ORMS.has(config.orm) &&
    SUPPORTED_FRONTENDS.has(config.frontend) &&
    config.directoryConfig === 'default',
  validate: async ({ config, projectPath }) => {
    const { errors, passed, warnings } = await validateCloudProvider(
      projectPath,
      'bun',
      {
        authProvider: config.authProvider,
        databaseEngine: config.databaseEngine,
        databaseHost: config.databaseHost,
        orm: config.orm
      },
      {
        skipBuild: false,
        skipDependencies: false,
        skipServer: false
      }
    );

    return { errors, passed, warnings };
  }
});

