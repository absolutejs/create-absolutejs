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

	// For non-framework projects, we don't need manifest or HMR
	if (nonFrameworkOnly) {
		return `await build({\n  ${opts}\n});`;
	}

	// For framework projects, conditionally use dev() or build() based on NODE_ENV
	return `const isDev = process.env.NODE_ENV === 'development';

let manifest, hmrState;

if (isDev) {
  const devResult = await dev({
  ${opts}
});
  manifest = devResult.manifest;
  hmrState = devResult.hmrState;
} else {
  manifest = await build({
  ${opts}
});
}`;
};
