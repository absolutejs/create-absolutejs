import { mkdirSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { DatabaseEngine, ORM } from '../../types';
import { createDrizzleConfig } from '../configurations/createDrizzleConfig';

type ScaffoldDatabaseProps = {
	projectName: string;
	orm: ORM;
	databaseEngine: DatabaseEngine;
	databaseDirectory: string;
};

export const scaffoldDatabase = ({
	projectName,
	databaseEngine,
	databaseDirectory,
	orm
}: ScaffoldDatabaseProps) => {
	mkdirSync(join(projectName, databaseDirectory), { recursive: true });

	if (databaseEngine !== 'postgresql' && databaseEngine !== 'none') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Only PostgreSQL support is implemented so far`
		);
	}

	if (orm === 'drizzle') {
		createDrizzleConfig({ databaseEngine, projectName });
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}
};
