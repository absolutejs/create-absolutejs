/* eslint-disable import/no-unused-modules */
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { spawn } from 'bun';
import { describe, expect, test } from 'bun:test';

// Allow process usage in test environment
declare const process: { cwd(): string; env: Record<string, string> };

const PROJECT_NAME = 'neon-test';
describe('Neon Host Tests', () => {
  test('cleanup before tests', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { force: true, recursive: true });
    }
  });
  test('should create project with neon host', async () => {
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
      'neon',
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
    const proc = spawn({
      cmd: command, cwd: process.cwd(), stderr: 'pipe', stdout: 'pipe',
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
  test('project folder should exist', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    expect(existsSync(projectPath)).toBe(true);
  });
  test('package.json should have @neondatabase/serverless', () => {
    const pkgPath = join(process.cwd(), PROJECT_NAME, 'package.json');
    const pkgContent = readFileSync(pkgPath, 'utf-8');
    const pkg: { 
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    } = JSON.parse(pkgContent);
    const allDeps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps['@neondatabase/serverless']).toBeDefined();
  });
   test('.env should NOT exist for hosted database (neon)', () => {
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
  test('server.ts should have correct neon import', () => {
    const serverPath = join(process.cwd(), PROJECT_NAME, 'src', 'backend', 'server.ts');
    expect(existsSync(serverPath)).toBe(true);    
    const serverContent = readFileSync(serverPath, 'utf-8');
    expect(serverContent).toContain('@neondatabase/serverless');
  });
  test('cleanup after tests', () => {
    const projectPath = join(process.cwd(), PROJECT_NAME);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { force: true, recursive: true });
    }
    expect(existsSync(projectPath)).toBe(false);
  });
});