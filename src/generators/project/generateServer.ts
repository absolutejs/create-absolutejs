import { mkdirSync, writeFileSync } from 'fs';
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
	backendDirectory
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
		tailwind
	});

	let dbBlock = '';
	if (databaseEngine && databaseEngine !== 'none') {
		dbBlock = generateDBBlock({ databaseEngine, databaseHost, orm });
	}

	const useBlock = deps
		.flatMap((dependency) => dependency.imports ?? [])
		.filter((pluginImport) => pluginImport.isPlugin)
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

	let lifecycleCleanup = '';
	if (orm === 'prisma' && databaseEngine && databaseEngine !== 'none') {
		lifecycleCleanup = `
// Graceful shutdown for Prisma
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
`;
	}

	const content = `${importsBlock}

${manifestBlock}
${dbBlock}
new Elysia()
${useBlock}
${authOption === 'abs' ? guardBlock : ''}
  ${routesBlock}
  .on('error', err => {
    const { request } = err
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`)
  });
${lifecycleCleanup}`;

	mkdirSync(backendDirectory, { recursive: true });
	writeFileSync(serverFilePath, content);
};
