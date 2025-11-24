import { validateAuthConfiguration } from '../../scripts/functional-tests/auth-validator';
import type { MatrixConfig } from '../../scripts/functional-tests/matrix';
import { runMatrixSuite } from './frameworks/test-utils';

type AuthMatrixEntry = MatrixConfig & {
  authProvider: string;
  directoryConfig: 'default';
};

const SUPPORTED_DATABASE_ENGINES = new Set(['sqlite', 'mongodb', 'postgresql']);

const createProjectName = (config: AuthMatrixEntry) => {
  const hostLabel = config.databaseHost === 'none' ? 'local' : config.databaseHost;
  const tailwindLabel = config.useTailwind ? 'tw' : 'notw';

  return `test-auth-${config.frontend}-${config.databaseEngine}-${config.orm}-${hostLabel}-${tailwindLabel}`
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
};

const describeConfig = (config: AuthMatrixEntry) => {
  const segments = [
    'Auth',
    config.frontend === 'none' ? 'no-frontend' : config.frontend,
    config.databaseEngine,
    config.orm,
    config.databaseHost === 'none' ? 'local' : config.databaseHost,
    config.useTailwind ? 'tailwind' : 'no-tailwind'
  ];

  if (config.codeQualityTool) {
    segments.push(config.codeQualityTool);
  }

  return segments.join(' + ');
};

runMatrixSuite({
  createProjectName,
  describeBlock: 'Auth configuration matrix',
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
  filterMatrix: (config): config is AuthMatrixEntry =>
    config.authProvider !== 'none' &&
    config.directoryConfig === 'default' &&
    SUPPORTED_DATABASE_ENGINES.has(config.databaseEngine),
  validate: async ({ config, projectPath }) => {
    const { errors, passed, warnings } = await validateAuthConfiguration(
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

