import { writeFileSync } from 'fs';
import { join } from 'path';
import type { AvailableDrizzleDialect, DatabaseHost } from '../../types';
import { getDrizzleKitDialect } from '../db/drizzleTargets';

type CreateDrizzleConfigProps = {
	projectName: string;
	databaseEngine: AvailableDrizzleDialect;
	databaseHost: DatabaseHost;
	databaseDirectory: string;
};

const requireDatabaseUrl = `if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL must be set in the environment variables');
}
`;

export const createDrizzleConfig = ({
	projectName,
	...options
}: CreateDrizzleConfigProps) => {
	writeFileSync(
		join(projectName, 'drizzle.config.ts'),
		generateDrizzleConfig(options)
	);
};

export const generateDrizzleConfig = ({
	databaseDirectory,
	databaseEngine,
	databaseHost
}: Omit<CreateDrizzleConfigProps, 'projectName'>) => {
	const dialect = getDrizzleKitDialect(databaseEngine, databaseHost);
	const paths = `out: '${databaseDirectory}/migrations',
	schema: '${databaseDirectory}/schema.ts'`;

	/* Local SQLite lives in a file beside the schema — the same path the server
	   opens — so migrations need no environment at all. */
	if (dialect === 'sqlite') {
		return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dbCredentials: {
		url: '${databaseDirectory}/database.sqlite'
	},
	dialect: 'sqlite',
	${paths}
});
`;
	}

	/* Turso speaks libSQL: a \`libsql://\` URL plus an auth token in the cloud,
	   or a \`file:\` URL with no token for a local libSQL database. */
	const credentials =
		dialect === 'turso'
			? `authToken: env.DATABASE_AUTH_TOKEN,
		url: env.DATABASE_URL`
			: 'url: env.DATABASE_URL';

	return `import { env } from 'process';
import { defineConfig } from 'drizzle-kit';

${requireDatabaseUrl}
export default defineConfig({
	dbCredentials: {
		${credentials}
	},
	dialect: '${dialect}',
	${paths}
});
`;
};
