import { writeFileSync } from 'fs';
import { join } from 'path';

type CreateDrizzleConfigProps = {
	root: string;
};

export const createDrizzleConfig = ({ root }: CreateDrizzleConfigProps) => {
	const drizzleConfig = `import { defineConfig } from "drizzle-kit";
    
    export default defineConfig({
    dialect: 'postgresql'
    });
    `;

	writeFileSync(join(root, 'drizzle.config.ts'), drizzleConfig);
};
