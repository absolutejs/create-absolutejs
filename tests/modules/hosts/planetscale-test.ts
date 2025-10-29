import { describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'planetscale-test';
describe('PlanetScale Host Tests', () => {
  test('cleanup before tests', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
  test('should create project with planetscale host', async () => {
   const command = [
      'bun',
      'run',
      'src/index.ts',
      PROJECT_NAME,
      '--react',
      '--db',
      'postgresql',
      '--orm',
      'drizzle',
      '--db-host',
      'planetscale',
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
    const processes = spawn({
      cmd: command,
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await processes.exited;
    if (exitCode !== 0) {
        const stderr = await new Response(processes.stderr).text();
        const stdout = await new Response(processes.stdout).text();
        console.error('CLI failed with exit code:', exitCode);
        console.error('stderr:', stderr.substring(0, 500));
        console.error('stdout:', stdout.substring(0, 500));
    }

expect(exitCode).toBe(0);
  });
  test('project folder should exist', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    expect(existsSync(projectPath)).toBe(true);
  });
  test('package.json should have @planetscale/database', () => {
    const packagePath = join(process.cwd(), PROJECT_NAME, 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(packageContent);

    const allDependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDependencies['@planetscale/database']).toBeDefined();
  });
   test('.env should NOT exist for hosted database (planetscale)', () => {
    const envPath = join(process.cwd(), PROJECT_NAME, '.env');
    expect(existsSync(envPath)).toBe(false);
    });
 test('drizzle.config.ts should exist and reference DATABASE_URL', () => {
    const drizzlePath = join(process.cwd(), PROJECT_NAME, 'drizzle.config.ts');
    expect(existsSync(drizzlePath)).toBe(true);
    const drizzleContent = readFileSync(drizzlePath, 'utf-8');
    expect(drizzleContent).toContain('DATABASE_URL');
    expect(drizzleContent).toContain('env.DATABASE_URL');
  });
  test('db/schema.ts should exist', () => {
    const schemaPath = join(process.cwd(), PROJECT_NAME, 'db', 'schema.ts');
    expect(existsSync(schemaPath)).toBe(true);
  });
  test('server.ts should have correct planetscale import', () => {
    const serverPath = join(process.cwd(), PROJECT_NAME, 'src', 'backend', 'server.ts');
    expect(existsSync(serverPath)).toBe(true);
    
    const serverContent = readFileSync(serverPath, 'utf-8');
    expect(serverContent).toContain('@planetscale/database');
  });
  test('cleaning up aftert the testing', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
    expect(existsSync(projectPath)).toBe(false);
  });
});
