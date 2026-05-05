import { isFrontend } from '../../typeGuards';
import type {
	AuthOption,
	CreateConfiguration,
	FrontendDirectories
} from '../../types';

type GenerateRoutesBlockProps = {
	databaseEngine: CreateConfiguration['databaseEngine'];
	frontendDirectories: FrontendDirectories;
	authOption: AuthOption;
};

export const generateRoutesBlock = ({
	databaseEngine,
	frontendDirectories,
	authOption
}: GenerateRoutesBlockProps) => {
	const hasDatabase =
		databaseEngine !== undefined && databaseEngine !== 'none';
	const routes: string[] = [];

	const wrap = (handlerCall: string, isAsync = false) =>
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
			: `${isAsync ? 'async ' : ''}() => ${handlerCall}`;

	const createHandlerCall = (frontend: string) => {
		if (frontend === 'angular')
			return `handleAngularPageRequest<typeof AngularExamplePage>({
    headTag: generateHeadElement({
      cssPath: asset(manifest, 'AngularExampleCSS'),
      title: 'AbsoluteJS + Angular'
    }),
    indexPath: asset(manifest, 'AngularExampleIndex'),
    pagePath: asset(manifest, 'AngularExample'),
    props: { initialCount: 0 }
  })`;

		if (frontend === 'html')
			return `handleHTMLPageRequest(asset(manifest, 'HTMLExample'))`;

		if (frontend === 'htmx')
			return `handleHTMXPageRequest(asset(manifest, 'HTMXExample'))`;

		if (frontend === 'react') {
			const reactProps =
				authOption === 'abs'
					? `{ cssPath: asset(manifest, 'ReactExampleCSS'), initialCount: 0, providerConfiguration, user }`
					: `{ cssPath: asset(manifest, 'ReactExampleCSS'), initialCount: 0 }`;

			return `handleReactPageRequest({
    Page: ReactExample,
    index: asset(manifest, 'ReactExampleIndex'),
    props: ${reactProps}
  })`;
		}

		if (frontend === 'svelte')
			return `handleSveltePageRequest<typeof SvelteExample>({
    indexPath: asset(manifest, 'SvelteExampleIndex'),
    pagePath: asset(manifest, 'SvelteExample'),
    props: { cssPath: asset(manifest, 'SvelteExampleCSS'), initialCount: 0 }
  })`;

		if (frontend === 'vue')
			return `handleVuePageRequest<typeof VueExample>({
    headTag: generateHeadElement({
      cssPath: asset(manifest, 'VueExampleCompiledCSS'),
      title: 'AbsoluteJS + Vue'
    }),
    indexPath: asset(manifest, 'VueExampleIndex'),
    pagePath: asset(manifest, 'VueExample'),
    props: { initialCount: 0 }
  })`;

		return '';
	};

	Object.entries(frontendDirectories).forEach(([frontend], entryIndex) => {
		if (!isFrontend(frontend)) return;

		const handlerCall = createHandlerCall(frontend);
		if (!handlerCall) return;

		const isAsync = frontend === 'angular';
		const handler = wrap(handlerCall, isAsync);

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
	});

	if (hasDatabase && (authOption === undefined || authOption === 'none')) {
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
