/*
  Build Validator
  Tests that scaffolded projects can compile TypeScript successfully.
*/

import { $ } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type BuildResult = {
  passed: boolean;
  errors: string[];
  compileTime?: number;
};

const COMPILE_TIMEOUT = 60000; /**
 * Validates that a scaffolded project compiles by checking for tsconfig.json, ensuring package.json has a `typecheck` script, and running that script.
 *
 * @param projectPath - Path to the project directory to validate
 * @param packageManager - Package manager to run the `typecheck` script with (`'bun' | 'npm' | 'pnpm' | 'yarn'`); defaults to `'bun'`
 * @returns A BuildResult where `passed` is `true` when compilation succeeds, `errors` contains failure messages when present, and `compileTime` (milliseconds) is included when a compilation attempt was performed
 */

export async function validateBuild(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<BuildResult> {
  const errors: string[] = [];
  const tsconfigPath = join(projectPath, 'tsconfig.json');
  const packageJsonPath = join(projectPath, 'package.json');

  // Check 1: tsconfig.json exists
  if (!existsSync(tsconfigPath)) {
    errors.push(`tsconfig.json not found: ${tsconfigPath}`);
    return { passed: false, errors };
  }

  // Check 2: package.json has typecheck script
  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${projectPath}`);
    return { passed: false, errors };
  }

  let packageJson: { scripts?: Record<string, string> };
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  } catch (e) {
    errors.push(`Failed to parse package.json: ${e}`);
    return { passed: false, errors };
  }

  if (!packageJson.scripts || !packageJson.scripts.typecheck) {
    errors.push(`No 'typecheck' script found in package.json`);
    return { passed: false, errors };
  }

  // Check 3: Run TypeScript compilation
  try {
    const startTime = Date.now();

    // Use Promise.race for timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), COMPILE_TIMEOUT);
    });

    const result = await Promise.race([
      $`cd ${projectPath} && ${packageManager} run typecheck`.quiet().nothrow(),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof $>>;

    const compileTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      errors.push(`TypeScript compilation failed (exit code ${result.exitCode})`);
      // Capture both stdout and stderr
      const output = [
        result.stdout?.toString() || '',
        result.stderr?.toString() || ''
      ].join('\n');
      
      if (output) {
        // Extract error lines (TypeScript errors typically start with file paths or "error TS")
        const errorLines = output
          .split('\n')
          .filter((line) => {
            const trimmed = line.trim();
            return trimmed.length > 0 && 
                   (trimmed.includes('error TS') || 
                    trimmed.includes('error:') ||
                    trimmed.match(/^[^(]+\(\d+,\d+\):/)); // File path with line numbers
          })
          .slice(0, 15); // Show first 15 error lines
        
        if (errorLines.length > 0) {
          errors.push(`Compilation errors:\n${errorLines.join('\n')}`);
        } else {
          // If no specific errors found, show first part of output
          errors.push(`Compilation output:\n${output.split('\n').slice(0, 10).join('\n')}`);
        }
      }
      return { passed: false, errors, compileTime };
    }

    return { passed: true, errors: [], compileTime };
  } catch (e: any) {
    if (e.message === 'TIMEOUT') {
      errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT}ms`);
    } else if (e.signal === 'SIGTERM' || e.signal === 'SIGKILL') {
      errors.push(`TypeScript compilation timed out after ${COMPILE_TIMEOUT}ms`);
    } else {
      errors.push(`TypeScript compilation error: ${e.message || e}`);
    }
    return { passed: false, errors };
  }
}

// CLI usage
if (import.meta.main) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/build-validator.ts <project-path> [package-manager]');
    process.exit(1);
  }

  validateBuild(projectPath, packageManager)
    .then((result) => {
      if (result.passed) {
        console.log(`✓ Build validation passed`);
        if (result.compileTime) {
          console.log(`  Compilation time: ${result.compileTime}ms`);
        }
        process.exit(0);
      } else {
        console.error('✗ Build validation failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Build validation error:', e);
      process.exit(1);
    });
}
