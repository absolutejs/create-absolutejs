import { writeFileSync } from 'fs';
import { join } from 'path';

type CreateDrizzleConfigProps = {
	projectName: string;
};

export const createDrizzleConfig = ({
	projectName
}: CreateDrizzleConfigProps) => {
	const drizzleConfig = `import { defineConfig } from "drizzle-kit";
    
    export default defineConfig({
    dialect: 'postgresql'
    });
    `;

	writeFileSync(join(projectName, 'drizzle.config.ts'), drizzleConfig);
};
