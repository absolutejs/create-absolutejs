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
		backendDirectory,
		databaseEngine,
		databaseHost,
		deps,
		flags,
		frontendDirectories,
		orm
	});

	const manifestBlock = generateBuildBlock({
		assetsDirectory,
		buildDirectory,
		frontendDirectories,
		publicDirectory,
		tailwind
	});

	let dbBlock = '';
	if (databaseEngine && databaseEngine !== 'none') {
		dbBlock = generateDBBlock({ databaseEngine, databaseHost, orm });
	}

	const useBlock = deps
		.flatMap((dependency) => dependency.imports ?? [])
		.filter(
			(pluginImport) =>
				pluginImport.isPlugin &&
				pluginImport.packageName !== 'networking'
		)
		.map((pluginImport) => {
			if (pluginImport.packageName === 'absoluteAuth') {
				const hasDatabase =
					databaseEngine !== undefined && databaseEngine !== 'none';
				return hasDatabase
					? `.use(absoluteAuth(absoluteAuthConfig(db)))`
					: `.use(absoluteAuth(absoluteAuthConfig()))`;
			}

			if (pluginImport.config === undefined) {
				return `.use(${pluginImport.packageName})`;
			}

			if (pluginImport.config === null) {
				return `.use(${pluginImport.packageName}())`;
			}

			return `.use(${pluginImport.packageName}(${JSON.stringify(
				pluginImport.config
			)}))`;
		})
		.join('\n');

	const guardBlock = `.guard({
			cookie: t.Cookie({
				auth_provider: t.Optional(authProviderOption),
				user_session_id: userSessionIdTypebox
			})
		})`;

	const routesBlock = generateRoutesBlock({
		authOption,
		buildDirectory,
		databaseEngine,
		flags,
		frontendDirectories
	});

	const hmrBlock = `
if (
  typeof result.hmrState !== 'string' &&
  typeof result.manifest === 'object'
) {
  server.use(hmr(result.hmrState, result.manifest));
}`;

	const content = `${importsBlock}

${manifestBlock}
${dbBlock ? `${dbBlock}\n` : ''}
const server = new Elysia()
${useBlock}${authOption === 'abs' ? `\n${guardBlock}` : ''}
  ${routesBlock}
  .use(networking)
  .on('error', err => {
    const { request } = err
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`)
  });
${hmrBlock}
`;
	writeFileSync(serverFilePath, content);
};
