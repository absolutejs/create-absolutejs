import type {
	CreateConfiguration,
	Frontend,
	FrontendDirectories
} from '../../types';

type GenerateBuildBlockProps = {
	assetsDirectory: string;
	buildDirectory: string;
	frontendDirectories: FrontendDirectories;
	tailwind: CreateConfiguration['tailwind'];
};

export const generateBuildBlock = ({
	assetsDirectory,
	buildDirectory,
	frontendDirectories,
	tailwind
}: GenerateBuildBlockProps) => {
	const opts = [
		`assetsDirectory: '${assetsDirectory}'`,
		`buildDirectory: '${buildDirectory}'`,
		...Object.entries(frontendDirectories).map(
			([f, dir]) => `${f}Directory: 'src/frontend${dir ? `/${dir}` : ''}'`
		),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	]
		.filter(Boolean)
		.join(',\n  ');

	const frameworks: Frontend[] = ['react', 'svelte', 'vue'];
	const nonFrameworkOnly = frameworks.every(
		(f) => frontendDirectories[f] === undefined
	);

	return `${nonFrameworkOnly ? '' : 'const manifest = '}await build({\n  ${opts}\n});`;
};
