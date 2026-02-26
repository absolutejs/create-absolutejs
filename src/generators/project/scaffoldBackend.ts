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
	| 'databaseDirectory'
	| 'databaseEngine'
	| 'databaseHost'
	| 'frontendDirectories'
	| 'orm'
	| 'plugins'
	| 'tailwind'
> & {
	backendDirectory: string;
	publicDirectory: string;
};

export const scaffoldBackend = ({
	assetsDirectory,
	authOption,
	absProviders,
	backendDirectory,
	buildDirectory,
	databaseDirectory,
	databaseEngine,
	databaseHost,
	frontendDirectories,
	orm,
	plugins,
	publicDirectory,
	tailwind
}: ScaffoldBackendProps) => {
	generateServerFile({
		assetsDirectory,
		authOption,
		backendDirectory,
		buildDirectory,
		databaseDirectory,
		databaseEngine,
		databaseHost,
		frontendDirectories,
		orm,
		plugins,
		publicDirectory,
		tailwind
	});

	if (authOption === 'abs') {
		mkdirSync(join(backendDirectory, 'utils'), { recursive: true });
		const hasDatabase =
			databaseEngine !== undefined && databaseEngine !== 'none';
		const absoluteAuthConfig = generateAbsoluteAuthConfig(
			absProviders,
			hasDatabase
		);
		writeFileSync(
			join(backendDirectory, 'utils', 'absoluteAuthConfig.ts'),
			absoluteAuthConfig,
			'utf-8'
		);
	}
};
