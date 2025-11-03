import { isFrontend } from '../../typeGuards';
import type { AuthProvider, FrontendDirectories } from '../../types';
import type { FrameworkFlags } from './computeFlags';

type GenerateRoutesBlockProps = {
	flags: FrameworkFlags;
	frontendDirectories: FrontendDirectories;
	authProvider: AuthProvider;
	buildDirectory: string;
};

export const generateRoutesBlock = ({
	flags,
	frontendDirectories,
	authProvider,
	buildDirectory
}: GenerateRoutesBlockProps) => {
	const routes: string[] = [];

	const createHandlerCall = (frontend: string, directory: string) => {
		const base = `${buildDirectory}${directory ? `/${directory}` : ''}/pages`;

		if (frontend === 'html')
			return `handleHTMLPageRequest(\`${base}/HTMLExample.html\`)`;

		if (frontend === 'htmx')
			return `handleHTMXPageRequest(\`${base}/HTMXExample.html\`)`;

		if (frontend === 'react')
			return `handleReactPageRequest(
        ReactExample,
        asset(manifest, 'ReactExampleIndex'),
        { initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
      )`;

		if (frontend === 'svelte')
			return `handleSveltePageRequest(
        SvelteExample,
        asset(manifest, 'SvelteExample'),
        asset(manifest, 'SvelteExampleIndex'),
        { initialCount: 0, cssPath: asset(manifest, 'SvelteExampleCSS') }
      )`;

		if (frontend === 'vue')
			return flags.requiresSvelte
				? `handleVuePageRequest(
          vueImports.VueExample,
          asset(manifest, 'VueExample'),
          asset(manifest, 'VueExampleIndex'),
          generateHeadElement({
            cssPath: asset(manifest, 'VueExampleCSS'),
            title: 'AbsoluteJS + Vue',
            description: 'A Vue.js example with AbsoluteJS'
          })
        )`
				: `handleVuePageRequest(
          VueExample,
          asset(manifest, 'VueExample'),
          asset(manifest, 'VueExampleIndex'),
          generateHeadElement({
            cssPath: asset(manifest, 'VueExampleCSS'),
            title: 'AbsoluteJS + Vue',
            description: 'A Vue.js example with AbsoluteJS'
          })
        )`;

		return '';
	};

	Object.entries(frontendDirectories).forEach(
		([frontend, directory], entryIndex) => {
			if (!isFrontend(frontend)) return;

			const handlerCall = createHandlerCall(frontend, directory);

			if (entryIndex === 0)
				routes.push(`.get('/', () => ${handlerCall})`);

			if (frontend === 'htmx') {
				routes.push(
					`.get('/htmx', () => ${handlerCall})`,
					`.post('/htmx/reset', ({ resetScopedStore }) => resetScopedStore())`,
					`.get('/htmx/count', ({ scopedStore }) => scopedStore.count)`,
					`.post('/htmx/increment', ({ scopedStore }) => ++scopedStore.count)`
				);
			} else {
				routes.push(`.get('/${frontend}', () => ${handlerCall})`);
			}
		}
	);

	if (authProvider === undefined || authProvider === 'none') {
		routes.push(
			`.get('/count/:uid', ({ params: { uid } }) => getCountHistory(db, uid), {
    params: t.Object({
      uid: t.Number()
    })
  })`,
			`.post('/count', ({ body: { count } }) => createCountHistory(db, count), {
    body: t.Object({
      count: t.Number()
    })
  })`
		);
	}

	return routes.join('\n  ');
};
