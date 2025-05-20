import { mkdirSync } from 'fs';
import { join } from 'path';
import type { DatabaseProvider, ORM } from '../types';
import { createDrizzleConfig } from './createDrizzleConfig';
import { dim, yellow } from 'picocolors';

type ScaffoldDatabaseProps = {
	projectName: string;
	orm: ORM;
	databaseProvider: DatabaseProvider;
};

export const scaffoldDatabase = ({
	projectName,
	databaseProvider,
	orm
}: ScaffoldDatabaseProps) => {
	mkdirSync(join(projectName, 'db'), { recursive: true });

	if (databaseProvider === 'postgres') {
	} else {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Only PostgreSQL is supported on this version`
		);
	}

	if (orm === 'drizzle') {
		createDrizzleConfig({ projectName });
	}
};
