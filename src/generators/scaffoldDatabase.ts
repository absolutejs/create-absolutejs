import type { ORM } from '../types';
import { mkdirSync } from 'fs';
import { join } from 'path';

export const scaffoldDatabase = (projectName: string, orm: ORM) => {
	mkdirSync(join(projectName, 'db'), { recursive: true });

	if (orm === 'drizzle') {
	}
};
