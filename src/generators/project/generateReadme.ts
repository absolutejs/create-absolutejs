import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Frontend } from '../../types';

/* The README template marks Vue-only text with <!-- vue --> … <!-- /vue -->:
 * kept, without the markers, for projects with Vue, and dropped otherwise. */
const VUE_SECTION = /\n<!-- vue -->\n([\s\S]*?)<!-- \/vue -->\n?/g;

export const renderReadme = (template: string, frontends: Frontend[]) =>
	template.replace(VUE_SECTION, (_, text: string) =>
		frontends.includes('vue') ? `\n\n${text}` : '\n'
	);

export const scaffoldReadme = (
	templatesDirectory: string,
	projectName: string,
	frontends: Frontend[]
) =>
	writeFileSync(
		join(projectName, 'README.md'),
		renderReadme(
			readFileSync(join(templatesDirectory, 'README.md'), 'utf-8'),
			frontends
		)
	);
