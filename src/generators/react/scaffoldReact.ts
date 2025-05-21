import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateReactPage } from './generateReactPage';

type ScaffoldReactProps = {
	stylesDirectory: string;
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
};

export const scaffoldReact = ({
	stylesDirectory,
	templatesDirectory,
	isSingle,
	targetDirectory
}: ScaffoldReactProps) => {
	const reactStylesSrc = join(templatesDirectory, 'react', 'styles');
	const reactTemplates = join(templatesDirectory, 'react');
	const pagesDirectory = join(targetDirectory, 'pages');
	const reactPageExample = generateReactPage(isSingle);

	mkdirSync(pagesDirectory);
	writeFileSync(join(pagesDirectory, 'Example.tsx'), reactPageExample);

	cpSync(
		join(reactTemplates, 'components'),
		join(targetDirectory, 'components'),
		{
			recursive: true
		}
	);

	cpSync(join(reactTemplates, 'hooks'), join(targetDirectory, 'hooks'), {
		recursive: true
	});

	if (isSingle) {
		cpSync(reactStylesSrc, stylesDirectory, {
			recursive: true
		});
	} else {
		const dest = join(stylesDirectory, 'react');
		mkdirSync(dest);
		cpSync(reactStylesSrc, dest, {
			recursive: true
		});
	}
};
