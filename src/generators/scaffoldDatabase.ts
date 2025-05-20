import { mkdirSync } from 'fs';
import { join } from 'path';
import type { ORM } from '../types';
import { createDrizzleConfig } from './createDrizzleConfig';

type ScaffoldDatabaseProps = {
	projectName: string;
	orm: ORM;
};

export const scaffoldDatabase = ({
	projectName,
	orm
}: ScaffoldDatabaseProps) => {
	mkdirSync(join(projectName, 'db'), { recursive: true });

	if (orm === 'drizzle') {
		createDrizzleConfig({ projectName });
	}
};
