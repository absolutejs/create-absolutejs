import process from 'node:process';

import { runFunctionalTests } from '../../../scripts/functional-tests/functional-test-runner';
import type { MatrixConfig } from '../../../scripts/functional-tests/matrix';
import { validateMongoDBDatabase } from '../../../scripts/functional-tests/mongodb-validator';
import { runMatrixSuite } from '../frameworks/test-utils';
import { ensureDockerAvailable } from '../support';

type MongoMatrixEntry = MatrixConfig & {
  databaseEngine: 'mongodb';
  directoryConfig: 'default';
};

const createProjectName = (config: MongoMatrixEntry) =>
  `test-mongodb-${config.frontend}-${config.orm}-${config.authProvider === 'none' ? 'noauth' : 'auth'}-${
    config.databaseHost === 'none' ? 'local' : config.databaseHost
  }-${config.useTailwind ? 'tw' : 'notw'}`
    .replace(/[^a-z0-9-]/g, '-')
    .toLowerCase();

const describeConfig = (config: MongoMatrixEntry) => {
  const segments = [
    'MongoDB',
    config.databaseHost === 'none' ? 'local' : config.databaseHost,
    config.frontend === 'none' ? 'no-frontend' : config.frontend,
    config.orm,
    config.authProvider === 'none' ? 'no-auth' : config.authProvider,
    config.useTailwind ? 'tailwind' : 'no-tailwind'
  ];

  if (config.codeQualityTool) {
    segments.push(config.codeQualityTool);
  }

  return segments.join(' + ');
};

const runFunctionalSuite = async (projectPath: string) => {
  process.stdout.write('  → Running functional tests... ');
  const start = Date.now();

  let result;
  try {
    result = await runFunctionalTests(projectPath, 'bun', {
      skipBuild: false,
      skipDependencies: false,
      skipServer: false
    });
  } catch (unknownError) {
    const elapsedMs = Date.now() - start;
    console.log(`✗ (${elapsedMs}ms)`);
    throw unknownError instanceof Error ? unknownError : new Error(String(unknownError));
  }

  const elapsedMs = Date.now() - start;

  if (!result.passed) {
    console.log(`✗ (${elapsedMs}ms)`);
    const details =
      result.errors.length > 0
        ? result.errors.map((error) => `  - ${error}`).join('\n')
        : '  - Functional test failure';

    throw new Error(`Functional tests failed:\n${details}`);
  }

  console.log(`✓ (${elapsedMs}ms)`);
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

runMatrixSuite({
  createProjectName, describeBlock: 'MongoDB database matrix', describeConfig, beforeValidate: async ({ config, projectPath }) => {
    await runFunctionalSuite(projectPath);

    if (config.databaseHost === 'none') {
      const dockerStatus = ensureDockerAvailable();

      if (!dockerStatus.available) {
        throw new Error(`Docker unavailable: ${dockerStatus.message}`);
      }
    }
  }, buildScaffoldOptions: (config) => ({
    authProvider: config.authProvider,
    codeQualityTool: config.codeQualityTool,
    databaseEngine: 'mongodb',
    databaseHost: config.databaseHost,
    directoryConfig: config.directoryConfig,
    framework: config.frontend === 'none' ? undefined : config.frontend,
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
  }), filterMatrix: (config): config is MongoMatrixEntry =>
    config.databaseEngine === 'mongodb' && config.directoryConfig === 'default', validate: async ({ config, projectPath }) => {
    const { errors, passed, warnings } = await validateMongoDBDatabase(projectPath, {
      authProvider: config.authProvider,
      databaseHost: config.databaseHost,
      orm: config.orm
    });

    return { errors, passed, warnings };
  }
});

