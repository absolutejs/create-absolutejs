import { existsSync, rmSync } from 'node:fs';

export const removeDirectoryIfExists = (path: string) => {
  if (!existsSync(path)) {
    return;
  }

  try {
    rmSync(path, { force: true, recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to remove directory "${path}": ${message}`);
  }
};

