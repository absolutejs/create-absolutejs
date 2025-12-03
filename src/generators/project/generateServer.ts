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

	let dbBlock = '';
	if (databaseEngine && databaseEngine !== 'none') {
		dbBlock = generateDBBlock({ databaseEngine, databaseHost, orm });
	}

	const useBlock = generateUseBlock({
		databaseEngine,
		deps,
		orm
	});
	const routesBlock = generateRoutesBlock({
		authProvider,
		buildDirectory,
		databaseEngine,
		flags,
		frontendDirectories
	});

	// Generate Angular dynamic imports after build
	const angularImports = flags.requiresAngular
		? `\n// Dynamically import Angular components after compilation\nconst { default: AngularExample } = await import('../frontend/compiled/pages/AngularExample');\n`
		: '';

	const content = `${importsBlock}

${manifestBlock}${angularImports}
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

	// For Angular, create an entry point file that loads the compiler before importing the server
	if (flags.requiresAngular) {
		const entryPointPath = join(backendDirectory, 'index.ts');
		const entryPointContent = `// Entry point for Angular SSR
// Loads the Angular compiler before importing any server code

// Load Angular compiler first (required for JIT compilation in SSR)
await import('@angular/compiler');

// Now import the server which will import Angular components
await import('./server');
`;
		writeFileSync(entryPointPath, entryPointContent);
	}
};
