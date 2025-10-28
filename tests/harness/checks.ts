import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type CheckResult = { ok: boolean; msg: string };

export function dirExists(path: string, name: string): CheckResult {
  const exists = existsSync(path);
  return {
    ok: exists,
    msg: exists ? `${name}` : `Missing dir: ${name}`,
  };
}

export function fileExists(path: string, name: string): CheckResult {
  const exists = existsSync(path);
  return {
    ok: exists,
    msg: exists ? ` ${name}` : `Missing file: ${name}`,
  };
}

export function hasDeps(pkgPath: string, deps: string[]): CheckResult {
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

export function hasEnvVars(envPath: string, vars: string[]): CheckResult {
  if (!existsSync(envPath)) {
    return { ok: false, msg: '.env not found' };
  }

  const content = readFileSync(envPath, 'utf-8');
  const missing = vars.filter(v => !content.includes(v));

  if (missing.length === 0) {
    return { ok: true, msg: `All ${vars.length} env vars present` };
  }
  return { ok: false, msg: `Missing env vars: ${missing.join(', ')}` };
}

export function hasBuildOutput(projectPath: string): CheckResult {
  const dist = existsSync(join(projectPath, 'dist'));
  const build = existsSync(join(projectPath, 'build'));

  if (dist || build) {
    return { ok: true, msg: `Build output (${dist ? 'dist' : 'build'})` };
  }
  return { ok: false, msg: 'No build output (checked dist/ and build/)' };
}