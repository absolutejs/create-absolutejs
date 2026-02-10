/**
 * Single source of truth for all scaffolded dependency versions.
 * Every package version used in project generation lives here.
 * Run `bun run check-versions` to compare against latest npm versions.
 */
export const versions = {
	/* ── Core ─────────────────────────────────────────────── */
	'@absolutejs/absolute': '0.13.5',
	'@absolutejs/auth': '0.22.0',
	'@elysiajs/static': '1.4.7',
	elysia: '1.4.22',
	'elysia-scoped-state': '0.1.1',

	/* ── Plugins ──────────────────────────────────────────── */
	'@elysiajs/cors': '1.4.1',
	'@elysiajs/swagger': '1.3.1',
	'elysia-rate-limit': '4.5.0',

	/* ── Build / TypeScript ───────────────────────────────── */
	typescript: '5.9.3',

	/* ── Tailwind CSS ─────────────────────────────────────── */
	'@tailwindcss/cli': '4.1.18',
	autoprefixer: '10.4.24',
	postcss: '8.5.6',
	tailwindcss: '4.1.18',

	/* ── React ────────────────────────────────────────────── */
	'@types/react': '19.2.13',
	react: '19.2.4',
	'react-dom': '19.2.4',

	/* ── Svelte ───────────────────────────────────────────── */
	'prettier-plugin-svelte': '3.4.1',
	svelte: '5.49.2',

	/* ── Vue ──────────────────────────────────────────────── */
	vue: '3.5.27',

	/* ── ESLint + Prettier ────────────────────────────────── */
	'@stylistic/eslint-plugin-ts': '4.4.1',
	'@typescript-eslint/parser': '8.47.0',
	eslint: '9.39.2',
	'eslint-plugin-absolute': '0.1.6',
	'eslint-plugin-import': '2.32.0',
	'eslint-plugin-promise': '7.2.1',
	'eslint-plugin-security': '3.0.1',
	prettier: '3.8.1',
	'typescript-eslint': '8.47.0',

	/* ── ESLint React ─────────────────────────────────────── */
	'eslint-plugin-jsx-a11y': '6.10.2',
	'eslint-plugin-react': '7.37.5',
	'eslint-plugin-react-compiler': '19.1.0-rc.2',
	'eslint-plugin-react-hooks': '7.0.1',

	/* ── ORM ──────────────────────────────────────────────── */
	'drizzle-orm': '0.45.1',

	/* ── Database Hosts ───────────────────────────────────── */
	'@libsql/client': '0.17.0',
	'@neondatabase/serverless': '1.0.2',
	'@planetscale/database': '1.19.0',

	/* ── Database Drivers ─────────────────────────────────── */
	'@types/mssql': '9.1.9',
	'@types/pg': '8.16.0',
	gel: '2.2.0',
	mongodb: '6.12.0',
	mssql: '12.2.0',
	mysql2: '3.16.3',
	pg: '8.18.0'
} as const;
