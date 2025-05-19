export const createDrizzleConfig =
	() => `import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: 'postgresql'
});
`;
