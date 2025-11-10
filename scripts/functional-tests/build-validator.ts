/*
  Build Validator
  Tests that scaffolded projects can compile TypeScript successfully.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

export type BuildResult = {
  passed: boolean;
  errors: string[];
  compileTime?: number;
};

const COMPILE_TIMEOUT_MS = 60_000;
const TYPECHECK_SCRIPT = 'typecheck';

let cachedBunModule: typeof import('bun') | null = null;

const loadBunModule = async () => {
  if (cachedBunModule === null) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

const parsePackageJson = (packageJsonPath: string) => {
  try {
    const raw = readFileSync(packageJsonPath, 'utf-8');

    return JSON.parse(raw) as { scripts?: Record<string, string> };
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const getTypecheckScriptStatus = (packageJsonPath: string, errors: string[]) => {
  const parsed = parsePackageJson(packageJsonPath);

  if ('error' in parsed) {
    errors.push(`Failed to parse package.json: ${parsed.error.message}`);

    return 'error';
  }

  const hasScript = parsed.scripts?.[TYPECHECK_SCRIPT];

  return hasScript ? 'present' : 'missing';
};

const runTypecheck = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => {
  const bunModule = await loadBunModule();
  const { $: bunDollar } = bunModule;
  const command = bunDollar`cd ${projectPath} && ${packageManager} run ${TYPECHECK_SCRIPT}`.quiet().nothrow();

  const timeout = bunModule.sleep(COMPILE_TIMEOUT_MS).then(() => null as const);
  const result = await Promise.race([command, timeout]);

  if (result !== null) {
    return { result } as const;
  }

  command.kill();

  return { timedOut: true as const };
};

const extractErrorOutput = (output: string) => {
  const ERROR_PATTERNS = ['error TS', 'error:'];
  const MAX_LINES = 15;

  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const relevant = lines.filter((line) => {
    if (ERROR_PATTERNS.some((pattern) => line.includes(pattern))) {
      return true;
    }

    return /^[^(]+\(\d+,\d+\):/.test(line);
  });

  if (relevant.length > 0) {
    return relevant.slice(0, MAX_LINES).join('\n');
  }

  const OUTPUT_PREVIEW_LINES = 10;

  return lines.slice(0, OUTPUT_PREVIEW_LINES).join('\n');
};

const TSC_MISSING_EXIT_CODE = 127;
const STDOUT_WARNING_LINES = 3;

const runTscFallback = async (projectPath: string) => {
  const bunModule = await loadBunModule();
  const { $: bunDollar, sleep } = bunModule;
  const command = bunDollar`cd ${projectPath} && tsc --noEmit`.quiet().nothrow();

  const startTime = Date.now();
  const timeoutResult = sleep(COMPILE_TIMEOUT_MS).then(() => null as const);
  const result = await Promise.race([command, timeoutResult]);

  if (result === null) {
    command.kill();

    return {
      compileTime: Date.now() - startTime,
      status: 'timedOut' as const
    };
  }

  const compileTime = Date.now() - startTime;
  const exitCode = result.exitCode ?? -1;
  const stdout = result.stdout?.toString() ?? '';
  const stderr = result.stderr?.toString() ?? '';
  const combinedOutput = `${stdout}\n${stderr}`.trim();
  const lowerCombined = combinedOutput.toLowerCase();

  if (exitCode === 0) {
    return { compileTime, status: 'success' as const };
  }

  if (
    exitCode === TSC_MISSING_EXIT_CODE ||
    lowerCombined.includes('command not found') ||
    lowerCombined.includes('not recognized') ||
    lowerCombined.includes('enoent')
  ) {
    const warning =
      combinedOutput.length > 0
        ? combinedOutput.split('\n').slice(0, STDOUT_WARNING_LINES).join('\n')
        : 'The TypeScript compiler (tsc) was not found on PATH.';

    return { message: warning, status: 'missing' as const };
  }

  return {
    compileTime,
    exitCode,
    status: 'failure' as const,
    stderr,
    stdout
  };
};

const runPackageTypecheck = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => {
  const startTime = Date.now();
  const execution = await runTypecheck(projectPath, packageManager);
  const compileTime = Date.now() - startTime;

  if ('timedOut' in execution) {
    return {
      compileTime,
      error: `TypeScript compilation timed out after ${COMPILE_TIMEOUT_MS}ms`,
      passed: false
    };
  }

  const { result } = execution;

  if (result.exitCode === 0) {
    return { compileTime, passed: true };
  }

  const output = [result.stdout?.toString() ?? '', result.stderr?.toString() ?? '']
    .filter(Boolean)
    .join('\n');
  const errorMessage =
    output.length > 0
      ? `Compilation errors:\n${extractErrorOutput(output)}`
      : `TypeScript compilation failed (exit code ${result.exitCode})`;

  return {
    compileTime,
    error: errorMessage,
    passed: false
  };
};

const applyFallbackResult = (
  fallback:
    | { compileTime: number; passed: true; status: 'success' }
    | { compileTime: number; error: string; passed: false; status: 'timedOut' }
    | { message: string; status: 'missing' }
    | {
        compileTime: number;
        exitCode: number;
        status: 'failure';
        stderr: string;
        stdout: string;
      }
    | { status: 'missing'; message: string },
  errors: string[]
) => {
  if (fallback.status === 'success') {
    return { compileTime: fallback.compileTime, errors, passed: true };
  }

  if (fallback.status === 'timedOut') {
    errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT_MS}ms`);

    return { compileTime: fallback.compileTime, errors, passed: false };
  }

  if (fallback.status === 'missing') {
    console.warn(
      `⚠ TypeScript compiler not found; skipping typecheck step. (${fallback.message})`
    );

    return { errors, passed: true };
  }

  if (fallback.status === 'failure') {
    const output = [fallback.stdout, fallback.stderr].filter(Boolean).join('\n');
    const errorMessage =
      output.length > 0
        ? `Compilation errors:\n${extractErrorOutput(output)}`
        : `TypeScript compilation failed (exit code ${fallback.exitCode})`;

    errors.push(errorMessage);

    return { compileTime: fallback.compileTime, errors, passed: false };
  }

  errors.push('Unknown error while running TypeScript compilation fallback.');

  return { errors, passed: false };
};

const applyScriptTypecheckResult = (
  typecheckResult:
    | { compileTime?: number; error: string; passed: false }
    | { compileTime?: number; passed: true; error?: string },
  errors: string[]
) => {
  if (!typecheckResult.passed && typecheckResult.error) {
    errors.push(typecheckResult.error);
  }

  return {
    compileTime: typecheckResult.compileTime,
    errors,
    passed: typecheckResult.passed
  };
};

export const validateBuild = async (projectPath: string, packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun') => {
  const errors: string[] = [];
  const tsconfigPath = join(projectPath, 'tsconfig.json');
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(tsconfigPath)) {
    errors.push(`tsconfig.json not found: ${tsconfigPath}`);

    return { errors, passed: false };
  }

  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${packageJsonPath}`);

    return { errors, passed: false };
  }

  const scriptStatus = getTypecheckScriptStatus(packageJsonPath, errors);

  if (scriptStatus === 'error') {
    return { errors, passed: false };
  }

  if (scriptStatus === 'present') {
    const typecheckResult = await runPackageTypecheck(projectPath, packageManager);

    return applyScriptTypecheckResult(typecheckResult, errors);
  }

  console.warn(
    `⚠ No '${TYPECHECK_SCRIPT}' script found in package.json – falling back to 'tsc --noEmit'.`
  );
  const fallback = await runTscFallback(projectPath);

  return applyFallbackResult(fallback, errors);
};

const parseCliArgs = () => {
  const [, , projectPath, packageManagerArg] = process.argv;
  const normalizedPackageManager = packageManagerArg as 'bun' | 'npm' | 'pnpm' | 'yarn' | undefined;

  return { packageManager: normalizedPackageManager ?? 'bun', projectPath } as const;
};

const exitWithUsage = () => {
  console.error('Usage: bun run scripts/functional-tests/build-validator.ts <project-path> [package-manager]');
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath } = parseCliArgs();

  if (!projectPath) {
    exitWithUsage();
  }

  const result = await validateBuild(projectPath, packageManager).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Build validation error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ Build validation failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ Build validation passed');
  if (typeof result.compileTime === 'number') {
    console.log(`  Compilation time: ${result.compileTime}ms`);
  }
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Build validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
