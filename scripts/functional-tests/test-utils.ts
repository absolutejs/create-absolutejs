import { existsSync, rmSync } from 'fs';

/**
 * Removes a previously generated project directory if it exists.
 * This prevents scaffolding commands from failing with "directory already exists".
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


