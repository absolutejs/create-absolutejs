import { copyFileSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { CreateConfiguration } from '../../types';
import { generateEnv } from './generateEnv';
import { generatePrettierrc } from './generatePrettierrc';

type AddConfigurationProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'initializeGitNow'
	| 'codeQualityTool'
	| 'frontends'
	| 'projectName'
	| 'databaseEngine'
	| 'databaseHost'
> & {
	templatesDirectory: string;
	envVariables: string[] | undefined;
};

export const scaffoldConfigurationFiles = ({
	tailwind,
	templatesDirectory,
	databaseEngine,
	envVariables,
	databaseHost,
	codeQualityTool,
	frontends,
	initializeGitNow,
	projectName
}: AddConfigurationProps) => {
	const tsconfigTemplatePath = join(
		templatesDirectory,
		'configurations',
		'tsconfig.example.json'
	);
	const tsconfigTargetPath = join(projectName, 'tsconfig.json');
	try {
		const tsconfigContent = readFileSync(tsconfigTemplatePath, 'utf-8');
		const tsconfig = JSON.parse(tsconfigContent);

		if (!tsconfig.compilerOptions) {
			tsconfig.compilerOptions = {};
		}

		if (frontends.includes('react')) {
			tsconfig.compilerOptions.jsx = 'react-jsx';
		} else if (frontends.includes('vue')) {
			tsconfig.compilerOptions.jsx = 'preserve';
		} else {
			delete tsconfig.compilerOptions.jsx;
		}

		mkdirSync(projectName, { recursive: true });
		writeFileSync(tsconfigTargetPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
	} catch (error: any) {
		console.error(
			`Failed to scaffold tsconfig from "${tsconfigTemplatePath}" to "${tsconfigTargetPath}": ${error?.message ?? error}`
		);
		throw error;
	}

	if (tailwind) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'postcss.config.ts'),
			join(projectName, 'postcss.config.ts')
		);
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.config.ts'),
			join(projectName, 'tailwind.config.ts')
		);
	}
	if (initializeGitNow)
		copyFileSync(
			join(templatesDirectory, 'git', 'gitignore'),
			join(projectName, '.gitignore')
		);

	if (codeQualityTool === 'eslint+prettier') {
		copyFileSync(
			join(templatesDirectory, 'configurations', 'eslint.config.mjs'),
			join(projectName, 'eslint.config.mjs')
		);
		copyFileSync(
			join(templatesDirectory, 'configurations', '.prettierignore'),
			join(projectName, '.prettierignore')
		);
		const prettierrc = generatePrettierrc(frontends);

		writeFileSync(join(projectName, '.prettierrc.json'), prettierrc);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);

	generateEnv({
		databaseEngine,
		databaseHost,
		envVariables,
		projectName
	});

	// Generate Vue type declarations if Vue is included
	if (frontends.includes('vue')) {
		const typesDirectory = join(projectName, 'src', 'types');
		mkdirSync(typesDirectory, { recursive: true });
		const vueShimContent = `declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<{}, {}, any>;
	export default component;
}
`;
		writeFileSync(join(typesDirectory, 'vue-shim.d.ts'), vueShimContent);
	}
};
