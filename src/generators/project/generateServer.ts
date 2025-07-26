import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration } from '../../types';
import { collectDependencies } from './collectDependencies';
import { computeFlags } from './computeFlags';
import { generateBuildBlock } from './generateBuildBlock';
import { generateDBBlock } from './generateDBBlock';
import { generateImportsBlock } from './generateImportsBlock';
import { generateRoutesBlock } from './generateRoutesBlock';
import { generateUseBlock } from './generateUseBlock';

type CreateServerFileProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'authProvider'
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
	authProvider,
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
	const deps = collectDependencies({ authProvider, flags, plugins });

	const importsBlock = generateImportsBlock({
		authProvider,
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

	const dbBlock = generateDBBlock({ databaseEngine, databaseHost, orm });
	const useBlock = generateUseBlock({
		databaseEngine,
		deps,
		orm
	});
	const routesBlock = generateRoutesBlock({
		authProvider,
		buildDirectory,
		flags,
		frontendDirectories
	});

	const content = `${importsBlock}

${manifestBlock}
${dbBlock}
new Elysia()
${useBlock}
  ${routesBlock}
  .on('error', err => {
    const { request } = err
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`)
  });
`;

	mkdirSync(backendDirectory, { recursive: true });
	writeFileSync(serverFilePath, content);
};
