import type { AvailableDependency, DatabaseEngine, ORM } from '../../types';

// Helper to extract providers array from auth config
const extractProvidersArray = (config: Record<string, unknown> | null) => {
	try {
		const providersConfig = config?.providersConfiguration as Record<string, unknown> | undefined;
		if (providersConfig) {
			return JSON.stringify(Object.keys(providersConfig));
		}
	} catch {
		// Ignore parse errors
	}

	return '[]';
};

// Helper to check if GitHub redirectUri is configured
const getRedirectWarning = (config: Record<string, unknown> | null) => {
	try {
		const providersConfig = config?.providersConfiguration as Record<string, unknown> | undefined;
		const githubConfig = providersConfig?.github as Record<string, unknown> | undefined;
		const credentials = githubConfig?.credentials as Record<string, unknown> | undefined;
		if (!credentials?.redirectUri) {
			return " /* generated: github.credentials.redirectUri not set - callbacks use '/auth/callback/:provider' */";
		}
	} catch {
		// Ignore parse errors
	}

	return '';
};

// Helper to build auth plugin configuration string
const buildAuthConfig = (
	pluginImport: { packageName: string; isPlugin: boolean; config?: Record<string, unknown> | null },
	databaseEngine: DatabaseEngine,
	orm: ORM
) => {
	const baseConfigString =
		pluginImport.config !== null
			? JSON.stringify(pluginImport.config).slice(1, -1)
			: '';

	const hasDatabase = databaseEngine !== undefined && databaseEngine !== 'none';
	const hasOrm = orm !== undefined && orm !== 'none';
	const instantiate = 'instantiateUserSession';
	const pluginGeneric = hasOrm ? '<User>' : '';

	const callback = hasDatabase
		? `async ({ authProvider, providerInstance, tokenResponse, user_session_id, session }: Record<string, unknown>) => ${instantiate}({ authProvider, providerInstance, session, tokenResponse, user_session_id: user_session_id as string, createUser: (userIdentity: Record<string, unknown>) => createUser({ authProvider, db, userIdentity }), getUser: (userIdentity: Record<string, unknown>) => getUser({ authProvider, db, user_identity: userIdentity }) } as Record<string, unknown>)`
		: `({ authProvider, tokenResponse, user_session_id }: Record<string, unknown>) => { console.log('Successfully authorized OAuth2 with ' + authProvider + ' (session: ' + user_session_id + ')', tokenResponse); }`;

	const routesString = `authorizeRoute: '/auth/authorize/:provider', callbackRoute: '/auth/callback/:provider', profileRoute: '/auth/profile', signoutRoute: '/auth/signout', statusRoute: '/auth/session',`;

	const config = pluginImport.config as Record<string, unknown> | null;
	const redirectWarning = getRedirectWarning(config);
	const providersArray = extractProvidersArray(config);

	let mergedConfig = '{';
	if (baseConfigString) {
		mergedConfig += ` ${baseConfigString},`;
	}
	mergedConfig += ` ${routesString} onCallbackSuccess: (${callback}) as Record<string, unknown> ${redirectWarning} }`;

	return (
		`.use(absoluteAuth${pluginGeneric}(${mergedConfig}))` +
		`\n  .get('/auth/providers', () => ${providersArray})` +
		`\n  .post('/auth/session', ({ request }) => ({ message: 'unauthenticated' }), { status: 401 })`
	);
};

export const generateUseBlock = ({
	deps,
	databaseEngine,
	orm
}: {
	deps: AvailableDependency[];
	databaseEngine: DatabaseEngine;
	orm: ORM;
}) =>
	deps
		.flatMap((dependency) => dependency.imports ?? [])
		.filter((pluginImport) => pluginImport.isPlugin)
		.map((pluginImport) => {
			const isAuth = pluginImport.packageName === 'absoluteAuth';

			if (isAuth) {
				return buildAuthConfig(pluginImport, databaseEngine, orm);
			}

			if (pluginImport.config === undefined) {
				return `.use(${pluginImport.packageName})`;
			}

			if (pluginImport.config === null) {
				return `.use(${pluginImport.packageName}())`;
			}

			return `.use(${pluginImport.packageName}(${JSON.stringify(
				pluginImport.config
			)}))`;
		})
		.join('\n');
