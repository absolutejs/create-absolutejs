import type { ORM } from '../types';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createDrizzleConfig } from './createDrizzleConfig';

type ScaffoldDatabaseProps = {
	projectName: string;
	orm: ORM;
	root: string;
};

export const scaffoldDatabase = ({
	projectName,
	orm,
	root
}: ScaffoldDatabaseProps) => {
	mkdirSync(join(projectName, 'db'), { recursive: true });

	if (orm === 'drizzle') {
		createDrizzleConfig({ root });
	}
};
