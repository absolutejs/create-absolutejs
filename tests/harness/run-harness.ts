import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  COMBO,
  FLAGS,
  PROJECT_NAME,
  CLI_PATH,
  OUTPUT_PATH,
  TIMEOUTS,
  EXPECTED,
} from './constants';
import { exec, runCLI } from './exec';
import {
  dirExists,
  fileExists,
  hasDeps,
  hasEnvVars,
  hasBuildOutput,
} from './checks';

const phase = (name: string) => console.log(`${name}`);
const info = (msg: string) => console.log(`  ${msg}`);
const error = (msg: string) => console.error(`${msg}`);
const success = (msg: string) => console.log(`${msg}`);

let failed = false;
const results: { phase: string; checks: Array<{ ok: boolean; msg: string }> }[] = [];

function runChecks(phaseName: string, checks: Array<{ ok: boolean; msg: string }>) {
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
    hasEnvVars(join(OUTPUT_PATH, '.env'), EXPECTED.envVars),
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
    fileExists(join(OUTPUT_PATH, 'bun.lockb'), 'bun.lockb'),
  ];

  runChecks('Install', checks);
}

async function build() {
  phase('BUILD');
  const result = await exec('bun', ['run', 'build'], OUTPUT_PATH, TIMEOUTS.build);

  if (!result.ok) {
    error(`Build failed with exit code ${result.code}`);
    if (result.stderr) console.error(result.stderr);
    throw new Error('Build failed');
  }

  const checks = [hasBuildOutput(OUTPUT_PATH)];
  runChecks('Build', checks);
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
  console.log('React + Elysia + PostgreSQL + Prisma + Citra');
  console.log('═'.repeat(60));

  try {
    await cleanup();
    await scaffold();
    await validate();
    await install();
    await build();
  } catch (e) {
    error(`\nAborted: ${e instanceof Error ? e.message : e}`);
  } finally {
    summary();
  }

  process.exit(failed ? 1 : 0);
}

main();