/*
  Dependency Installer Tester
  Tests that dependencies can be installed successfully in scaffolded projects.
*/

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

export type DependencyInstallResult = {
  passed: boolean;
  errors: string[];
  installTime?: number;
};

const INSTALL_TIMEOUT_MS = 120_000;
const MAX_ERROR_PREVIEW_LINES = 10;
const FORCE_KILL_DELAY_MS = 1_000;
const INSTALL_TMP_DIR_NAME = '.absolute-tmp';

const ensureInstallTempDir = (projectPath: string) => {
  const tempDir = join(projectPath, INSTALL_TMP_DIR_NAME);

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  return tempDir;
};

const INSTALL_COMMANDS: Record<'bun' | 'npm' | 'pnpm' | 'yarn', [string, string[]]> = {
  bun: ['bun', ['install']],
  npm: ['npm', ['install']],
  pnpm: ['pnpm', ['install']],
  yarn: ['yarn', ['install']]
};

const hasDependenciesDeclared = (packageJson: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}) => {
  const { dependencies = {}, devDependencies = {} } = packageJson;

  return Object.keys(dependencies).length > 0 || Object.keys(devDependencies).length > 0;
};

const parsePackageJson = (packageJsonPath: string) => {
  try {
    const raw = readFileSync(packageJsonPath, 'utf-8');

    return JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));

    return { error } as const;
  }
};

const runInstall = async (projectPath: string, packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn') => {
  const [executable, args] = INSTALL_COMMANDS[packageManager];
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let timedOut = false;
  const tempDir = ensureInstallTempDir(projectPath);

  const child = spawn(executable, args, {
    cwd: projectPath,
    env: {
      ...process.env,
      BUN_INSTALL_TMPDIR: tempDir,
      TEMP: tempDir,
      TMP: tempDir,
      TMPDIR: tempDir
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), FORCE_KILL_DELAY_MS);
    } catch {
      // Ignore kill errors
    }
  }, INSTALL_TIMEOUT_MS);

  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()));

  const [code] = (await once(child, 'close')) as [number | null, string | null];
  clearTimeout(timeoutId);

  if (timedOut) {
    throw new Error(`Dependency installation timed out after ${INSTALL_TIMEOUT_MS}ms`);
  }

  if (code === 0) {
    return;
  }

  const combined = [stderrChunks.join(''), stdoutChunks.join('')]
    .map((section) => section.trim())
    .filter(Boolean)
    .join('\n');
  const preview = combined
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, MAX_ERROR_PREVIEW_LINES)
    .join('\n');

  throw new Error(preview || `Dependency installation failed with exit code ${code ?? 'unknown'}`);
};

export const testDependencyInstallation = async (
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<DependencyInstallResult> => {
  const errors: string[] = [];
  const packageJsonPath = join(projectPath, 'package.json');
  const parsed = parsePackageJson(packageJsonPath);

  if ('error' in parsed) {
    errors.push(`Failed to parse package.json: ${parsed.error.message}`);

    return { errors, passed: false };
  }

  if (!hasDependenciesDeclared(parsed)) {
    return { errors: [], installTime: 0, passed: true };
  }

  const installStart = Date.now();

  try {
    await runInstall(projectPath, packageManager);
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    errors.push(error.message);

    return { errors, passed: false };
  }

  const installTime = Date.now() - installStart;

  return { errors: [], installTime, passed: true };
};

const parseCliArgs = () => {
  const [, , projectPath, packageManagerArg] = process.argv;
  const normalized = packageManagerArg as 'bun' | 'npm' | 'pnpm' | 'yarn' | undefined;

  return { packageManager: normalized ?? 'bun', projectPath } as const;
};

const runFromCli = async () => {
  const { packageManager, projectPath } = parseCliArgs();

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/dependency-installer-tester.ts <project-path> [package-manager]');
    process.exit(1);
  }

  const result = await testDependencyInstallation(projectPath, packageManager).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Dependency installation test error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ Dependency installation test failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ Dependency installation test passed');
  if (typeof result.installTime === 'number' && result.installTime > 0) {
    console.log(`  Installation time: ${result.installTime}ms`);
  }
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Dependency installer tester encountered an unexpected error:', error);
    process.exit(1);
  });
}
