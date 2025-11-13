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

interface HostConfig {
  name: string;
  dbEngine: string;
  package: string;
}

const HOSTS: HostConfig[] = [
  {
    dbEngine: 'postgresql', name: 'neon', package: '@neondatabase/serverless',
  },
  {
    dbEngine: 'mysql', name: 'planetscale', package: '@planetscale/database',
  },
  {
    dbEngine: 'sqlite', name: 'turso', package: '@libsql/client',
  },
];
const TIMEOUT_MINUTES = 1;
const MS_PER_MINUTE = 60_000;
const TIMEOUT = TIMEOUT_MINUTES * MS_PER_MINUTE;

interface TestResult { name: string; passed: boolean; }

const testHost = async (host: HostConfig) => {
  const projectName = `test-${host.name}`;
  const failResult: TestResult = { name: host.name, passed: false };
  const successResult: TestResult = { name: host.name, passed: true };

  console.log(`Testing: ${host.name.toUpperCase()}`);
  cleanup(projectName);
  const command: string[] = [
    'bun',
    'run',
    'src/index.ts',
    projectName,
    '--react',
    '--db',
    host.dbEngine,
    '--orm',
    'drizzle',
    '--db-host',
    host.name,
    '--auth',
    'none',
    '--eslint+prettier',
    '--tailwind',
    '--directory',
    'default',
    '--skip',
    '--no-install',
    '--no-git',
  ];

  console.log('\n Step 1 - Running CLI: ');
  const proc = spawn({
    cmd: command, cwd: process.cwd(), stderr: 'pipe', stdout: 'pipe',
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, TIMEOUT);

  const exitCode = await proc.exited;
  clearTimeout(timer);

  const checkTimeout = () => {
    if (!timedOut) return true;
    console.log('Failed: Timed out');

    return false;
  };

  const checkExitCode = async () => {
    if (exitCode === 0) return true;
    console.log('Failed: CLI returned error');
    const stderr = await new Response(proc.stderr).text();
    if (stderr) {
      const MAX_ERROR_LENGTH = 200;
      console.log('Error output: ', stderr.substring(0, MAX_ERROR_LENGTH));
    }

    return false;
  };

  if (!checkTimeout()) return failResult;
  if (!await checkExitCode()) return failResult;
  console.log('CLI completed successfully');

  console.log('\n Step 2 - Checking project folder: ');
  const projectPath = join(process.cwd(), projectName);
  if (!existsSync(projectPath)) {
    console.log('Failed: No project folder');

    return { name: host.name, passed: false };
  }
  console.log(' Project folder exists');

  console.log('\n Step 3 - Checking package.json: ');
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log('Failed: No package.json');

    return failResult;
  }

  const pkgContent = readFileSync(pkgPath, 'utf-8');
  const pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = JSON.parse(pkgContent);
  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (!allDeps[host.package]) {
    console.log(`Failed: Missing ${host.package}`);
    console.log('Available packages:', Object.keys(allDeps).filter(packageName => packageName.includes('data')));

    return failResult;
  }
  console.log(`Has ${host.package}`);

  console.log('\n Step 4 - Checking .env file (hosted databases should NOT have .env): ');
  const envPath = join(projectPath, '.env');
  if (existsSync(envPath)) {
    console.log(`Failed: .env file should NOT exist for hosted database (${host.name})`);
    console.log('Hosted databases expect DATABASE_URL to be provided by the user');

    return failResult;
  }
  console.log('Correctly no .env file for hosted database');

  console.log('\n Step 5 - Checking drizzle.config.ts: ');
  const drizzlePath = join(projectPath, 'drizzle.config.ts');
  if (!existsSync(drizzlePath)) {
    console.log('Failed: No drizzle.config.ts');

    return failResult;
  }

  const drizzleContent = readFileSync(drizzlePath, 'utf-8');
  if (!drizzleContent.includes('DATABASE_URL')) {
    console.log('Failed: drizzle.config.ts missing DATABASE_URL reference');

    return failResult;
  }

  if (!drizzleContent.includes('env.DATABASE_URL')) {
    console.log(' Warning: drizzle.config.ts should reference env.DATABASE_URL');
  }
  console.log(' drizzle.config.ts exists and references DATABASE_URL');

  console.log('\n Step 6 - Checking db/schema.ts: ');
  const schemaPath = join(projectPath, 'db', 'schema.ts');
  if (!existsSync(schemaPath)) {
    console.log(' Failed: No db/schema.ts');

    return failResult;
  }
  console.log(' db/schema.ts exists');

  console.log('\n Step 7 - Checking server.ts: ');
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (!existsSync(serverPath)) {
    console.log(' Failed: No server.ts');

    return failResult;
  }

  const serverContent = readFileSync(serverPath, 'utf-8');
  let hasCorrectImport = false;

  if (host.name === 'neon' && serverContent.includes('@neondatabase/serverless')) {
    hasCorrectImport = true;
  } else if (host.name === 'planetscale' && serverContent.includes('@planetscale/database')) {
    hasCorrectImport = true;
  } else if (host.name === 'turso' && serverContent.includes('@libsql/client')) {
    hasCorrectImport = true;
  }

  if (!hasCorrectImport) {
    console.log(` Failed: server.ts missing ${host.package} import`);

    return failResult;
  }
  console.log(' server.ts has correct database import');

  console.log(`${host.name.toUpperCase()} - ALL CHECKS PASSED`);
  
  return successResult;
}

const cleanup = (projectName: string) => {
  const projectPath = join(process.cwd(), projectName);
  if (existsSync(projectPath)) {
    rmSync(projectPath, { force: true, recursive: true });
  }
};

const runAllTests = async () => {
  console.log('DATABASE HOST CONFIGURATION TEST SUITE');
  console.log(`\nTesting ${HOSTS.length} hosted database providers`);
  console.log('\n Hosted databases (neon, planetscale, turso) do NOT');
  console.log('generate .env files. Users must provide DATABASE_URL in their');
  console.log('production environment. Tests verify configuration files are');
  console.log('set up to expect DATABASE_URL from the environment.\n');
  
  const results: TestResult[] = await Promise.all(HOSTS.map(testHost));
  
  console.log('TEST SUMMARY');
  
  const PAD_WIDTH = 15;
  const DEFAULT_COUNTS: { failed: number; passed: number } = { failed: 0, passed: 0 };

  const summary = results.reduce((acc, result) => ({
    failed: acc.failed + (result.passed ? 0 : 1),
    passed: acc.passed + (result.passed ? 1 : 0),
  }), DEFAULT_COUNTS);

  console.log(`\nResults: ${summary.passed} passed, ${summary.failed} failed\n`);

  results.forEach(result => {
    console.log(`${result.name.padEnd(PAD_WIDTH)} - ${result.passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log(`Total: ${results.length} | Passed: ${summary.passed} | Failed: ${summary.failed}`);

  console.log('\n🧹 Cleaning up test artifacts...');
  await Promise.all(HOSTS.map(host => cleanup(`test-${host.name}`)));
  console.log('Cleanup complete\n');

  if (summary.failed > 0) {
    console.error('Some tests failed');
    process.exit(1);
  }
  
  console.log('All tests passed!');
  console.log('\n Database host configuration verification complete!\n');
  process.exit(0);
}

runAllTests();