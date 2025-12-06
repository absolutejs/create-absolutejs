import { isFrontend } from '../../typeGuards';
import type { AuthOption, FrontendDirectories } from '../../types';
import type { FrameworkFlags } from './computeFlags';

type GenerateRoutesBlockProps = {
	flags: FrameworkFlags;
	frontendDirectories: FrontendDirectories;
	authOption: AuthOption;
	buildDirectory: string;
};

export const generateRoutesBlock = ({
	flags,
	frontendDirectories,
	authOption,
	buildDirectory
}: GenerateRoutesBlockProps) => {
	const routes: string[] = [];

	const wrap = (handlerCall: string) =>
		authOption === 'abs'
			? `async ({ cookie: { auth_provider, user_session_id }, store: { session }, status }) => {
    const { user, error } = await getStatus(session, user_session_id);

    if (error) {
      return status(error.code, error.message);
    }

    const providerConfiguration =
      auth_provider.value && providers[auth_provider.value];

    return ${handlerCall};
  }`
			: `() => ${handlerCall}`;

	const createHandlerCall = (frontend: string, directory: string) => {
		const base = `${buildDirectory}${directory ? `/${directory}` : ''}/pages`;

		if (frontend === 'html')
			return `handleHTMLPageRequest(\`${base}/HTMLExample.html\`)`;

		if (frontend === 'htmx')
			return `handleHTMXPageRequest(\`${base}/HTMXExample.html\`)`;

		if (frontend === 'react') {
			const reactProps =
				authOption === 'abs'
					? `{ initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS'), user, providerConfiguration }`
					: `{ initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }`;

			return `handleReactPageRequest(
    ReactExample,
    asset(manifest, 'ReactExampleIndex'),
    ${reactProps}
  )`;
		}

		if (frontend === 'svelte')
			return `handleSveltePageRequest(
    SvelteExample,
    asset(manifest, 'SvelteExample'),
    asset(manifest, 'SvelteExampleIndex'),
    { initialCount: 0, cssPath: asset(manifest, 'SvelteExampleCSS') }
  )`;

		if (frontend === 'vue') {
			const vueComponent = flags.requiresSvelte
				? 'vueImports.VueExample'
				: 'VueExample';

			return `handleVuePageRequest(
    ${vueComponent},
    asset(manifest, 'VueExample'),
    asset(manifest, 'VueExampleIndex'),
    generateHeadElement({
      cssPath: asset(manifest, 'VueExampleCSS'),
      title: 'AbsoluteJS + Vue',
      description: 'A Vue.js example with AbsoluteJS'
    }),
    { initialCount: 0 }
  )`;
		}

		return '';
	};

	Object.entries(frontendDirectories).forEach(
		([frontend, directory], entryIndex) => {
			if (!isFrontend(frontend)) return;

			const handlerCall = createHandlerCall(frontend, directory);
			if (!handlerCall) return;

			const handler = wrap(handlerCall);

			if (entryIndex === 0) {
				routes.push(`.get('/', ${handler})`);
			}

			if (frontend === 'htmx') {
				routes.push(`.get('/htmx', ${handler})`);
				routes.push(
					`.post('/htmx/reset', ({ resetScopedStore }) => resetScopedStore())`,
					`.get('/htmx/count', ({ scopedStore }) => scopedStore.count)`,
					`.post('/htmx/increment', ({ scopedStore }) => ++scopedStore.count)`
				);
			} else {
				routes.push(`.get('/${frontend}', ${handler})`);
			}
		}
	);

	if (authOption === undefined || authOption === 'none') {
		routes.push(
			`.get('/count/:uid', ({ params: { uid } }) => getCountHistory(db, uid), {
    params: t.Object({ uid: t.Number() })
  })`,
			`.post('/count', ({ body: { count } }) => createCountHistory(db, count), {
    body: t.Object({ count: t.Number() })
  })`
		);
	}

	return routes.join('\n  ');
};
