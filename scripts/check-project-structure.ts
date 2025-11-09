/*
  Minimal structure check for scaffolded projects.
  Validates only what's essential for functional testing:
  - Project directory exists
  - Can access project directory
  - package.json exists (needed for dependency installation)
*/

import { existsSync, statSync } from 'fs';
import { join } from 'path';

type CheckResult = {
  passed: boolean;
  errors: string[];
};

/**
 * Validate that a scaffolded project path exists, is a directory, and contains a file named `package.json`.
 *
 * @param projectPath - Filesystem path to the project directory to validate
 * @returns A `CheckResult` where `passed` is `true` if all checks succeed; otherwise `passed` is `false` and `errors` contains descriptive failure messages
 */
export function checkProjectStructure(projectPath: string): CheckResult {
  const errors: string[] = [];

  // Check 1: Project directory exists
  if (!existsSync(projectPath)) {
    errors.push(`Project directory does not exist: ${projectPath}`);
    return { passed: false, errors };
  }

  // Check 2: Project is a directory (not a file)
  let stats;
  try {
    stats = statSync(projectPath);
  } catch (error: any) {
    errors.push(`Failed to stat project directory ${projectPath}: ${error?.message ?? error}`);
    return { passed: false, errors };
  }
  if (!stats.isDirectory()) {
    errors.push(`Project path exists but is not a directory: ${projectPath}`);
    return { passed: false, errors };
  }

  // Check 3: package.json exists (essential for functional testing)
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    errors.push(`package.json not found in project: ${projectPath}`);
    return { passed: false, errors };
  }

  // Check 4: package.json is a file (not a directory)
  let packageJsonStats;
  try {
    packageJsonStats = statSync(packageJsonPath);
  } catch (error: any) {
    errors.push(`Failed to stat package.json at ${packageJsonPath}: ${error?.message ?? error}`);
    return { passed: false, errors };
  }
  if (!packageJsonStats.isFile()) {
    errors.push(`package.json exists but is not a file: ${packageJsonPath}`);
    return { passed: false, errors };
  }

  return { passed: true, errors: [] };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];

  if (!projectPath) {
    console.error('Usage: bun run scripts/check-project-structure.ts <project-path>');
    process.exit(1);
  }

  const result = checkProjectStructure(projectPath);

  if (result.passed) {
    console.log(`✓ Structure check passed for: ${projectPath}`);
    process.exit(0);
  } else {
    console.error('✗ Structure check failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
}
