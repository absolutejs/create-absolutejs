import { mkdirSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { DatabaseEngine, ORM } from '../types';
import { createDrizzleConfig } from './createDrizzleConfig';

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

	if (databaseEngine !== 'postgresql') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Only PostgreSQL support is implemented so far`
		);
	}

	if (orm === 'drizzle') {
		createDrizzleConfig({ databaseEngine, projectName });
	}
};
