/*
  Server Startup Validator
  Tests that scaffolded projects can compile and their server structure is valid.
  For actual server startup testing, we validate compilation and basic structure.
*/

import { $ } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ServerStartupResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  compileTime?: number;
};

const COMPILE_TIMEOUT = 60000; /**
 * Validates that a scaffolded project contains a basic Elysia server structure and, when configured, that TypeScript compiles successfully.
 *
 * Performs these checks: verifies src/backend/server.ts exists and contains an Elysia initialization, ensures package.json exists with a `dev` script, and if tsconfig.json is present runs the project's `typecheck` script via the specified package manager (subject to a timeout).
 *
 * @param projectPath - Filesystem path to the root of the scaffolded project to validate
 * @param packageManager - Package manager to use when invoking the `typecheck` script (`'bun' | 'npm' | 'pnpm' | 'yarn'`)
 * @returns An object with:
 *  - `passed`: `true` when all required checks (and optional compilation) succeed, `false` otherwise.
 *  - `errors`: an array of error messages describing failed checks.
 *  - `warnings`: an array of warning messages (for non-fatal issues such as missing tsconfig.json).
 *  - `compileTime` (optional): compilation duration in milliseconds when a typecheck was performed.
 */

export async function validateServerStartup(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<ServerStartupResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const serverFilePath = join(projectPath, 'src', 'backend', 'server.ts');
  const packageJsonPath = join(projectPath, 'package.json');
  const tsconfigPath = join(projectPath, 'tsconfig.json');

  // Check 1: Server file exists
  if (!existsSync(serverFilePath)) {
    errors.push(`Server file not found: ${serverFilePath}`);
    return { passed: false, errors, warnings: [] };
  }

  // Check 2: package.json exists and has dev script
  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${projectPath}`);
    return { passed: false, errors, warnings: [] };
  }

  let packageJson: { scripts?: Record<string, string> };
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  } catch (e) {
    errors.push(`Failed to parse package.json: ${e}`);
    return { passed: false, errors, warnings: [] };
  }

  if (!packageJson.scripts || !packageJson.scripts.dev) {
    errors.push(`No 'dev' script found in package.json`);
    return { passed: false, errors, warnings: [] };
  }

  // Check 3: Server file has valid structure (basic syntax check)
  try {
    const serverContent = readFileSync(serverFilePath, 'utf-8');
    if (!serverContent.includes('new Elysia()')) {
      errors.push(`Server file missing Elysia initialization`);
      return { passed: false, errors, warnings: [] };
    }
    // Elysia servers may or may not have .listen() - it depends on how AbsoluteJS sets it up
    // We'll check compilation instead
  } catch (e) {
    errors.push(`Failed to read server file: ${e}`);
    return { passed: false, errors, warnings: [] };
  }

  // Check 4: TypeScript compilation (most important functional check)
  if (!existsSync(tsconfigPath)) {
    warnings.push(`tsconfig.json not found - skipping compilation check`);
  } else {
    try {
      const startTime = Date.now();
      
      const compileProcess = $`cd ${projectPath} && ${packageManager} run typecheck`.quiet().nothrow();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          try {
            const killed = compileProcess.kill?.('SIGTERM');
            if (killed === false || killed === undefined) {
              compileProcess.kill?.('SIGKILL');
            }
          } catch {
            // Ignore kill errors (process may have already exited)
          }
          reject(new Error('TIMEOUT'));
        }, COMPILE_TIMEOUT);
      });

      let result: Awaited<ReturnType<typeof $>>;
      try {
        result = await Promise.race([
          compileProcess.finally(() => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }
          }),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof $>>;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      const compileTime = Date.now() - startTime;

      if (result.exitCode !== 0) {
        errors.push(`TypeScript compilation failed (exit code ${result.exitCode})`);
        if (result.stderr) {
          const stderrLines = result.stderr.toString().split('\n').slice(0, 5);
          errors.push(`Compilation errors: ${stderrLines.join('; ')}`);
        }
        return { passed: false, errors, warnings, compileTime };
      }
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT}ms`);
      } else if (e.signal === 'SIGTERM' || e.signal === 'SIGKILL') {
        errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT}ms`);
      } else {
        errors.push(`TypeScript compilation error: ${e.message || e}`);
      }
      return { passed: false, errors, warnings };
    }
  }

  return { passed: true, errors: [], warnings };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/server-startup-validator.ts <project-path> [package-manager]');
    process.exit(1);
  }

  validateServerStartup(projectPath, packageManager)
    .then((result) => {
      if (result.passed) {
        console.log(`✓ Server startup validation passed`);
        if (result.compileTime) {
          console.log(`  Compilation time: ${result.compileTime}ms`);
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
        }
        process.exit(0);
      } else {
        console.error('✗ Server startup validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
        }
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Server startup validation error:', e);
      process.exit(1);
    });
}
