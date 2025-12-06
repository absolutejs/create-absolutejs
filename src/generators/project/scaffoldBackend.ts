import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CreateConfiguration } from '../../types';
import { generateAbsoluteAuthConfig } from './generateAbsoluteAuthConfig';
import { generateServerFile } from './generateServer';

type ScaffoldBackendProps = Pick<
	CreateConfiguration,
	| 'assetsDirectory'
	| 'absProviders'
	| 'authOption'
	| 'buildDirectory'
	| 'databaseEngine'
	| 'databaseHost'
	| 'frontendDirectories'
	| 'orm'
	| 'plugins'
	| 'tailwind'
> & {
	backendDirectory: string;
};

export const scaffoldBackend = ({
	assetsDirectory,
	authOption,
	absProviders,
	backendDirectory,
	buildDirectory,
	databaseEngine,
	databaseHost,
	frontendDirectories,
	orm,
	plugins,
	tailwind
}: ScaffoldBackendProps) => {
	generateServerFile({
		assetsDirectory,
		authOption,
		backendDirectory,
		buildDirectory,
		databaseEngine,
		databaseHost,
		frontendDirectories,
		orm,
		plugins,
		tailwind
	});

	if (authOption === 'abs') {
		mkdirSync(join(backendDirectory, 'utils'), { recursive: true });
		const absoluteAuthConfig = generateAbsoluteAuthConfig(absProviders);
		writeFileSync(
			join(backendDirectory, 'utils', 'absoluteAuthConfig.ts'),
			absoluteAuthConfig,
			'utf-8'
		);
	}
};
