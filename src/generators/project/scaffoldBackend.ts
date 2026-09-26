import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CreateConfiguration } from '../../types';
import { generateAbsoluteAuthConfig } from './generateAbsoluteAuthConfig';
import { generateIdentity } from './generateIdentity';
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
	publicDirectory: string;
	typesDirectory: string;
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
	publicDirectory,
	tailwind,
	typesDirectory
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
		publicDirectory,
		tailwind
	});

	if (authOption === 'abs') {
		mkdirSync(typesDirectory, { recursive: true });
		writeFileSync(
			join(typesDirectory, 'userIdentity.ts'),
			generateIdentity()
		);
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
