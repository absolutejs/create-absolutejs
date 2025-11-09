import { existsSync, rmSync } from 'fs';

/**
 * Remove a generated project directory if it exists.
 *
 * Attempts to remove `projectPath` recursively and forcibly; if removal fails the error is caught
 * and a warning is logged containing the path and the error message.
 *
 * @param projectPath - Filesystem path of the project directory to remove
 */
export function cleanupProjectDirectory(projectPath: string): void {
  try {
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(
      `Warning: Failed to clean up project directory "${projectPath}": ${
        (error as Error).message
      }`
    );
  }
}

