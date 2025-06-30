import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Language } from '../../types';
import { generateSveltePage } from './generateSveltePage';

type ScaffoldSvelteProps = {
	targetDirectory: string;
	language: Language;
};

export const scaffoldSvelte = ({
	targetDirectory,
	language
}: ScaffoldSvelteProps) => {
	const pageExample = generateSveltePage(language);
	const pagesDirectory = join(targetDirectory, 'pages');
	const componentsDirectory = join(targetDirectory, 'components');

	mkdirSync(pagesDirectory, { recursive: true });
	writeFileSync(join(pagesDirectory, 'SvelteExample.svelte'), pageExample);

	mkdirSync(join(componentsDirectory), { recursive: true });
};
