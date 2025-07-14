import { writeFileSync } from 'fs';
import { join } from 'path';
import type { DatabaseEngine } from '../../types';

type CreateDrizzleConfigProps = {
	projectName: string;
	databaseEngine: DatabaseEngine;
	databaseDirectory: string;
};

export const createDrizzleConfig = ({
	projectName,
	databaseDirectory,
	databaseEngine
}: CreateDrizzleConfigProps) => {
	const drizzleConfig = `import { defineConfig } from "drizzle-kit";
	import { env } from 'process';

    if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL must be set in the environment variables');
}

	export default defineConfig({
		dbCredentials: {
			url: env.DATABASE_URL
		},
		dialect: '${databaseEngine}',
		out: '${databaseDirectory}/migrations',
		schema: '${databaseDirectory}/schema.ts'
	});
`;

	writeFileSync(join(projectName, 'drizzle.config.ts'), drizzleConfig);
};
