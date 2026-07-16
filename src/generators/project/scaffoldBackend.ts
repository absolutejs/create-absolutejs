import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CreateConfiguration } from '../../types';
import {
	generateAbsoluteAuthConfig,
	generateSessionUserType
} from './generateAbsoluteAuthConfig';
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

		/* The auth config and the example page both import `User` from
		   types/databaseTypes, which scaffoldDatabase only writes when there is
		   a database. Without one, emit the session user shape on its own so the
		   auth scaffold still type-checks. */
		if (!hasDatabase) {
			mkdirSync(typesDirectory, { recursive: true });
			writeFileSync(
				join(typesDirectory, 'databaseTypes.ts'),
				generateSessionUserType(),
				'utf-8'
			);
		}
	}
};
