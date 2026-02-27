import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration, FrontendDirectories } from '../../types';

type GenerateBuildBlockProps = {
	assetsDirectory: string;
	backendDirectory: string;
	buildDirectory: string;
	frontendDirectories: FrontendDirectories;
	publicDirectory: string;
	tailwind: CreateConfiguration['tailwind'];
};

export const generateBuildBlock = ({
	assetsDirectory,
	backendDirectory,
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
		.join(',\n\t');

	const configContent = `import { defineConfig } from '@absolutejs/absolute'

export default defineConfig({
\t${configEntries}
})
`;

	writeFileSync(
		join(backendDirectory, '..', '..', 'absolute.config.ts'),
		configContent
	);

	return `const { absolutejs, manifest } = await prepare()`;
};
