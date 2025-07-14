import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDrizzleSchema } from './generateDrizzleSchema';

type ScaffoldDatabaseProps = Pick<
	CreateConfiguration,
	| 'projectName'
	| 'databaseHost'
	| 'orm'
	| 'databaseDirectory'
	| 'authProvider'
	| 'databaseEngine'
> & {
	databaseDirectory: string;
};

export const scaffoldDatabase = ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	authProvider,
	orm
}: ScaffoldDatabaseProps) => {
	const projectDatabaseDirectory = join(projectName, databaseDirectory);
	mkdirSync(projectDatabaseDirectory, { recursive: true });

	if (
		orm === 'drizzle' &&
		databaseEngine !== undefined &&
		isDrizzleDialect(databaseEngine)
	) {
		const drizzleSchema = generateDrizzleSchema({
			authProvider,
			databaseEngine,
			databaseHost
		});
		const schemaFilePath = join(projectDatabaseDirectory, 'schema.ts');
		writeFileSync(schemaFilePath, drizzleSchema);
		createDrizzleConfig({ databaseDirectory, databaseEngine, projectName });

		return;
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}
};
