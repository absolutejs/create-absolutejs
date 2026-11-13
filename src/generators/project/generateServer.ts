import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration } from '../../types';
import { collectDependencies } from './collectDependencies';
import { computeFlags } from './computeFlags';
import { generateBuildBlock } from './generateBuildBlock';
import { generateDBBlock } from './generateDBBlock';
import { generateImportsBlock } from './generateImportsBlock';
import { generateRoutesBlock } from './generateRoutesBlock';

type CreateServerFileProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'authOption'
	| 'databaseEngine'
	| 'plugins'
	| 'buildDirectory'
	| 'databaseHost'
	| 'orm'
	| 'assetsDirectory'
	| 'frontendDirectories'
> & {
	backendDirectory: string;
	publicDirectory: string;
};

export const generateServerFile = ({
	tailwind,
	authOption,
	plugins,
	buildDirectory,
	databaseEngine,
	databaseHost,
	orm,
	assetsDirectory,
	frontendDirectories,
	backendDirectory,
	publicDirectory
}: CreateServerFileProps) => {
	const serverFilePath = join(backendDirectory, 'server.ts');

	const flags = computeFlags(frontendDirectories);
	const deps = collectDependencies({ authOption, flags, plugins });

	const importsBlock = generateImportsBlock({
		authOption,
		databaseEngine,
		databaseHost,
		deps,
		flags,
		frontendDirectories,
		orm
	});

	const manifestBlock = generateBuildBlock({
		assetsDirectory,
		backendDirectory,
		buildDirectory,
		frontendDirectories,
		publicDirectory,
		tailwind
	});

	let dbBlock = '';
	if (databaseEngine && databaseEngine !== 'none') {
		dbBlock = generateDBBlock({ databaseEngine, databaseHost, orm });
	}

	const pluginExpressions = deps
		.flatMap((dependency) => dependency.imports ?? [])
		.filter(
			(pluginImport) =>
				pluginImport.isPlugin &&
				pluginImport.packageName !== 'networking' &&
				pluginImport.packageName !== 'openapi'
		)
		.map((pluginImport) => {
			if (pluginImport.packageName === 'auth') {
				return 'authPlugin';
			}

			if (pluginImport.packageName === 'rateLimit') {
				return 'rateLimiter';
			}

			if (pluginImport.config === undefined) {
				return pluginImport.packageName;
			}

			if (pluginImport.config === null) {
				return `${pluginImport.packageName}()`;
			}

			return `${pluginImport.packageName}(${JSON.stringify(
				pluginImport.config
			)})`;
		});
	const useBlock = pluginExpressions.join(', ');

	/* 100 requests a minute per visitor, bursts of 20. Behind the
	 * AbsoluteJS edge the visitor's address arrives as X-Real-IP from a
	 * private address; it is read only from there, so off the platform (or
	 * reaching the app directly) each connection is keyed by its own
	 * address and a client can't choose its key. */
	const rateLimitBlock = pluginExpressions.includes('rateLimiter')
		? `const rateLimiter = rateLimit({
	algorithm: gcra({ burst: 20, periodMs: 60_000, requestsPerPeriod: 100 }),
	clientIpHeader: 'x-real-ip',
	key: 'ip',
	trustedProxies: 1,
	trustedProxyCidrs: ['10.0.0.0/8']
})
`
		: '';

	const guardBlock = `.guard({
			cookie: t.Cookie({
				auth_client: authClientOption,
				auth_intent: authIntentOption,
				user_session_id: userSessionIdTypebox
			})
		})`;

	const routesBlock = generateRoutesBlock({
		authOption,
		databaseEngine,
		frontendDirectories,
		includeDatabaseRoutes: false
	});

	const hasDatabase =
		databaseEngine !== undefined && databaseEngine !== 'none';

	/* Resolve async auth before composing the shallow plugin array. */
	const authBlock =
		authOption === 'abs'
			? `const authPlugin = await auth(absoluteAuthConfig(${hasDatabase ? 'db' : ''}))\n`
			: '';

	const content = `${importsBlock}
import { ${hasDatabase && authOption !== 'abs' ? 'createApi' : 'api'} } from './api'

${manifestBlock}
${dbBlock ? `${dbBlock}\n` : ''}${hasDatabase && authOption !== 'abs' ? 'const api = createApi(db)\n' : ''}${authBlock}${rateLimitBlock}
export const server = new Elysia()
.use([absolutejs, api${useBlock ? `, ${useBlock}` : ''}])
${authOption === 'abs' ? `\n${guardBlock}` : ''}
  ${routesBlock}
  ${plugins.includes('@elysia/openapi') ? '.use(openapi())' : ''}
  .onError(({ request, error }) => {
    console.error(\`Server error on \${request.method} \${request.url}\`, error)
  })
  .use(networking)

`;
	writeFileSync(
		join(backendDirectory, 'api.ts'),
		hasDatabase && authOption !== 'abs'
			? `import { Elysia, t } from 'elysia'
import type { DatabaseType } from '../types/databaseTypes'
import { getCountHistory, createCountHistory } from './handlers/countHistoryHandlers'
export const createApi = (db: DatabaseType) => new Elysia({name:'application-api'})
${generateRoutesBlock({ authOption: 'none', databaseEngine, frontendDirectories: {} })}
export type Api = ReturnType<typeof createApi>
`
			: "import { Elysia } from 'elysia'\n\n// Add typed JSON subapps here; keep page rendering and lifecycle in server.ts.\nexport const api = new Elysia({ name: 'application-api' })\nexport type Api = typeof api\n"
	);
	writeFileSync(serverFilePath, content);
};
