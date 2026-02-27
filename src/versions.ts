/**
 * Single source of truth for all scaffolded dependency versions.
 * Every package version used in project generation lives here.
 * Run `bun run check-versions` to compare against latest npm versions.
 */
export const versions = {
	/* ── Angular ─────────────────────────────────────────── */
	'@angular/common': '21.0.0',
	'@angular/compiler': '21.0.0',
	'@angular/compiler-cli': '21.0.0',
	'@angular/core': '21.0.0',
	'@angular/platform-browser': '21.0.0',
	'@angular/platform-server': '21.0.0',
	'@angular/ssr': '21.0.0',
	/* ── Core ─────────────────────────────────────────────── */
	'@absolutejs/absolute': '0.17.12',
	'@absolutejs/auth': '0.22.4',
	/* ── Plugins ──────────────────────────────────────────── */
	'@elysiajs/eden': '1.4.8',
	'@elysiajs/cors': '1.4.1',
	'@elysiajs/static': '1.4.7',
	'@elysiajs/swagger': '1.3.1',
	/* ── ESLint + Prettier ────────────────────────────────── */
	'@eslint/compat': '2.0.2',
	'@eslint/js': '10.0.1',
	/* ── Database Hosts ───────────────────────────────────── */
	'@libsql/client': '0.17.0',
	'@neondatabase/serverless': '1.0.2',
	'@planetscale/database': '1.19.0',
	'@stylistic/eslint-plugin': '5.9.0',
	/* ── Tailwind CSS ─────────────────────────────────────── */
	'@tailwindcss/cli': '4.2.0',
	/* ── Database Drivers ─────────────────────────────────── */
	'@types/mssql': '9.1.9',
	'@types/pg': '8.16.0',
	/* ── React ────────────────────────────────────────────── */
	'@types/react': '19.2.14',
	'@typescript-eslint/parser': '8.56.0',
	autoprefixer: '10.4.24',
	/* ── ORM ──────────────────────────────────────────────── */
	'drizzle-orm': '0.45.1',
	elysia: '1.4.25',
	'elysia-rate-limit': '4.5.0',
	'elysia-scoped-state': '0.1.1',
	eslint: '10.0.0',
	'eslint-plugin-absolute': '0.2.0',
	'eslint-plugin-import': '2.32.0',
	/* ── ESLint React ─────────────────────────────────────── */
	'eslint-plugin-jsx-a11y': '6.10.2',
	'eslint-plugin-promise': '7.2.1',
	'eslint-plugin-react': '7.37.5',
	'eslint-plugin-react-compiler': '19.1.0-rc.2',
	'eslint-plugin-react-hooks': '7.1.0-canary-e8c63626-20260213',
	'eslint-plugin-security': '4.0.0',
	gel: '2.2.0',
	globals: '17.3.0',
	mongodb: '7.1.0',
	mssql: '12.2.0',
	mysql2: '3.17.3',
	pg: '8.18.0',
	postcss: '8.5.6',
	prettier: '3.8.1',
	/* ── Svelte ───────────────────────────────────────────── */
	'prettier-plugin-svelte': '3.5.0',
	react: '19.2.4',
	'react-dom': '19.2.4',
	svelte: '5.53.0',
	tailwindcss: '4.2.0',
	/* ── Build / TypeScript ───────────────────────────────── */
	typescript: '5.9.3',
	'typescript-eslint': '8.56.0',
	/* ── Vue ──────────────────────────────────────────────── */
	vue: '3.5.28',
	'zod-validation-error': '4.0.2'
} as const;
