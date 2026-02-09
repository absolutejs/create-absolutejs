import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { isDrizzleDialect } from '../../typeGuards';
import type { AvailableDependency, CreateConfiguration } from '../../types';
import type { FrameworkFlags } from './computeFlags';

type GenerateImportsBlockProps = {
	backendDirectory: string;
	deps: AvailableDependency[];
	flags: FrameworkFlags;
	orm: CreateConfiguration['orm'];
	authOption: CreateConfiguration['authOption'];
	databaseEngine: CreateConfiguration['databaseEngine'];
	databaseHost: CreateConfiguration['databaseHost'];
	databaseDirectory: CreateConfiguration['databaseDirectory'];
	frontendDirectories: CreateConfiguration['frontendDirectories'];
};

const defaultDbDir = 'db';

export const generateImportsBlock = ({
	backendDirectory,
	deps,
	flags,
	orm,
	authOption,
	databaseEngine,
	databaseHost,
	databaseDirectory = defaultDbDir,
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
			`import { ReactExample } from '${buildExamplePath(reactDir, 'ReactExample')}'`
		);

	if (flags.requiresSvelte && svelteDir !== undefined)
		rawImports.push(
			`import SvelteExample from '${buildExamplePath(svelteDir, 'SvelteExample.svelte')}'`
		);

	if (flags.requiresVue && !flags.requiresSvelte && vueDir !== undefined)
		rawImports.push(
			`import VueExample from '${buildExamplePath(vueDir, 'VueExample.vue')}'`
		);

	const connectorImports = {
		neon: [`import { neon } from '@neondatabase/serverless'`],
		planetscale: [`import { Client } from '@planetscale/database'`],
		turso: [`import { createClient } from '@libsql/client'`]
	} as const;

	const dialectImports = {
		neon: [`import { drizzle } from 'drizzle-orm/neon-http'`],
		planetscale: [
			`import { drizzle } from 'drizzle-orm/planetscale-serverless'`
		],
		turso: [`import { drizzle } from 'drizzle-orm/libsql'`]
	} as const;

	const isRemoteHost = databaseHost !== undefined && databaseHost !== 'none';
	const hasDatabase =
		databaseEngine !== undefined && databaseEngine !== 'none';
	const noOrm = orm === undefined || orm === 'none';

	const schemaImport = `import { schema } from '../../${databaseDirectory}/schema'`;

	const ormImports = {
		drizzle: [
			`import { Elysia } from 'elysia'`,
			...(databaseEngine === 'sqlite' && !isRemoteHost
				? []
				: [`import { getEnv } from '@absolutejs/absolute'`]),
			schemaImport
		]
	} as const;

	const ormDatabaseImports = {
		drizzle: {
			gel: [
				`import { createClient } from 'gel'`,
				`import { drizzle } from 'drizzle-orm/gel'`
			],
			mariadb: [
				`import { drizzle } from 'drizzle-orm/mysql2'`,
				`import { createPool } from 'mysql2/promise'`
			],
			mysql: !isRemoteHost
				? [
						`import { drizzle } from 'drizzle-orm/mysql2'`,
						`import { createPool } from 'mysql2/promise'`
					]
				: [],
			postgresql: !isRemoteHost
				? [
						`import { SQL } from 'bun'`,
						`import { drizzle } from 'drizzle-orm/bun-sql'`
					]
				: isRemoteHost && databaseHost === 'planetscale'
					? [
							`import { drizzle } from 'drizzle-orm/node-postgres'`,
							`import { Pool } from 'pg'`
						]
					: [],
			singlestore: [
				`import { drizzle } from 'drizzle-orm/singlestore'`,
				`import { createPool } from 'mysql2/promise'`
			],
			sqlite: !isRemoteHost
				? [
						`import { Database } from 'bun:sqlite'`,
						`import { drizzle } from 'drizzle-orm/bun-sqlite'`
					]
				: []
		}
	} as const;

	const noOrmImports = {
		cockroachdb: [
			`import { SQL } from 'bun'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		gel: [
			`import { createClient } from 'gel'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		mariadb: [
			`import { SQL } from 'bun'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		mongodb: [
			`import { MongoClient } from 'mongodb'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		mssql: [
			`import { connect } from 'mssql'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		mysql: isRemoteHost
			? [
					...connectorImports[databaseHost as 'planetscale'],
					`import { getEnv } from '@absolutejs/absolute'`
				]
			: [
					`import { SQL } from 'bun'`,
					`import { getEnv } from '@absolutejs/absolute'`
				],
		postgresql:
			isRemoteHost && databaseHost === 'neon'
				? [
						...connectorImports[databaseHost as 'neon'],
						`import { getEnv } from '@absolutejs/absolute'`
					]
				: isRemoteHost && databaseHost === 'planetscale'
					? [
							`import { Pool } from 'pg'`,
							`import { getEnv } from '@absolutejs/absolute'`
						]
					: [
							`import { SQL } from 'bun'`,
							`import { getEnv } from '@absolutejs/absolute'`
						],
		singlestore: [
			`import { createPool } from 'mysql2/promise'`,
			`import { getEnv } from '@absolutejs/absolute'`
		],
		sqlite: isRemoteHost
			? [
					...connectorImports[databaseHost as 'turso'],
					`import { getEnv } from '@absolutejs/absolute'`
				]
			: [`import { Database } from 'bun:sqlite'`]
	} as const;

	if (orm === 'drizzle') {
		rawImports.push(...ormImports[orm]);
	}

	if (orm === 'prisma') {
		rawImports.push(`import type { Elysia } from 'elysia'`);
		rawImports.push(`import type { PrismaClient } from '@prisma/client'`);
		if (authOption === 'abs') {
			rawImports.push(`import type { User } from '@prisma/client'`);
		}
	}

	if (
		orm == 'drizzle' &&
		isRemoteHost &&
		!(databaseEngine === 'postgresql' && databaseHost === 'planetscale')
	) {
		rawImports.push(
			...connectorImports[databaseHost],
			...dialectImports[databaseHost]
		);
	}

	if (orm === 'drizzle' && isDrizzleDialect(databaseEngine)) {
		rawImports.push(...ormDatabaseImports[orm][databaseEngine]);
	}

	if (noOrm && hasDatabase && noOrmImports[databaseEngine]) {
		rawImports.push(...noOrmImports[databaseEngine]);
	}

	if (authOption === 'abs')
		rawImports.push(
			`import { absoluteAuthConfig } from './utils/absoluteAuthConfig'`,
			`import { t } from 'elysia'`,
			`import { authProviderOption, providers, userSessionIdTypebox, getStatus } from '@absolutejs/auth'`
		);

	if (hasDatabase && (authOption === undefined || authOption === 'none'))
		rawImports.push(
			`import { getCountHistory, createCountHistory } from './handlers/countHistoryHandlers'`,
			`import { t } from 'elysia'`
		);

	if (flags.requiresVue && flags.requiresSvelte) {
		const utilsDir = join(backendDirectory, 'utils');
		mkdirSync(utilsDir, { recursive: true });
		const vuePathForUtils = `../../frontend${vueDir ? `/${vueDir}` : ''}/pages/VueExample.vue`;
		writeFileSync(
			join(utilsDir, 'vueImporter.ts'),
			`import VueExample from "${vuePathForUtils}"\n\nexport const vueImports = { VueExample } as const\n`
		);
		rawImports.push(`import { vueImports } from './utils/vueImporter'`);
	}

	type ImportEntry = {
		defaultImport: string | null;
		typeOnlyNames: Set<string>;
		valueNames: Set<string>;
	};

	const importMap = new Map<string, ImportEntry>();

	for (const stmt of rawImports) {
		const typeMatch = stmt.match(
			/^import\s+type\s+\{([^}]+)\}\s+from\s+['"](.+)['"];?/
		);
		const valueMatch = stmt.match(/^import\s+(.+)\s+from\s+['"](.+)['"];?/);
		if (typeMatch) {
			const [, names, modulePath] = typeMatch;
			if (!names || !modulePath) continue;
			const entry = importMap.get(modulePath) ?? {
				defaultImport: null,
				typeOnlyNames: new Set<string>(),
				valueNames: new Set<string>()
			};
			importMap.set(modulePath, entry);
			names
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
				.forEach((name) => entry.typeOnlyNames.add(name));
			continue;
		}
		if (!valueMatch) continue;
		const [, importClause, modulePath] = valueMatch;
		if (!importClause || !modulePath) continue;

		const entry = importMap.get(modulePath) ?? {
			defaultImport: null,
			typeOnlyNames: new Set<string>(),
			valueNames: new Set<string>()
		};
		importMap.set(modulePath, entry);

		if (importClause.startsWith('{')) {
			importClause
				.slice(1, -1)
				.split(',')
				.map((segment) => segment.trim())
				.filter(Boolean)
				.forEach((name) => entry.valueNames.add(name));
		} else {
			entry.defaultImport = importClause.trim();
		}
	}

	return Array.from(importMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([path, { defaultImport, typeOnlyNames, valueNames }]) => {
			const typeOnlyNotValue = [...typeOnlyNames].filter(
				(name) => !valueNames.has(name)
			);
			const hasValues = valueNames.size > 0 || defaultImport !== null;
			if (!hasValues && typeOnlyNotValue.length > 0) {
				return `import type { ${typeOnlyNotValue.sort().join(', ')} } from '${path}'`;
			}
			const parts: string[] = [];
			if (defaultImport) parts.push(defaultImport);
			if (valueNames.size > 0 || typeOnlyNotValue.length > 0) {
				const sortedValues = [...valueNames].sort();
				const named = [
					...typeOnlyNotValue.map((n) => `type ${n}`),
					...sortedValues
				].sort((a, b) => {
					const aNorm = a.replace(/^type /, '');
					const bNorm = b.replace(/^type /, '');
					return aNorm.localeCompare(bNorm);
				});
				parts.push(`{ ${named.join(', ')} }`);
			}
			return `import ${parts.join(', ')} from '${path}'`;
		})
		.join('\n');
};
