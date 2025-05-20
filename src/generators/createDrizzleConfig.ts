import { writeFileSync } from 'fs';
import { join } from 'path';
import type { DatabaseEngine } from '../types';

type CreateDrizzleConfigProps = {
	projectName: string;
	databaseEngine: DatabaseEngine;
};

export const createDrizzleConfig = ({
	projectName,
	databaseEngine
}: CreateDrizzleConfigProps) => {
	const drizzleConfig = `import { defineConfig } from "drizzle-kit";
    
    export default defineConfig({
    dialect: '${databaseEngine}'
    });
    `;

	writeFileSync(join(projectName, 'drizzle.config.ts'), drizzleConfig);
};
