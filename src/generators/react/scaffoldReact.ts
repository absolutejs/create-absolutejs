import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateHeadComponent } from './generateHeadComponent';
import { generateReactPage } from './generateReactPage';

type ScaffoldReactProps = {
	stylesDirectory: string;
	templatesDirectory: string;
	isSingleFrontend: boolean;
	targetDirectory: string;
};

export const scaffoldReact = ({
	stylesDirectory,
	templatesDirectory,
	isSingleFrontend,
	targetDirectory
}: ScaffoldReactProps) => {
	const reactStylesSrc = join(templatesDirectory, 'react', 'styles');
	const reactTemplates = join(templatesDirectory, 'react');
	const pagesDirectory = join(targetDirectory, 'pages');
	const componentsDirectory = join(targetDirectory, 'components');

	const pageExample = generateReactPage(isSingleFrontend);
	const headComponent = generateHeadComponent(isSingleFrontend);

	mkdirSync(pagesDirectory, { recursive: true });
	writeFileSync(join(pagesDirectory, 'ReactExample.tsx'), pageExample);

	mkdirSync(join(componentsDirectory, 'utils'), { recursive: true });
	writeFileSync(
		join(componentsDirectory, 'utils', 'Head.tsx'),
		headComponent
	);

	cpSync(join(reactTemplates, 'hooks'), join(targetDirectory, 'hooks'), {
		recursive: true
	});

	if (isSingleFrontend) {
		cpSync(reactStylesSrc, stylesDirectory, {
			recursive: true
		});
	} else {
		const dest = join(stylesDirectory, 'react');
		mkdirSync(dest, { recursive: true });
		cpSync(reactStylesSrc, dest, {
			recursive: true
		});
	}
};
