import type { CreateConfiguration, FrontendDirectories } from '../../types';

type GenerateBuildBlockProps = {
	assetsDirectory: string;
	buildDirectory: string;
	frontendDirectories: FrontendDirectories;
	publicDirectory: string;
	tailwind: CreateConfiguration['tailwind'];
};

export const generateBuildBlock = ({
	assetsDirectory,
	buildDirectory,
	frontendDirectories,
	publicDirectory,
	tailwind
}: GenerateBuildBlockProps) => {
	const configEntries = [
		`assetsDirectory: '${assetsDirectory}'`,
		`buildDirectory: '${buildDirectory}'`,
		...Object.entries(frontendDirectories).map(
			([f, dir]) => `${f}Directory: 'src/frontend${dir ? `/${dir}` : ''}'`
		),
		`publicDirectory: '${publicDirectory}'`,
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	]
		.filter(Boolean)
		.join(',\n  ');

	return `const buildConfig: BuildConfig = {
  ${configEntries}
};

const isDev = env.NODE_ENV === 'development';
const result = isDev ? await devBuild(buildConfig) : await build(buildConfig);`;
};
