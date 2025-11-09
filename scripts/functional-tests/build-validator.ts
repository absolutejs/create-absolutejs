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

const ensureTypecheckScript = (packageJsonPath: string, errors: string[]) => {
  const parsed = parsePackageJson(packageJsonPath);

  if ('error' in parsed) {
    errors.push(`Failed to parse package.json: ${parsed.error.message}`);

    return false;
  }

  const hasScript = parsed.scripts?.[TYPECHECK_SCRIPT];

  if (!hasScript) {
    errors.push(`No '${TYPECHECK_SCRIPT}' script found in package.json`);

    return false;
  }

  return true;
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

export const validateBuild = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<BuildResult> => {
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

  if (!ensureTypecheckScript(packageJsonPath, errors)) {
    return { errors, passed: false };
  }

  const startTime = Date.now();
  const execution = await runTypecheck(projectPath, packageManager);
  const compileTime = Date.now() - startTime;

  if ('timedOut' in execution) {
    errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT_MS}ms`);

    return { compileTime, errors, passed: false };
  }

  const { result } = execution;

  if (result.exitCode === 0) {
    return { compileTime, errors, passed: true };
  }

  const output = [result.stdout?.toString() ?? '', result.stderr?.toString() ?? '']
    .filter(Boolean)
    .join('\n');
  const errorMessage =
    output.length > 0
      ? `Compilation errors:\n${extractErrorOutput(output)}`
      : `TypeScript compilation failed (exit code ${result.exitCode})`;

  errors.push(errorMessage);

  return { compileTime, errors, passed: false };
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
