import { existsSync, rmSync } from 'node:fs';

/**
 * Remove a generated project directory if it exists.
 *
 * Attempts to remove `projectPath` recursively and forcibly; if removal fails the error is caught
 * and a warning is logged containing the path and the error message.
 */
export const cleanupProjectDirectory = (projectPath: string) => {
  if (!existsSync(projectPath)) {
    return;
  }

  try {
    rmSync(projectPath, { force: true, recursive: true });
  } catch (error) {
    const { message } = error as Error;
    console.warn(`Warning: Failed to clean up project directory "${projectPath}": ${message}`);
  }
};

