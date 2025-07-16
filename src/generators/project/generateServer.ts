import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins,
	scopedStatePlugin
} from '../../data';
import { isFrontend } from '../../typeGuards';
import type {
	AvailableDependency,
	CreateConfiguration,
	Frontend
} from '../../types';

type CreateServerFileProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'authProvider'
	| 'plugins'
	| 'buildDirectory'
	| 'databaseHost'
	| 'orm'
	| 'assetsDirectory'
	| 'frontendDirectories'
> & {
	availablePlugins: AvailableDependency[];
	backendDirectory: string;
};

export const generateServerFile = ({
	tailwind,
	frontendDirectories,
	databaseHost,
	backendDirectory,
	authProvider,
	availablePlugins,
	buildDirectory,
	assetsDirectory,
	plugins,
	orm
}: CreateServerFileProps) => {
	const serverFilePath = join(backendDirectory, 'server.ts');

	const {
		html: htmlDirectory,
		react: reactDirectory,
		svelte: svelteDirectory,
		vue: vueDirectory,
		htmx: htmxDirectory
	} = frontendDirectories;

	const requiresHtml = htmlDirectory !== undefined;
	const requiresReact = reactDirectory !== undefined;
	const requiresSvelte = svelteDirectory !== undefined;
	const requiresVue = vueDirectory !== undefined;
	const requiresHtmx = htmxDirectory !== undefined;

	const nonFrameworkOnly =
		(requiresHtml || requiresHtmx) &&
		!requiresReact &&
		!requiresSvelte &&
		!requiresVue;

	const selectedCustomPlugins = availablePlugins.filter((p) =>
		plugins.includes(p.value)
	);
	const authenticationPlugins =
		authProvider === 'absoluteAuth' ? [absoluteAuthPlugin] : [];
	const htmxPlugins = requiresHtmx ? [scopedStatePlugin] : [];

	const allDependencies = [
		...defaultDependencies,
		...defaultPlugins,
		...selectedCustomPlugins,
		...authenticationPlugins,
		...htmxPlugins
	];

	const uniqueDependencies = Array.from(
		new Map(allDependencies.map((d) => [d.value, d])).values()
	).sort((a, b) => a.value.localeCompare(b.value));

	const rawImports: string[] = [];

	const handlerImports = [
		[requiresHtml, 'handleHTMLPageRequest'],
		[requiresReact, 'handleReactPageRequest'],
		[requiresSvelte, 'handleSveltePageRequest'],
		[requiresVue, 'handleVuePageRequest'],
		[requiresVue, 'generateHeadElement'],
		[requiresHtmx, 'handleHTMXPageRequest']
	];

	for (const [needed, name] of handlerImports) {
		if (needed)
			rawImports.push(`import { ${name} } from '@absolutejs/absolute';`);
	}

	for (const dep of uniqueDependencies) {
		const importsArr = dep.imports ?? [];
		const filtered = nonFrameworkOnly
			? importsArr.filter((i) => i.packageName !== 'asset')
			: importsArr;
		if (!filtered.length) continue;
		rawImports.push(
			`import { ${filtered
				.map((i) => i.packageName)
				.sort()
				.join(', ')} } from '${dep.value}';`
		);
	}

	if (requiresReact)
		rawImports.push(
			`import { ReactExample } from '../frontend/react/pages/ReactExample';`
		);
	if (requiresSvelte)
		rawImports.push(
			`import SvelteExample from '../frontend/svelte/pages/SvelteExample.svelte';`
		);
	if (requiresVue && !requiresSvelte)
		rawImports.push(
			`import VueExample from '../frontend/vue/pages/VueExample.vue';`
		);
	if (requiresVue && requiresSvelte)
		rawImports.push(`import { vueImports } from './utils/vueImporter';`);

	const drizzleHostImports = {
		neon: [
			`import { neon } from '@neondatabase/serverless';`,
			`import { drizzle } from 'drizzle-orm/neon-http';`
		],
		planetscale: [
			`import { connect } from '@planetscale/database';`,
			`import { drizzle } from 'drizzle-orm/planetscale-serverless';`
		],
		turso: [
			`import { createClient } from '@libsql/client';`,
			`import { drizzle } from 'drizzle-orm/libsql';`
		]
	} as const;

	if (orm === 'drizzle') {
		const hostImports =
			databaseHost === 'neon' ||
			databaseHost === 'planetscale' ||
			databaseHost === 'turso'
				? drizzleHostImports[databaseHost]
				: [];
		rawImports.push(
			`import { Elysia, env } from 'elysia';`,
			`import { schema } from '../../db/schema';`,
			...hostImports
		);
	}

	const importMap = new Map<
		string,
		{ default: string | null; named: Set<string> }
	>();

	for (const stmt of rawImports) {
		const match = stmt.match(/^import\s+(.+)\s+from\s+['"](.+)['"];/);
		if (!match) continue;

		const [, rawPart, rawPath] = match;
		if (!rawPart || !rawPath) continue;

		const entry = importMap.get(rawPath) ?? {
			default: null,
			named: new Set<string>()
		};
		importMap.set(rawPath, entry);

		const names = rawPart.startsWith('{')
			? rawPart
					.slice(1, -1)
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		names.forEach((name) => entry.named.add(name));
		if (names.length === 0) entry.default = rawPart.trim();
	}

	const importStatements = Array.from(importMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([path, { default: def, named }]) => {
			const parts: string[] = [];
			if (def) parts.push(def);
			if (named.size) parts.push(`{ ${[...named].sort().join(', ')} }`);

			return `import ${parts.join(', ')} from '${path}';`;
		})
		.join('\n');

	if (requiresVue && requiresSvelte) {
		const utilsDir = join(backendDirectory, 'utils');
		mkdirSync(utilsDir, { recursive: true });
		writeFileSync(
			join(utilsDir, 'vueImporter.ts'),
			`import VueExample from "../../frontend/vue/pages/VueExample.vue";

export const vueImports = { VueExample } as const;`
		);
	}

	const useStatements = uniqueDependencies
		.flatMap((d) => d.imports ?? [])
		.filter((i) => i.isPlugin)
		.map((i) => {
			if (i.config === undefined) {
				return `.use(${i.packageName})`;
			}
			if (i.config === null) {
				return `.use(${i.packageName}())`;
			}

			return `.use(${i.packageName}(${JSON.stringify(i.config)}))`;
		})
		.join('\n');

	const frontendEntries = Object.entries(frontendDirectories);

	const manifestOptions = [
		`assetsDirectory: '${assetsDirectory}'`,
		`buildDirectory: '${buildDirectory}'`,
		...frontendEntries.map(
			([f, dir]) => `${f}Directory: 'src/frontend${dir ? `/${dir}` : ''}'`
		),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	]
		.filter(Boolean)
		.join(',\n  ');

	const manifestDecl = `${
		nonFrameworkOnly ? '' : 'const manifest = '
	}await build({
  ${manifestOptions}
});`;

	const getHandler = (f: Frontend, dir: string) => {
		const base = `${buildDirectory}${dir ? `/${dir}` : ''}/pages`;
		switch (f) {
			case 'html':
				return `handleHTMLPageRequest(\`${base}/HTMLExample.html\`)`;
			case 'htmx':
				return `handleHTMXPageRequest(\`${base}/HTMXExample.html\`)`;
			case 'react':
				return `handleReactPageRequest(
					ReactExample,
					asset(manifest, 'ReactExampleIndex'),
					{ initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
				)`;
			case 'svelte':
				return `handleSveltePageRequest(
					SvelteExample,
					asset(manifest, 'SvelteExample'),
					asset(manifest, 'SvelteExampleIndex'),
					{ initialCount: 0, cssPath: asset(manifest, 'SvelteExampleCSS') }
				)`;
			case 'vue':
				return requiresSvelte
					? `handleVuePageRequest(
						vueImports.VueExample,
						asset(manifest, 'VueExample'),
						asset(manifest, 'VueExampleIndex'),
						generateHeadElement({
							cssPath: asset(manifest, 'VueExampleCSS'),
							title: 'AbsoluteJS + Vue',
							description: 'A Vue.js example with AbsoluteJS'
						}),
						{ initialCount: 0 }
					)`
					: `handleVuePageRequest(
						VueExample,
						asset(manifest, 'VueExample'),
						asset(manifest, 'VueExampleIndex'),
						generateHeadElement({
							cssPath: asset(manifest, 'VueExampleCSS'),
							title: 'AbsoluteJS + Vue',
							description: 'A Vue.js example with AbsoluteJS'
						}),
						{ initialCount: 0 }
					)`;
			default:
				return '';
		}
	};

	const routes: string[] = [];
	frontendEntries.forEach(([f, dir], i) => {
		if (!isFrontend(f)) return;
		const handlerCall = getHandler(f, dir);
		if (i === 0) routes.push(`.get('/', () => ${handlerCall})`);
		if (f === 'htmx') {
			routes.push(
				`.get('/htmx', () => ${handlerCall})`,
				`.post('/htmx/reset', ({ resetScopedStore }) => resetScopedStore())`,
				`.get('/htmx/count', ({ scopedStore }) => scopedStore.count)`,
				`.post('/htmx/increment', ({ scopedStore }) => ++scopedStore.count)`
			);
		} else {
			routes.push(`.get('/${f}', () => ${handlerCall})`);
		}
	});

	const clientInitMap = {
		neon: 'const sql = neon(env.DATABASE_URL);',
		planetscale: 'const sql = connect({ url: env.DATABASE_URL });',
		turso: 'const sql = createClient({ url: env.DATABASE_URL });'
	} as const;

	let initLine: string | undefined;
	if (databaseHost && databaseHost !== 'none') {
		initLine = clientInitMap[databaseHost];
	}

	const dbSetup =
		orm === 'drizzle' && initLine
			? `
if (env.DATABASE_URL === undefined) {
	throw new Error('DATABASE_URL is not set in .env file');
}
${initLine}
const db = drizzle(sql, { schema });
`
			: '';

	const content = `${importStatements}

${manifestDecl}
${dbSetup}
new Elysia()
${useStatements}
  ${routes.join('\n  ')}
  .on('error', (err) => {
    const { request } = err;
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`);
  });
`;

	writeFileSync(serverFilePath, content);
};
