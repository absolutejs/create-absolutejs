/* eslint-disable import/no-unused-modules */
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { spawn } from 'bun';

// Allow process usage in test environment
declare const process: { 
  cwd(): string; 
  env: Record<string, string>;
  exit(code: number): never;
};

const SCAFFOLD_NAME = 'test-scaffold';
const PROJECT_PATH = join(process.cwd(), SCAFFOLD_NAME);

// Test configuration removed - using direct flags instead
// Test configuration

const PROJECT_NAME = 'test-scaffold';
const REPO_ROOT = process.cwd();
const CLI_PATH = join(REPO_ROOT, 'src', 'index.ts');
const OUTPUT_PATH = join(REPO_ROOT, PROJECT_NAME);
// Time constants in milliseconds
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
const TIMEOUT_MINUTES = 3;
const INSTALL_TIMEOUT_MS = TIMEOUT_MINUTES * MINUTE_MS;
const SCAFFOLD_TIMEOUT_MS = TIMEOUT_MINUTES * MINUTE_MS;

interface Timeouts {
  install: number;
  scaffold: number;
}

interface Expected {
  deps: string[];
  dirs: string[];
  files: string[];
}

const FLAGS = ['--react', '--db', 'postgresql', '--orm', 'drizzle', '--auth', 'absoluteAuth', 
  '--db-host', 'neon', '--eslint+prettier', '--tailwind', '--directory', 'default', '--git',
  '--skip', '--install'];

const TIMEOUTS = {
  install: INSTALL_TIMEOUT_MS,
  scaffold: SCAFFOLD_TIMEOUT_MS,
} satisfies Timeouts;

const EXPECTED = {
  deps: ['drizzle-orm', 'react', 'elysia', '@absolutejs/absolute', '@absolutejs/auth'],
  dirs: ['src', 'src/frontend', 'src/backend', 'db'],
  files: ['package.json', 'tsconfig.json', 'src/backend/server.ts', 'db/schema.ts'],
} satisfies Expected;
interface CheckResult { msg: string; ok: boolean; }

const phase = (name: string) => console.log(`${name}`);
const info = (msg: string) => console.log(`${msg}`);
const error = (msg: string) => console.error(`${msg}`);
const success = (msg: string) => console.log(`${msg}`);
const exec = async (cmd: string, args: string[], cwd: string, timeoutMs?: number) => {
  const fullCmd = `${cmd} ${args.join(' ')}`;
  console.log(`${fullCmd}`);

  const proc = spawn({
    cmd: [cmd, ...args], cwd, stderr: 'pipe', stdout: 'pipe',
  });

  let timedOut = false;
  const timer = timeoutMs ? setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs) : undefined;

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;

  if (timer) clearTimeout(timer);

  if (timedOut) {
    return {
      code: 124, ok: false, stderr: `Command timed out after ${timeoutMs}ms\n${stderr}`, stdout,
    };
  }

  return { code, ok: code === 0, stderr, stdout };
}

const runCLI = (cliPath: string, flags: string[], projectName: string, timeout: number) => 
  exec('bun', ['run', cliPath, projectName, ...flags], process.cwd(), timeout);

const checkExists = (path: string, name: string, type: 'file' | 'dir') => {
  const pathExists = existsSync(path);

  return {
    msg: pathExists ? `${name}` : `Missing ${type}: ${name}`,
    ok: pathExists,
  } as const;
};

const dirExists = (path: string, name: string) => checkExists(path, name, 'dir');
const fileExists = (path: string, name: string) => checkExists(path, name, 'file');

const hasDeps = (pkgPath: string, deps: string[]) => {
  if (!existsSync(pkgPath)) {
    return { msg: 'package.json not found', ok: false } as const;
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const missing = deps.filter(dep => !allDeps[dep]);

    return missing.length === 0 
      ? { msg: `All ${deps.length} deps present`, ok: true } as const
      : { msg: `Missing deps: ${missing.join(', ')}`, ok: false } as const;
  } catch (err) {
    return { msg: `Failed to parse package.json: ${err}`, ok: false } as const;
  }
}

let failed = false;
const results: { phase: string; checks: CheckResult[] }[] = [];

const runChecks = (phaseName: string, checks: CheckResult[]) => {
  results.push({ checks, phase: phaseName });
  
  checks.forEach(check => {
    if (check.ok) {
      success(check.msg);

      return;
    }
    
    error(check.msg);
    failed = true;
  });

  if (checks.every(check => !check.ok)) {
    throw new Error(`${phaseName} failed`);
  }
}

const cleanup = () => {
  console.log('Cleaning up previous test runs...');
  if (existsSync(PROJECT_PATH)) {
    rmSync(PROJECT_PATH, { recursive: true });
  }
};

const scaffold = async () => {
  phase('SCAFFOLD');
  const result = await runCLI(CLI_PATH, FLAGS, PROJECT_NAME, TIMEOUTS.scaffold);

  if (!result.ok) {
    error(`CLI failed with exit code ${result.code}`);
    if (result.stderr) console.error(result.stderr);
    throw new Error('Scaffolding failed');
  }

  success(`Project created: ${PROJECT_NAME}`);
};

const validate = async (): Promise<void> => {
  phase('VALIDATE');
  
  const allChecks = [
    ...EXPECTED.dirs.map(dir => dirExists(join(OUTPUT_PATH, dir), dir)),
    ...EXPECTED.files.map(file => fileExists(join(OUTPUT_PATH, file), file)),
  ] as const;
  
  const depCheck = hasDeps(join(OUTPUT_PATH, 'package.json'), EXPECTED.deps);
  const checks = [...allChecks, depCheck];
  
  runChecks('Validation', checks);
};

const install = async (): Promise<void> => {
  phase('INSTALL');
  const result = await exec('bun', ['install'], OUTPUT_PATH, TIMEOUTS.install);
  
  if (!result.ok) {
    if (result.stderr) console.error(result.stderr);
    throw new Error(`Install failed with exit code ${result.code}`);
  }
  
  const checks = [
    dirExists(join(OUTPUT_PATH, 'node_modules'), 'node_modules'),
    fileExists(join(OUTPUT_PATH, 'bun.lock'), 'bun.lock'),
  ];

  runChecks('Install', checks);
};

const printFailedChecks = () => {
  error('\n HARNESS FAILED\n');
  console.log('Failed checks:');
  
  results
    .filter(result => result.checks.some(check => !check.ok))
    .forEach(result => {
      console.log(`\n${result.phase}:`);
      result.checks
        .filter(check => !check.ok)
        .forEach(check => error(`  ${check.msg}`));
    });
};

const printSuccess = () => {
  success('\n ALL TESTS PASSED\n');
  info(`Project location: ${OUTPUT_PATH}`);
};

const summary = () => {
  phase('SUMMARY');
  const totalChecks = results.reduce((sum, result) => sum + result.checks.length, 0);
  const passed = results.reduce((sum, result) => sum + result.checks.filter(check => check.ok).length, 0);
  
  console.log(`\n  Total: ${totalChecks} checks`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${totalChecks - passed}`);
  
  if (failed) {
    printFailedChecks();

    return;
  }
  
  printSuccess();
};

const main = async () => {
  const SEPARATOR_LENGTH = 60;
  console.log('═'.repeat(SEPARATOR_LENGTH));
  console.log('AbsoluteJS Scaffold Test Harness');
  console.log('React + Elysia + PostgreSQL + Drizzle + Absolute-Auth');
  console.log('═'.repeat(SEPARATOR_LENGTH));

  try {
    await cleanup();
    await scaffold();
    await validate();
    await install();
  } catch (err) {
    error(`\nAborted: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    summary();
  }
  process.exit(failed ? 1 : 0);
}
main();
