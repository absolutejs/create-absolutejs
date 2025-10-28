import { spawn } from 'bun';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const COMBO = {
  frontend: 'react',
  backend: 'elysia',
  database: 'postgresql',
  orm: 'drizzle',  
  auth: 'absoluteAuth', 
  host: 'neon',
  codeQuality: 'eslint+prettier',
  tailwind: true,
  git: true,
};
const FLAGS = [
  '--react',
  '--db', 'postgresql',
  '--orm', 'drizzle',     
  '--auth', 'absoluteAuth', 
  '--db-host', 'neon',
  '--eslint+prettier',
  '--tailwind',
  '--directory', 'default',
  '--git',
  '--skip',
  '--install',
];

const PROJECT_NAME = 'test-scaffold';
const REPO_ROOT = process.cwd();
const CLI_PATH = join(REPO_ROOT, 'src', 'index.ts');
const OUTPUT_PATH = join(REPO_ROOT, PROJECT_NAME);
const TIMEOUTS = {
  scaffold: 180_000,  
  install: 180_000,
};
const EXPECTED = {
  dirs: ['src', 'src/frontend', 'src/backend', 'db'],
  files: [
    'package.json',
    'tsconfig.json',
    'src/backend/server.ts',
    'db/schema.ts',  
  ],
  deps: [
    'drizzle-orm',    
    'react',
    'elysia',
    '@absolutejs/absolute',
    '@absolutejs/auth',
  ],
};
type ExecResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
};
type CheckResult = {
  ok: boolean;
  msg: string;
};
const phase = (name: string) => console.log(`\n\x1b[1m\x1b[36m▶ ${name}\x1b[0m`);
const info = (msg: string) => console.log(`  ${msg}`);
const error = (msg: string) => console.error(`[31m  ${msg}[0m`);
const success = (msg: string) => console.log(`[32m  ${msg}[0m`);
async function exec(cmd: string, args: string[], cwd: string, timeoutMs?: number): Promise<ExecResult> {
  const fullCmd = `${cmd} ${args.join(' ')}`;
  console.log(`[90m$ ${fullCmd}[0m`);

  const proc = spawn({
    cmd: [cmd, ...args],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
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
      ok: false,
      code: 124,
      stdout,
      stderr: `Command timed out after ${timeoutMs}ms\n${stderr}`,
    };
  }

  return { ok: code === 0, code, stdout, stderr };
}

function runCLI(cliPath: string, flags: string[], projectName: string, timeout: number): Promise<ExecResult> {
  return exec('bun', ['run', cliPath, projectName, ...flags], process.cwd(), timeout);
}

function dirExists(path: string, name: string): CheckResult {
  const exists = existsSync(path);
  return {
    ok: exists,
    msg: exists ? `${name}` : `Missing dir: ${name}`,
  };
}

function fileExists(path: string, name: string): CheckResult {
  const exists = existsSync(path);
  return {
    ok: exists,
    msg: exists ? `${name}` : `Missing file: ${name}`,
  };
}

// verify all required dependencies are in package.json
function hasDeps(pkgPath: string, deps: string[]): CheckResult {
  if (!existsSync(pkgPath)) {
    return { ok: false, msg: 'package.json not found' };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const missing = deps.filter(d => !allDeps[d]);

    if (missing.length === 0) {
      return { ok: true, msg: `All ${deps.length} deps present` };
    }
    return { ok: false, msg: `Missing deps: ${missing.join(', ')}` };
  } catch (e) {
    return { ok: false, msg: `Failed to parse package.json: ${e}` };
  }
}

let failed = false;
const results: { phase: string; checks: CheckResult[] }[] = [];

function runChecks(phaseName: string, checks: CheckResult[]) {
  results.push({ phase: phaseName, checks });
  
  for (const check of checks) {
    if (check.ok) {
      success(check.msg);
    } else {
      error(check.msg);
      failed = true;
    }
  }
  
  if (checks.some(c => !c.ok)) {
    throw new Error(`${phaseName} failed`);
  }
}

async function cleanup() {
  phase('CLEANUP');
  if (existsSync(OUTPUT_PATH)) {
    info(`Removing old project: ${PROJECT_NAME}`);
    rmSync(OUTPUT_PATH, { recursive: true, force: true });
  }
  info(`Testing combo: ${COMBO.frontend} + ${COMBO.orm} + ${COMBO.database}`);
}

async function scaffold() {
  phase('SCAFFOLD');
  const result = await runCLI(CLI_PATH, FLAGS, PROJECT_NAME, TIMEOUTS.scaffold);

  if (!result.ok) {
    error(`CLI failed with exit code ${result.code}`);
    if (result.stderr) console.error(result.stderr);
    throw new Error('Scaffolding failed');
  }

  success(`Project created: ${PROJECT_NAME}`);
}

async function validate() {
  phase('VALIDATE');
  
  const checks = [
    ...EXPECTED.dirs.map(d => dirExists(join(OUTPUT_PATH, d), d)),
    ...EXPECTED.files.map(f => fileExists(join(OUTPUT_PATH, f), f)),
    hasDeps(join(OUTPUT_PATH, 'package.json'), EXPECTED.deps),
  ];
  runChecks('Validation', checks);
}

async function install() {
  phase('INSTALL');
  const result = await exec('bun', ['install'], OUTPUT_PATH, TIMEOUTS.install);
  if (!result.ok) {
    error(`Install failed with exit code ${result.code}`);
    if (result.stderr) console.error(result.stderr);
    throw new Error('Install failed');
  }
  const checks = [
    dirExists(join(OUTPUT_PATH, 'node_modules'), 'node_modules'),
    fileExists(join(OUTPUT_PATH, 'bun.lock'), 'bun.lock'),
  ];

  runChecks('Install', checks);
}

function summary() {
  phase('SUMMARY');
  const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
  const passed = results.reduce((sum, r) => sum + r.checks.filter(c => c.ok).length, 0);
  console.log(`\n  Total: ${totalChecks} checks`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${totalChecks - passed}`);
  if (failed) {
    error('\n HARNESS FAILED\n');
    console.log('Failed checks:');
    for (const r of results) {
      const failedChecks = r.checks.filter(c => !c.ok);
      if (failedChecks.length > 0) {
        console.log(`\n${r.phase}:`);
        failedChecks.forEach(c => error(`  ${c.msg}`));
      }
    }
  } else {
    success('\n ALL TESTS PASSED\n');
    info(`Project location: ${OUTPUT_PATH}`);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('AbsoluteJS Scaffold Test Harness');
  console.log('React + Elysia + PostgreSQL + Drizzle + Absolute-Auth');
  console.log('═'.repeat(60));

  try {
    await cleanup();
    await scaffold();
    await validate();
    await install();
  } catch (e) {
    error(`\nAborted: ${e instanceof Error ? e.message : e}`);
  } finally {
    summary();
  }
  process.exit(failed ? 1 : 0);
}
main();
