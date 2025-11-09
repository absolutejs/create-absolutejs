/*
  Vue Framework Validator
  Validates Vue-specific functionality across all backend combinations.
  Tests Vue rendering, hydration, and integration with different configurations.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { runFunctionalTests, type FunctionalTestResult } from './functional-test-runner';

export type VueValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  functionalTestResults?: FunctionalTestResult;
  vueSpecific: {
    filesExist: boolean;
    routesConfigured: boolean;
    importsCorrect: boolean;
  };
};

type ValidatorOptions = {
  skipDependencies?: boolean;
  skipBuild?: boolean;
  skipServer?: boolean;
};

type ValidatorConfig = {
  databaseEngine?: string;
  orm?: string;
  authProvider?: string;
  useTailwind?: boolean;
  codeQualityTool?: string;
  isMultiFrontend?: boolean;
};

type VueSpecificChecks = {
  errors: string[];
  warnings: string[];
  filesExist: boolean;
  importsCorrect: boolean;
  routesConfigured: boolean;
};

const VUE_DIRECTORY_CANDIDATES = ['src/frontend/vue', 'src/frontend'];
const REQUIRED_VUE_FILES = [
  ['components', 'CountButton.vue'],
  ['pages', 'VueExample.vue'],
  ['composables', 'useCount.ts']
];
const VUE_ASSET_PATH = ['src', 'backend', 'assets', 'svg', 'vue-logo.svg'];
const VUE_DEPENDENCY = 'vue';

const findVueDirectory = (projectPath: string) => {
  for (const relative of VUE_DIRECTORY_CANDIDATES) {
    const candidate = join(projectPath, relative);
    const pagePath = join(candidate, 'pages', 'VueExample.vue');

    if (existsSync(pagePath)) {
      return candidate;
    }
  }

  return null;
};

const readFileSafe = (filePath: string) => {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const parsePackageJsonContent = (raw: string) => {
  try {
    return JSON.parse(raw) as { dependencies?: Record<string, string> };
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const checkVueFiles = (vueDirectory: string, projectPath: string, errors: string[]) => {
  const required = REQUIRED_VUE_FILES.map((segments) => join(vueDirectory, ...segments));
  required.push(join(projectPath, ...VUE_ASSET_PATH));

  const missingFiles = required.filter((filePath) => !existsSync(filePath));

  if (missingFiles.length > 0) {
    errors.push(`Missing Vue files: ${missingFiles.join(', ')}`);

    return false;
  }

  return true;
};

const checkServerRoutes = (projectPath: string, errors: string[]) => {
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');

  if (!existsSync(serverPath)) {
    errors.push(`Server file not found: ${serverPath}`);

    return { importsCorrect: false, routesConfigured: false };
  }

  const serverContent = readFileSafe(serverPath);

  if (typeof serverContent !== 'string') {
    errors.push(`Failed to read server.ts: ${serverContent.error.message}`);

    return { importsCorrect: false, routesConfigured: false };
  }

  const importsCorrect = serverContent.includes('VueExample') || serverContent.includes('handleVuePageRequest');

  if (!importsCorrect) {
    errors.push('Server.ts missing Vue imports or route handlers');
  }

  const routesConfigured =
    serverContent.includes("'/vue'") ||
    (serverContent.includes("'/'") && serverContent.includes('VueExample'));

  if (!routesConfigured) {
    errors.push('Server.ts missing Vue route configuration');
  }

  return { importsCorrect, routesConfigured };
};

const checkPackageJson = (projectPath: string, warnings: string[], errors: string[]) => {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    warnings.push('package.json not found – unable to verify Vue dependencies');

    return;
  }

  const packageJson = readFileSafe(packageJsonPath);

  if (typeof packageJson !== 'string') {
    warnings.push(`Could not verify Vue dependencies in package.json: ${packageJson.error.message}`);

    return;
  }

  const parsed = parsePackageJsonContent(packageJson);

  if ('error' in parsed) {
    warnings.push(`Could not verify Vue dependencies in package.json: ${parsed.error.message}`);

    return;
  }

  const hasVue = Boolean(parsed.dependencies?.[VUE_DEPENDENCY]);

  if (!hasVue) {
    errors.push('package.json missing Vue dependencies');
  }
};

const evaluateVueSpecificChecks = (projectPath: string): VueSpecificChecks => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const vueDirectory = findVueDirectory(projectPath);

  if (!vueDirectory) {
    errors.push('Vue directory not found - checked src/frontend and src/frontend/vue');

    return {
      errors,
      filesExist: false,
      importsCorrect: false,
      routesConfigured: false,
      warnings
    };
  }

  const filesExist = checkVueFiles(vueDirectory, projectPath, errors);
  const { importsCorrect, routesConfigured } = checkServerRoutes(projectPath, errors);
  checkPackageJson(projectPath, warnings, errors);

  return {
    errors,
    filesExist,
    importsCorrect,
    routesConfigured,
    warnings
  };
};

const runFunctionalSuite = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn',
  options: ValidatorOptions,
  errors: string[],
  warnings: string[]
) => {
  const results = await runFunctionalTests(projectPath, packageManager, options).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    errors.push(`Functional tests failed: ${error.message}`);

    return undefined;
  });

  if (!results) {
    return undefined;
  }

  if (!results.passed) {
    errors.push(...results.errors);
  }

  if (results.warnings.length > 0) {
    warnings.push(...results.warnings);
  }

  return results;
};

export const validateVueFramework = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  _config: ValidatorConfig = {},
  options: ValidatorOptions = {}
): Promise<VueValidationResult> => {
  void _config;
  const errors: string[] = [];
  const warnings: string[] = [];

  const vueChecks = evaluateVueSpecificChecks(projectPath);
  errors.push(...vueChecks.errors);
  warnings.push(...vueChecks.warnings);

  const functionalTestResults = await runFunctionalSuite(
    projectPath,
    packageManager,
    options,
    errors,
    warnings
  );

  const passed =
    errors.length === 0 &&
    vueChecks.filesExist &&
    vueChecks.routesConfigured &&
    vueChecks.importsCorrect;

  return {
    errors,
    functionalTestResults,
    passed,
    vueSpecific: {
      filesExist: vueChecks.filesExist,
      importsCorrect: vueChecks.importsCorrect,
      routesConfigured: vueChecks.routesConfigured
    },
    warnings
  };
};

const parseCliArguments = () => {
  const [, , projectPath, packageManagerArg, ...flags] = process.argv;
  const packageManager = (packageManagerArg as 'bun' | 'npm' | 'pnpm' | 'yarn' | undefined) ?? 'bun';

  const skipDependencies = flags.includes('--skip-deps');
  const skipBuild = flags.includes('--skip-build');
  const skipServer = flags.includes('--skip-server');

  return {
    packageManager,
    projectPath,
    skipBuild,
    skipDependencies,
    skipServer
  } as const;
};

const logVueSpecificSummary = (vueSpecific: VueValidationResult['vueSpecific']) => {
  console.log('Vue-Specific Checks:');
  console.log(`  Files Exist: ${vueSpecific.filesExist ? '✓' : '✗'}`);
  console.log(`  Routes Configured: ${vueSpecific.routesConfigured ? '✓' : '✗'}`);
  console.log(`  Imports Correct: ${vueSpecific.importsCorrect ? '✓' : '✗'}`);
};

const logBuildSummary = (build?: FunctionalTestResult['results']['build']) => {
  if (!build) {
    return;
  }

  console.log(`  Build: ${build.passed ? '✓' : '✗'}`);

  if (typeof build.compileTime === 'number') {
    console.log(`    Compile time: ${build.compileTime}ms`);
  }
};

const logServerSummary = (server?: FunctionalTestResult['results']['server']) => {
  if (!server) {
    return;
  }

  console.log(`  Server: ${server.passed ? '✓' : '✗'}`);
};

const logFunctionalSummary = (functionalTestResults?: FunctionalTestResult) => {
  if (!functionalTestResults) {
    return;
  }

  console.log('\nFunctional Test Results:');
  const { results } = functionalTestResults;
  logBuildSummary(results.build);
  logServerSummary(results.server);
};

const logWarnings = (warnings: string[]) => {
  if (warnings.length === 0) {
    return;
  }

  console.log('\nWarnings:');
  warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

const exitWithResult = (result: VueValidationResult) => {
  if (result.passed) {
    console.log('\n✓ Vue framework validation passed!');
    process.exit(0);
  }

  console.log('\n✗ Vue framework validation failed:');
  result.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath, skipBuild, skipDependencies, skipServer } = parseCliArguments();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/vue-validator.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]');
    process.exit(1);
  }

  try {
    const result = await validateVueFramework(
      projectPath,
      packageManager,
      {},
      { skipBuild, skipDependencies, skipServer }
    );

    console.log('\n=== Vue Framework Validation Results ===\n');
    logVueSpecificSummary(result.vueSpecific);
    logFunctionalSummary(result.functionalTestResults);
    logWarnings(result.warnings);
    exitWithResult(result);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Vue framework validation error:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Vue validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
