import { spawn } from 'bun';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
const HOSTS = [
  {
    name: 'neon',
    dbEngine: 'postgresql',
    package: '@neondatabase/serverless',
  },
  {
    name: 'planetscale',
    dbEngine: 'mysql',
    package: '@planetscale/database',
  },
  {
    name: 'turso',
    dbEngine: 'sqlite',
    package: '@libsql/client',
  },
];
const TIMEOUT = 60_000;
async function testHost(host: { name: string; dbEngine: string; package: string; }) {
  const projectName = `test-${host.name}`;
  console.log(`Testing: ${host.name.toUpperCase()}`); 
  cleanup(projectName);
  const command = [
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
    cmd: command,
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, TIMEOUT);

  const exitCode = await proc.exited;
  clearTimeout(timer);

  if (timedOut) {
    console.log('Failed: Timed out');
    return false;
  }

  if (exitCode !== 0) {
    console.log('Failed: CLI returned error');
    const stderr = await new Response(proc.stderr).text();
    if (stderr) {
      console.log('Error output: ', stderr.substring(0, 200));
    }
    return false;
  }
  console.log('CLI completed successfully');

  console.log('\n Step 2 - Checking project folder: ');
  const projectPath = join(process.cwd(), projectName);
  if (!existsSync(projectPath)) {
    console.log('Failed: No project folder');
    return false;
  }
  console.log('Project folder exists');

  console.log('\n Step 3 - Checking package.json: ');
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log('Failed: No package.json');
    return false;
  }

  const pkgContent = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (!allDeps[host.package]) {
    console.log(`Failed: Missing ${host.package}`);
    console.log('Available packages:', Object.keys(allDeps).filter(p => p.includes('data')));
    return false;
  }
  console.log(`Has ${host.package}`);

  console.log('\n Step 4 - Checking .env file (hosted databases should NOT have .env): ');
  const envPath = join(projectPath, '.env');
  if (existsSync(envPath)) {
    console.log(`Failed: .env file should NOT exist for hosted database (${host.name})`);
    console.log('Hosted databases expect DATABASE_URL to be provided by the user');
    return false;
  }
  console.log('Correctly no .env file for hosted database');

  console.log('\n Step 5 - Checking drizzle.config.ts: ');
  const drizzlePath = join(projectPath, 'drizzle.config.ts');
  if (!existsSync(drizzlePath)) {
    console.log('Failed: No drizzle.config.ts');
    return false;
  }

  const drizzleContent = readFileSync(drizzlePath, 'utf-8');
  if (!drizzleContent.includes('DATABASE_URL')) {
    console.log('Failed: drizzle.config.ts missing DATABASE_URL reference');
    return false;
  }

  if (!drizzleContent.includes('env.DATABASE_URL')) {
    console.log(' Warning: drizzle.config.ts should reference env.DATABASE_URL');
  }
  console.log(' drizzle.config.ts exists and references DATABASE_URL');

  console.log('\n Step 6 - Checking db/schema.ts: ');
  const schemaPath = join(projectPath, 'db', 'schema.ts');
  if (!existsSync(schemaPath)) {
    console.log(' Failed: No db/schema.ts');
    return false;
  }
  console.log(' db/schema.ts exists');

  console.log('\n Step 7 - Checking server.ts: ');
  const serverPath = join(projectPath, 'src', 'backend', 'server.ts');
  if (!existsSync(serverPath)) {
    console.log(' Failed: No server.ts');
    return false;
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
    return false;
  }
  console.log(' server.ts has correct database import');

  console.log(`${host.name.toUpperCase()} - ALL CHECKS PASSED`);
  
  return true;
}

function cleanup(projectName: string) {
  const projectPath = join(process.cwd(), projectName);
  if (existsSync(projectPath)) {
    rmSync(projectPath, { recursive: true, force: true });
  }
}

async function runAllTests() {
  console.log('DATABASE HOST CONFIGURATION TEST SUITE');
  console.log(`\nTesting ${HOSTS.length} hosted database providers`);
  console.log('\n Hosted databases (neon, planetscale, turso) do NOT');
  console.log('generate .env files. Users must provide DATABASE_URL in their');
  console.log('production environment. Tests verify configuration files are');
  console.log('set up to expect DATABASE_URL from the environment.\n');

  const results = [];
  
  for (const host of HOSTS) {
    const passed = await testHost(host);
    results.push({
      name: host.name,
      passed: passed,
    });
  }
  console.log('TEST SUMMARY');
  
  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.passed) {
      console.log(`${result.name.padEnd(15)} - PASSED`);
      passCount++;
    } else {
      console.log(`${result.name.padEnd(15)} - FAILED`);
      failCount++;
    }
  }
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);

  console.log('\n🧹 Cleaning up test artifacts...');
  for (const host of HOSTS) {
    cleanup(`test-${host.name}`);
  }
  console.log('Cleanup complete\n');

  if (failCount > 0) {
    console.error('Some tests failed');
    process.exit(1);
  } else {
    console.log('All tests passed!');
    console.log('\n Database host configuration verification complete!\n');
    process.exit(0);
  }
}

runAllTests();