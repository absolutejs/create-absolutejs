import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AvailableDependency, CreateConfiguration } from '../../types';
import type { FrameworkFlags } from './computeFlags';

type GenerateImportsBlockProps = {
	backendDirectory: string;
	deps: AvailableDependency[];
	flags: FrameworkFlags;
	orm: CreateConfiguration['orm'];
	authProvider: CreateConfiguration['authProvider'];
	databaseEngine: CreateConfiguration['databaseEngine'];
	databaseHost: CreateConfiguration['databaseHost'];
	frontendDirectories: CreateConfiguration['frontendDirectories'];
};

export const generateImportsBlock = ({
	backendDirectory,
	deps,
	flags,
	orm,
	authProvider,
	databaseEngine,
	databaseHost,
	frontendDirectories
}: GenerateImportsBlockProps) => {
	const rawImports: string[] = [];

	const pushHandler = (cond: boolean, name: string) =>
		cond &&
		rawImports.push(`import { ${name} } from '@absolutejs/absolute'`);

	pushHandler(flags.requiresHtml, 'handleHTMLPageRequest');
	pushHandler(flags.requiresReact, 'handleReactPageRequest');
	pushHandler(flags.requiresSvelte, 'handleSveltePageRequest');
	pushHandler(flags.requiresVue, 'handleVuePageRequest');
	pushHandler(flags.requiresVue, 'generateHeadElement');
	pushHandler(flags.requiresHtmx, 'handleHTMXPageRequest');

	const nonFrameworkOnly =
		(flags.requiresHtml || flags.requiresHtmx) &&
		!flags.requiresReact &&
		!flags.requiresSvelte &&
		!flags.requiresVue;

	for (const dependency of deps) {
		const importsList = dependency.imports ?? [];
		const relevantImports = nonFrameworkOnly
			? importsList.filter((imp) => imp.packageName !== 'asset')
			: importsList;
		if (relevantImports.length === 0) continue;
		rawImports.push(
			`import { ${relevantImports
				.map((imp) => imp.packageName)
				.sort()
				.join(', ')} } from '${dependency.value}'`
		);
	}

	const buildExamplePath = (dir: string, file: string) =>
		`../frontend${dir ? `/${dir}` : ''}/pages/${file}`;

	const reactDir = frontendDirectories.react;
	const svelteDir = frontendDirectories.svelte;
	const vueDir = frontendDirectories.vue;

	if (flags.requiresReact && reactDir !== undefined)
		rawImports.push(
			`import { ReactExample } from '${buildExamplePath(
				reactDir,
				'ReactExample'
			)}'`
		);

	if (flags.requiresSvelte && svelteDir !== undefined)
		rawImports.push(
			`import SvelteExample from '${buildExamplePath(
				svelteDir,
				'SvelteExample.svelte'
			)}'`
		);

	if (flags.requiresVue && !flags.requiresSvelte && vueDir !== undefined)
		rawImports.push(
			`import VueExample from '${buildExamplePath(
				vueDir,
				'VueExample.vue'
			)}'`
		);

	const connectorImports = {
		neon: ["import { neon } from '@neondatabase/serverless'"],
		planetscale: ["import { connect } from '@planetscale/database'"],
		turso: ["import { createClient } from '@libsql/client'"]
	} as const;

	const dialectImports = {
		neon: ["import { drizzle } from 'drizzle-orm/neon-http'"],
		planetscale: [
			"import { drizzle } from 'drizzle-orm/planetscale-serverless'"
		],
		turso: ["import { drizzle } from 'drizzle-orm/libsql'"]
	} as const;

	const isRemoteHost = databaseHost !== undefined && databaseHost !== 'none';
	const hasDatabase =
		databaseEngine !== undefined && databaseEngine !== 'none';
	const noOrm = orm === undefined || orm === 'none';

	if (orm === 'drizzle' && isRemoteHost) {
		const key = databaseHost;
		rawImports.push(...connectorImports[key], ...dialectImports[key]);
	}

	if (orm === 'drizzle' && !isRemoteHost && databaseEngine === 'postgresql')
		rawImports.push(
			`import { SQL } from 'bun'`,
			`import { drizzle } from 'drizzle-orm/bun-sql'`
		);

	if (orm === 'drizzle' && databaseEngine === 'sqlite' && !isRemoteHost)
		rawImports.push(
			`import { Database } from 'bun:sqlite'`,
			`import { drizzle } from 'drizzle-orm/bun-sqlite'`
		);

	if (noOrm && databaseEngine === 'sqlite')
		rawImports.push(
			...(databaseHost === 'turso'
				? [
						`import { createClient } from '@libsql/client'`,
						`import { getEnv } from '@absolutejs/absolute'`
					]
				: [`import { Database } from 'bun:sqlite'`])
		);

	if (databaseEngine === 'mysql' && isRemoteHost) {
		rawImports.push(...connectorImports[databaseHost]);
	}

	if (databaseEngine === 'mysql' && !isRemoteHost) {
		rawImports.push("import { createPool } from 'mysql2/promise'");
	}

	if (databaseEngine === 'mysql' && orm === 'drizzle') {
		rawImports.push("import { drizzle } from 'drizzle-orm/mysql2'");
	}

	if (databaseEngine === 'mysql') {
		rawImports.push("import { getEnv } from '@absolutejs/absolute'");
	}

	if (noOrm && databaseEngine === 'postgresql')
		rawImports.push(
			...(isRemoteHost
				? connectorImports[databaseHost]
				: [`import { SQL } from 'bun'`]),
			`import { getEnv } from '@absolutejs/absolute'`
		);

	if (orm === 'drizzle') {
		rawImports.push(
			`import { Elysia } from 'elysia'`,
			...(databaseEngine === 'sqlite' && !isRemoteHost
				? []
				: [`import { getEnv } from '@absolutejs/absolute'`]),
			authProvider === 'absoluteAuth'
				? `import { schema, User } from '../../db/schema'`
				: `import { schema } from '../../db/schema'`
		);
	}

	if (authProvider === 'absoluteAuth')
		rawImports.push(
			`import { absoluteAuth, instantiateUserSession } from '@absolutejs/auth'`,
			...(hasDatabase
				? [
						`import { createUser, getUser } from './handlers/userHandlers'`
					]
				: [])
		);

	if (hasDatabase && (authProvider === undefined || authProvider === 'none'))
		rawImports.push(
			`import { getCountHistory, createCountHistory } from './handlers/countHistoryHandlers'`,
			`import { t } from 'elysia'`
		);

	if (flags.requiresVue && flags.requiresSvelte) {
		const utilsDir = join(backendDirectory, 'utils');
		mkdirSync(utilsDir, { recursive: true });
		const vuePathForUtils = `../../frontend${
			vueDir ? `/${vueDir}` : ''
		}/pages/VueExample.vue`;
		writeFileSync(
			join(utilsDir, 'vueImporter.ts'),
			`import VueExample from "${vuePathForUtils}"\n\nexport const vueImports = { VueExample } as const\n`
		);
		rawImports.push(`import { vueImports } from './utils/vueImporter'`);
	}

	const importMap = new Map<
		string,
		{ defaultImport: string | null; namedImports: Set<string> }
	>();

	for (const stmt of rawImports) {
		const match = stmt.match(/^import\s+(.+)\s+from\s+['"](.+)['"];?/);
		if (!match) continue;

		const [, importClause, modulePath] = match;
		if (!importClause || !modulePath) continue;

		const entry = importMap.get(modulePath) ?? {
			defaultImport: null,
			namedImports: new Set<string>()
		};
		importMap.set(modulePath, entry);

		void (importClause.startsWith('{')
			? importClause
					.slice(1, -1)
					.split(',')
					.map((segment) => segment.trim())
					.filter(Boolean)
					.forEach((name) => entry.namedImports.add(name))
			: (entry.defaultImport = importClause.trim()));
	}

	return Array.from(importMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([path, { defaultImport, namedImports }]) => {
			const parts: string[] = [];
			if (defaultImport) parts.push(defaultImport);
			if (namedImports.size)
				parts.push(`{ ${[...namedImports].sort().join(', ')} }`);

			return `import ${parts.join(', ')} from '${path}'`;
		})
		.join('\n');
};
