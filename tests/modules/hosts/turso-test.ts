import { describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'turso-test';
describe('Turso Host Tests', () => {
  test('cleanup before tests', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
  test('should create project with turso host', async () => {
    const command = [
      'bun',
      'run',
      'src/index.ts',
      PROJECT_NAME,
      '--react',
      '--db',
      'sqlite',
      '--orm',
      'drizzle',
      '--db-host',
      'turso',
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
    const procedure = spawn({
      cmd: command,
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await procedure.exited;

    if (exitCode !== 0) {
         const stderr = await new Response(procedure.stderr).text();
  console.error('Turso CLI failed:', stderr.substring(0, 300));
    }

expect(exitCode).toBe(0);
  });
  test('project folder should exist', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    expect(existsSync(projectPath)).toBe(true);
  });
  test('package.json should have @libsql/client', () => {
    const packagePath = join(process.cwd(), PROJECT_NAME, 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(packageContent);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps['@libsql/client']).toBeDefined();
  });
   test('.env should NOT exist for hosted database (turso)', () => {
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
  test('server.ts should have correct turso import', () => {
    const serverPath = join(process.cwd(), PROJECT_NAME, 'src', 'backend', 'server.ts');
    expect(existsSync(serverPath)).toBe(true);
    
    const serverContent = readFileSync(serverPath, 'utf-8');
    expect(serverContent).toContain('@libsql/client');
  });
  test('cleanup after tests', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
    expect(existsSync(projectPath)).toBe(false);
  });
});
