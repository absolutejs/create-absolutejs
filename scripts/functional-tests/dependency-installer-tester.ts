/*
  Dependency Installer Tester
  Tests that dependencies can be installed successfully in scaffolded projects.
*/

import { $ } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type DependencyInstallResult = {
  passed: boolean;
  errors: string[];
  installTime?: number;
};

const INSTALL_TIMEOUT = 120000; // 2 minutes for dependency installation

export async function testDependencyInstallation(
  projectPath: string,
  packageManager: 'bun' | 'npm' | 'pnpm' | 'yarn' = 'bun'
): Promise<DependencyInstallResult> {
  const errors: string[] = [];
  const packageJsonPath = join(projectPath, 'package.json');
  const nodeModulesPath = join(projectPath, 'node_modules');

  // Check 1: package.json exists
  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${projectPath}`);
    return { passed: false, errors };
  }

  // Check 2: Parse package.json to verify it has dependencies
  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  } catch (e) {
    errors.push(`Failed to parse package.json: ${e}`);
    return { passed: false, errors };
  }

  const hasDependencies = 
    (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) ||
    (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0);

  if (!hasDependencies) {
    // No dependencies to install - this is valid for some configurations
    return { passed: true, errors: [], installTime: 0 };
  }

  // Check 3: Run dependency installation
  try {
    const startTime = Date.now();

    const installCommands: Record<string, string> = {
      bun: 'bun install',
      npm: 'npm install',
      pnpm: 'pnpm install',
      yarn: 'yarn install'
    };

    const installProcess = $`cd ${projectPath} && ${installCommands[packageManager]}`.quiet().nothrow();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        try {
          const killResult = installProcess.kill?.('SIGTERM');
          if (killResult === false || killResult === undefined) {
            installProcess.kill?.('SIGKILL');
          }
        } catch {
          // Ignore kill errors; process may have already exited.
        }
        reject(new Error('TIMEOUT'));
      }, INSTALL_TIMEOUT);
    });

    let result: Awaited<ReturnType<typeof $>>;
    try {
      result = await Promise.race([
        installProcess.finally(() => {
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

    const installTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      errors.push(`Dependency installation failed (exit code ${result.exitCode})`);
      if (result.stderr) {
        const stderrStr = result.stderr.toString();
        const errorLines = stderrStr
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .slice(0, 10);
        if (errorLines.length > 0) {
          errors.push(`Installation errors:\n${errorLines.join('\n')}`);
        }
      }
      return { passed: false, errors, installTime };
    }

    // Check 4: Verify node_modules was created (basic check)
    if (!existsSync(nodeModulesPath)) {
      errors.push(`node_modules directory not created after installation`);
      return { passed: false, errors, installTime };
    }

    return { passed: true, errors: [], installTime };
  } catch (e: any) {
    if (e.message === 'TIMEOUT') {
      errors.push(`Dependency installation timed out after ${INSTALL_TIMEOUT}ms`);
    } else if (e.signal === 'SIGTERM' || e.signal === 'SIGKILL') {
      errors.push(`Dependency installation timed out after ${INSTALL_TIMEOUT}ms`);
    } else {
      errors.push(`Dependency installation error: ${e.message || e}`);
    }
    return { passed: false, errors };
  }
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const packageManager = (process.argv[3] as any) || 'bun';

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/dependency-installer-tester.ts <project-path> [package-manager]');
    process.exit(1);
  }

  testDependencyInstallation(projectPath, packageManager)
    .then((result) => {
      if (result.passed) {
        console.log(`✓ Dependency installation test passed`);
        if (result.installTime !== undefined && result.installTime > 0) {
          console.log(`  Installation time: ${result.installTime}ms`);
        }
        process.exit(0);
      } else {
        console.error('✗ Dependency installation test failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ Dependency installation test error:', e);
      process.exit(1);
    });
}

