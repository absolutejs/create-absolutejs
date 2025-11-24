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
	// Helper to determine JSX compiler option based on frontends
	const getJsxOption = () => {
		if (frontends.includes('react')) return 'react-jsx';
		if (frontends.includes('vue')) return 'preserve';

		return undefined;
	};

	const writeTsconfigFile = () => {
		const tsconfigContent = readFileSync(tsconfigTemplatePath, 'utf-8');
		const tsconfig = JSON.parse(tsconfigContent);

		if (!tsconfig.compilerOptions) {
			tsconfig.compilerOptions = {};
		}

		const jsxOption = getJsxOption();
		if (!jsxOption) {
			delete tsconfig.compilerOptions.jsx;
			mkdirSync(projectName, { recursive: true });
			writeFileSync(tsconfigTargetPath, `${JSON.stringify(tsconfig, null, 2)}\n`);

			return;
		}

		tsconfig.compilerOptions.jsx = jsxOption;
		mkdirSync(projectName, { recursive: true });
		writeFileSync(tsconfigTargetPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
	};

	try {
		writeTsconfigFile();
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			`Failed to scaffold tsconfig from "${tsconfigTemplatePath}" to "${tsconfigTargetPath}": ${message}`
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
