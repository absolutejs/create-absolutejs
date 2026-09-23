/**
 * Single source of truth for all scaffolded dependency versions.
 * Every package version used in project generation lives here.
 * Run `bun run check-versions` to compare against latest npm versions.
 */
export const versions = {
	'@absolutejs/a2a': '0.3.6',
	/* ── Core ─────────────────────────────────────────────── */
	'@absolutejs/absolute': '0.20.0-beta.117',
	'@absolutejs/agency': '0.7.4',
	'@absolutejs/agent-conformance': '0.15.1',
	'@absolutejs/agent-control': '0.5.8',
	'@absolutejs/agent-discovery': '0.2.4',
	'@absolutejs/agent-inbox': '0.3.5',
	'@absolutejs/agent-memory': '0.1.7',
	'@absolutejs/agent-runtime': '0.2.6',
	'@absolutejs/agent-sandbox': '0.2.2',
	'@absolutejs/agent-trust': '0.2.2',
	'@absolutejs/auth': '0.85.0',
	'@absolutejs/egress': '0.2.0',
	'@absolutejs/execution': '0.14.8',
	'@absolutejs/manifest': '0.10.0',
	'@absolutejs/mcp': '0.26.5',
	'@absolutejs/observability': '0.6.1',
	'@absolutejs/policy': '0.4.1',
	'@absolutejs/scoped-state': '0.3.0',
	'@absolutejs/secrets': '0.9.7',
	'@absolutejs/sync-bus-pg': '0.2.3',
	'@absolutejs/wallet': '0.9.3',
	/* ── Angular ─────────────────────────────────────────── */
	'@angular/common': '21.2.24',
	'@angular/compiler': '21.2.24',
	'@angular/compiler-cli': '21.2.24',
	'@angular/core': '21.2.24',
	'@angular/platform-browser': '21.2.24',
	'@angular/platform-server': '21.2.24',
	'@angular/ssr': '21.2.24',
	'@elysia/cors': '2.0.0-beta.1',
	/* ── Plugins ──────────────────────────────────────────── */
	'@elysia/eden': '2.0.0-beta.5',
	'@elysia/openapi': '2.0.0-beta.2',
	'@elysia/static': '2.0.0-beta.2',
	/* ── ESLint + Prettier ────────────────────────────────── */
	'@eslint/compat': '2.1.1',
	'@eslint/js': '10.0.1',
	/* ── Database Hosts ───────────────────────────────────── */
	'@libsql/client': '0.18.0',
	'@neondatabase/serverless': '1.1.0',
	'@planetscale/database': '1.20.1',
	'@stylistic/eslint-plugin': '5.10.0',
	/* ── Tailwind CSS ─────────────────────────────────────── */
	'@tailwindcss/cli': '4.3.3',
	/* ── Bun ──────────────────────────────────────────────── */
	'@types/bun': '1.4.2',
	/* ── Database Drivers ─────────────────────────────────── */
	'@types/mssql': '12.3.0',
	'@types/pg': '8.23.1',
	/* ── React ────────────────────────────────────────────── */
	'@types/react': '19.3.0',
	'@typescript-eslint/parser': '8.70.1',
	autoprefixer: '10.6.1',
	/* ── ORM ──────────────────────────────────────────────── */
	'drizzle-kit': '1.0.0-rc.4',
	'drizzle-orm': '1.0.0-rc.4',
	elysia: '2.0.0-beta.6',
	'elysia-rate-limit': '5.1.1',
	eslint: '10.11.0',
	'eslint-plugin-absolute': '0.12.0',
	'eslint-plugin-import': '2.32.0',
	/* ── ESLint React ─────────────────────────────────────── */
	'eslint-plugin-jsx-a11y': '6.10.2',
	'eslint-plugin-promise': '7.3.0',
	'eslint-plugin-react': '7.37.5',
	'eslint-plugin-react-compiler': '19.1.0-rc.2',
	'eslint-plugin-react-hooks': '7.1.1',
	'eslint-plugin-security': '4.0.1',
	gel: '2.2.1',
	globals: '17.12.0',
	'htmx.org': '2.0.11',
	mongodb: '7.6.0',
	mssql: '12.7.2',
	mysql2: '3.24.4',
	pg: '8.23.0',
	postcss: '8.5.28',
	prettier: '3.9.9',
	/* ── Svelte ───────────────────────────────────────────── */
	'prettier-plugin-svelte': '4.1.1',
	react: '19.3.0',
	'react-dom': '19.3.0',
	'react-refresh': '0.19.0',
	svelte: '5.57.1',
	tailwindcss: '4.3.3',
	/* ── Build / TypeScript ───────────────────────────────── */
	typescript: '5.9.3',
	'typescript-eslint': '8.70.1',
	/* ── Vue ──────────────────────────────────────────────── */
	vue: '3.5.43',
	'zod-validation-error': '5.0.0'
} as const;
