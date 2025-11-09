/*
  Functional Test Runner
  Orchestrates dependency installation, build validation, and server startup validation for scaffolded projects.
*/

import process from 'node:process';

import { validateBuild } from './build-validator';
import { testDependencyInstallation } from './dependency-installer-tester';
import { validateServerStartup } from './server-startup-validator';

type StepName = 'dependencies' | 'build' | 'server';

type StepResult = {
  compileTime?: number;
  errors: string[];
  installTime?: number;
  passed: boolean;
  warnings: string[];
};

type StepResults = Partial<Record<StepName, StepResult>>;

export type FunctionalTestResult = {
  errors: string[];
  passed: boolean;
  results: {
    build?: { compileTime?: number; passed: boolean };
    dependencies?: { installTime?: number; passed: boolean };
    server?: { compileTime?: number; passed: boolean };
  };
  totalTime?: number;
  warnings: string[];
};

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const runDependencyStep: (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => Promise<StepResult> = async (projectPath, packageManager) => {
  try {
    const result = await testDependencyInstallation(projectPath, packageManager);

    return {
      errors: result.passed ? [] : [...result.errors],
      installTime: result.installTime,
      passed: result.passed,
      warnings: []
    } satisfies StepResult;
  } catch (error) {
    return {
      errors: [`Dependency installation test failed: ${extractErrorMessage(error)}`],
      passed: false,
      warnings: []
    } satisfies StepResult;
  }
};

const runBuildStep: (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => Promise<StepResult> = async (projectPath, packageManager) => {
  try {
    const result = await validateBuild(projectPath, packageManager);

    return {
      compileTime: result.compileTime,
      errors: result.passed ? [] : [...result.errors],
      passed: result.passed,
      warnings: []
    } satisfies StepResult;
  } catch (error) {
    return {
      errors: [`Build validation failed: ${extractErrorMessage(error)}`],
      passed: false,
      warnings: []
    } satisfies StepResult;
  }
};

const runServerStep: (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => Promise<StepResult> = async (projectPath, packageManager) => {
  try {
    const result = await validateServerStartup(projectPath, packageManager);

    return {
      compileTime: result.compileTime,
      errors: result.passed ? [] : [...result.errors],
      passed: result.passed,
      warnings: [...result.warnings]
    } satisfies StepResult;
  } catch (error) {
    return {
      errors: [`Server startup validation failed: ${extractErrorMessage(error)}`],
      passed: false,
      warnings: []
    } satisfies StepResult;
  }
};

const mapStepResult = (result: StepResult) => ({
  compileTime: result.compileTime,
  installTime: result.installTime,
  passed: result.passed
});

export const runFunctionalTests = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun',
  options: {
    skipBuild?: boolean;
    skipDependencies?: boolean;
    skipServer?: boolean;
  } = {}
) => {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const stepResults: StepResults = {};

  if (options.skipDependencies) {
    warnings.push('Skipped dependency installation test');
  } else {
    const dependencyResult = await runDependencyStep(projectPath, packageManager);
    stepResults.dependencies = dependencyResult;
    errors.push(...dependencyResult.errors);
    warnings.push(...dependencyResult.warnings);
  }

  if (options.skipBuild) {
    warnings.push('Skipped build validation');
  } else {
    const buildResult = await runBuildStep(projectPath, packageManager);
    stepResults.build = buildResult;
    errors.push(...buildResult.errors);
    warnings.push(...buildResult.warnings);
  }

  if (options.skipServer) {
    warnings.push('Skipped server startup validation');
  } else {
    const serverResult = await runServerStep(projectPath, packageManager);
    stepResults.server = serverResult;
    errors.push(...serverResult.errors);
    warnings.push(...serverResult.warnings);
  }

  const totalTime = Date.now() - startTime;

  return {
    errors,
    passed: errors.length === 0,
    results: {
      build: stepResults.build ? mapStepResult(stepResults.build) : undefined,
      dependencies: stepResults.dependencies ? mapStepResult(stepResults.dependencies) : undefined,
      server: stepResults.server ? mapStepResult(stepResults.server) : undefined
    },
    totalTime,
    warnings
  } satisfies FunctionalTestResult;
};

const printStepSummary = (label: string, result?: { compileTime?: number; installTime?: number; passed: boolean }) => {
  if (!result) {
    return;
  }

  console.log(`${label}: ${result.passed ? '✓' : '✗'}`);

  if (typeof result.installTime === 'number') {
    console.log(`  Install time: ${result.installTime}ms`);
  }

  if (typeof result.compileTime === 'number') {
    console.log(`  Compile time: ${result.compileTime}ms`);
  }
};

const printCliSummary = (result: FunctionalTestResult) => {
  console.log('\n=== Functional Test Results ===\n');
  printStepSummary('Dependencies', result.results.dependencies);
  printStepSummary('Build', result.results.build);
  printStepSummary('Server', result.results.server);

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  }

  if (typeof result.totalTime === 'number') {
    console.log(`\nTotal time: ${result.totalTime}ms`);
  }

  if (result.passed) {
    console.log('\n✓ All functional tests passed!');
  } else {
    console.log('\n✗ Functional tests failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }
};

const parseCliArguments = (argv: string[]) => {
  const [, , projectPath, packageManager, ...rest] = argv;

  return {
    options: {
      skipBuild: argv.includes('--skip-build'),
      skipDependencies: argv.includes('--skip-deps'),
      skipServer: argv.includes('--skip-server')
    },
    packageManager: (packageManager as 'bun' | 'npm' | 'pnpm' | 'yarn') ?? 'bun',
    projectPath,
    remaining: rest
  } as const;
};

if (import.meta.main) {
  const { options, packageManager, projectPath } = parseCliArguments(process.argv);

  if (!projectPath) {
    console.error(
      'Usage: bun run scripts/functional-tests/functional-test-runner.ts <project-path> [package-manager] [--skip-deps] [--skip-build] [--skip-server]'
    );
    process.exit(1);
  }

  runFunctionalTests(projectPath, packageManager, options)
    .then((result) => {
      printCliSummary(result);
      process.exit(result.passed ? 0 : 1);

      return undefined;
    })
    .catch((error) => {
      console.error('✗ Functional test runner error:', extractErrorMessage(error));
      process.exit(1);
    });
}
