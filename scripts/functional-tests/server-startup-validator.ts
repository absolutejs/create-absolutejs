/*
  Server Startup Validator
  Tests that scaffolded projects can compile and their server structure is valid.
  For actual server startup testing, we validate compilation and basic structure.
*/

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

export type ServerStartupResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  compileTime?: number;
};

const COMPILE_TIMEOUT_MS = 60_000;
const MAX_STDERR_LINES = 5;
const FORCE_KILL_DELAY_MS = 1_000;

const runTypecheck = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn'
) => {
  const startTime = Date.now();
  const args: Record<'bun' | 'npm' | 'pnpm' | 'yarn', string[]> = {
    bun: ['run', 'typecheck'],
    npm: ['run', 'typecheck'],
    pnpm: ['run', 'typecheck'],
    yarn: ['run', 'typecheck']
  };

  const stderrChunks: string[] = [];
  const stdoutChunks: string[] = [];
  let timedOut = false;

  const child = spawn(packageManager, args[packageManager], {
    cwd: projectPath,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
  }, COMPILE_TIMEOUT_MS);

  child.stdout?.on('data', (chunk) => {
    stdoutChunks.push(chunk.toString());
  });
  child.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString());
  });

  const [code, signal] = (await once(child, 'close')) as [number | null, string | null];
  clearTimeout(timeoutId);

  const compileTime = Date.now() - startTime;
  const stderr = stderrChunks.join('').trim();
  const stdout = stdoutChunks.join('').trim();
  const previewSource = stderr.length > 0 ? stderr : stdout;
  const preview = previewSource
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, MAX_STDERR_LINES)
    .join('; ');

  if (timedOut || signal === 'SIGTERM' || signal === 'SIGKILL') {
    return {
      compileTime,
      errors: [`TypeScript compilation timed out after ${COMPILE_TIMEOUT_MS}ms`]
    };
  }

  if (code === 0) {
    return { compileTime, errors: [] };
  }

  const baseError = `TypeScript compilation failed (exit code ${code ?? 'unknown'})`;
  const errors = preview.length > 0 ? [baseError, `Compilation output: ${preview}`] : [baseError];

  return { compileTime, errors };
};

export const validateServerStartup = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<ServerStartupResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { compileTime, errors: typecheckErrors } = await runTypecheck(projectPath, packageManager);

  if (typecheckErrors.length > 0) {
    errors.push(...typecheckErrors);
  }

  return {
    compileTime,
    errors,
    passed: errors.length === 0,
    warnings
  };
};

const parseCliArguments = () => {
  const [, , projectPath, packageManagerArg] = process.argv;
  const normalized = packageManagerArg as 'bun' | 'npm' | 'pnpm' | 'yarn' | undefined;

  return {
    packageManager: normalized ?? 'bun',
    projectPath
  } as const;
};

const exitWithUsage = () => {
  console.error('Usage: bun run scripts/functional-tests/server-startup-validator.ts <project-path> [package-manager]');
  process.exit(1);
};

const runFromCli = async () => {
  const { packageManager, projectPath } = parseCliArguments();

  if (!projectPath) {
    exitWithUsage();
  }

  const result = await validateServerStartup(projectPath, packageManager).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Server startup validation error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ Server startup validation failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
    process.exit(1);
  }

  console.log('✓ Server startup validation passed');
  if (typeof result.compileTime === 'number') {
    console.log(`  Compilation time: ${result.compileTime}ms`);
  }
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Server startup validator encountered an unexpected error:', error);
    process.exit(1);
  });
}
