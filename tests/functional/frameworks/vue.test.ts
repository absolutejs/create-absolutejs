import type { MatrixConfig } from '../../../scripts/functional-tests/matrix';
import { validateVueFramework } from '../../../scripts/functional-tests/vue-validator';
import { runFrameworkMatrix } from './test-utils';

type VueMatrixEntry = MatrixConfig & {
  directoryConfig: 'default';
  frontend: 'vue';
};

const createProjectName = (config: VueMatrixEntry) =>
  `test-vue-${config.databaseEngine}-${config.orm}-${config.authProvider}-${config.useTailwind ? 'tw' : 'notw'}`
    .replace(/[^a-z0-9-]/g, '-')
    .toLowerCase();

const describeConfig = (config: VueMatrixEntry) => {
  const segments = [
    'Vue',
    config.databaseEngine,
    config.orm,
    config.authProvider === 'none' ? 'no-auth' : config.authProvider,
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
  createProjectName, describeBlock: 'Vue framework matrix', describeConfig, framework: 'vue', buildScaffoldOptions: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: config.databaseEngine,
    databaseHost: config.databaseHost,
    directoryConfig: config.directoryConfig,
    framework: 'vue',
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
  }), filterMatrix: (config): config is VueMatrixEntry =>
    config.frontend === 'vue' &&
    config.directoryConfig === 'default' &&
    SUPPORTED_DATABASE_ENGINES.has(config.databaseEngine) &&
    SUPPORTED_ORMS.has(config.orm), validate: async ({ config, projectPath }) => {
    const { errors, passed, warnings } = await validateVueFramework(projectPath, 'bun', {
      authProvider: config.authProvider,
      codeQualityTool: config.codeQualityTool,
      databaseEngine: config.databaseEngine,
      isMultiFrontend: config.directoryConfig === 'custom',
      orm: config.orm,
      useTailwind: config.useTailwind
    });

    return { errors, passed, warnings };
  }
});

