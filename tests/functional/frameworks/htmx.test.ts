import { validateHTMXFramework } from '../../../scripts/functional-tests/htmx-validator';
import type { MatrixConfig } from '../../../scripts/functional-tests/matrix';
import { runFrameworkMatrix } from './test-utils';

type HtmxMatrixEntry = MatrixConfig & {
  directoryConfig: 'default';
  frontend: 'htmx';
};

const createProjectName = (config: HtmxMatrixEntry) =>
  `test-htmx-${config.databaseEngine}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${
    config.useTailwind ? 'tw' : 'notw'
  }`
    .replace(/[^a-z0-9-]/g, '-')
    .toLowerCase();

const describeConfig = (config: HtmxMatrixEntry) => {
  const segments = [
    'HTMX',
    config.databaseEngine,
    config.authProvider === 'none' ? 'no-auth' : 'auth',
    config.orm,
    config.useTailwind ? 'tailwind' : 'no-tailwind'
  ];

  if (config.databaseHost !== 'none') {
    segments.splice(2, 0, config.databaseHost);
  }

  if (config.codeQualityTool) {
    segments.push(config.codeQualityTool);
  }

  return segments.join(' + ');
};

const SUPPORTED_DATABASE_ENGINES = new Set(['none', 'sqlite', 'mongodb']);
const SUPPORTED_ORMS = new Set(['none', 'drizzle']);

runFrameworkMatrix({
  createProjectName, describeBlock: 'HTMX framework matrix', describeConfig, framework: 'htmx', buildScaffoldOptions: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    directoryConfig: config.directoryConfig,
    framework: 'htmx',
    orm: config.orm,
    useTailwind: config.useTailwind
  }), createFingerprint: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    frontend: config.frontend,
    orm: config.orm,
    useTailwind: config.useTailwind
  }), filterMatrix: (config): config is HtmxMatrixEntry =>
    config.frontend === 'htmx' &&
    config.directoryConfig === 'default' &&
    SUPPORTED_DATABASE_ENGINES.has(config.databaseEngine) &&
    SUPPORTED_ORMS.has(config.orm), validate: async ({ config, projectPath }) => {
    const { errors, passed, warnings } = await validateHTMXFramework(
      projectPath,
      'bun',
      {
        authProvider: config.authProvider,
        codeQualityTool: config.codeQualityTool,
        databaseEngine: config.databaseEngine,
        orm: config.orm,
        useTailwind: config.useTailwind
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

