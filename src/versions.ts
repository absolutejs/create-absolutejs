/**
 * Single source of truth for all scaffolded dependency versions.
 * Every package version used in project generation lives here.
 * Run `bun run check-versions` to compare against latest npm versions.
 */
export const versions = {
	/* ── Core ─────────────────────────────────────────────── */
	'@absolutejs/absolute': '0.20.0-beta.0',
	'@absolutejs/a2a': '0.3.2',
	'@absolutejs/agency': '0.6.3',
	'@absolutejs/agent-conformance': '0.3.0',
	'@absolutejs/agent-discovery': '0.1.0',
	'@absolutejs/agent-inbox': '0.3.3',
	'@absolutejs/agent-memory': '0.1.5',
	'@absolutejs/agent-runtime': '0.2.3',
	'@absolutejs/agent-sandbox': '0.1.0',
	'@absolutejs/agent-trust': '0.1.0',
	'@absolutejs/agent-control': '0.5.3',
	'@absolutejs/auth': '0.56.17',
	'@absolutejs/egress': '0.1.0',
	'@absolutejs/execution': '0.14.4',
	'@absolutejs/manifest': '0.9.0',
	'@absolutejs/mcp': '0.12.0',
	'@absolutejs/observability': '0.6.0',
	'@absolutejs/policy': '0.2.0',
	'@absolutejs/secrets': '0.7.0',
	'@absolutejs/sync-bus-pg': '0.2.0',
	'@absolutejs/wallet': '0.8.6',
	/* ── Angular ─────────────────────────────────────────── */
	'@angular/common': '21.2.0',
	'@angular/compiler': '21.2.0',
	'@angular/compiler-cli': '21.2.0',
	'@angular/core': '21.2.0',
	'@angular/platform-browser': '21.2.0',
	'@angular/platform-server': '21.2.0',
	'@angular/ssr': '21.2.0',
	'@elysia/cors': '2.0.0-beta.1',
	/* ── Plugins ──────────────────────────────────────────── */
	'@elysia/eden': '2.0.0-beta.5',
	'@elysia/openapi': '2.0.0-beta.1',
	'@elysia/static': '2.0.0-beta.2',
	/* ── ESLint + Prettier ────────────────────────────────── */
	'@eslint/compat': '2.0.2',
	'@eslint/js': '9.39.2',
	/* ── Database Hosts ───────────────────────────────────── */
	'@libsql/client': '0.17.0',
	'@neondatabase/serverless': '1.0.2',
	'@planetscale/database': '1.19.0',
	'@stylistic/eslint-plugin': '5.9.0',
	/* ── Tailwind CSS ─────────────────────────────────────── */
	'@tailwindcss/cli': '4.2.0',
	/* ── Bun ──────────────────────────────────────────────── */
	'@types/bun': '1.3.14',
	/* ── Database Drivers ─────────────────────────────────── */
	'@types/mssql': '9.1.9',
	'@types/pg': '8.16.0',
	/* ── React ────────────────────────────────────────────── */
	'@types/react': '19.2.14',
	'@typescript-eslint/parser': '8.56.0',
	autoprefixer: '10.4.24',
	/* ── ORM ──────────────────────────────────────────────── */
	'drizzle-kit': '1.0.0-rc.4',
	'drizzle-orm': '1.0.0-rc.4',
	elysia: '2.0.0-beta.6',
	'elysia-rate-limit': '4.5.0',
	'@absolutejs/scoped-state': '0.2.0',
	eslint: '9.39.2',
	'eslint-plugin-absolute': '0.12.0',
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
	'react-refresh': '0.18.0',
	svelte: '5.53.0',
	tailwindcss: '4.2.0',
	/* ── Build / TypeScript ───────────────────────────────── */
	typescript: '5.9.3',
	'typescript-eslint': '8.56.0',
	/* ── Vue ──────────────────────────────────────────────── */
	vue: '3.5.28',
	'zod-validation-error': '4.0.2'
} as const;
