import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDBHandlers } from './generateDBHandlers';
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
	backendDirectory: string;
};

export const scaffoldDatabase = ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	backendDirectory,
	authProvider,
	orm
}: ScaffoldDatabaseProps) => {
	const projectDatabaseDirectory = join(projectName, databaseDirectory);
	const handlerDirectory = join(backendDirectory, 'handlers');
	mkdirSync(projectDatabaseDirectory, { recursive: true });
	mkdirSync(handlerDirectory, { recursive: true });

	const usesAuth = authProvider !== undefined && authProvider !== 'none';
	const handlerFileName = usesAuth
		? 'userHandlers.ts'
		: 'countHistoryHandlers.ts';
	const dbHandlers = generateDBHandlers(usesAuth);
	writeFileSync(join(handlerDirectory, handlerFileName), dbHandlers, 'utf-8');

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
