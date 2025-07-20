import type { AvailableDependency, DatabaseEngine, ORM } from '../../types';

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
				const baseConfigString =
					pluginImport.config !== null
						? JSON.stringify(pluginImport.config).slice(1, -1)
						: '';

				const hasDatabase =
					databaseEngine !== undefined && databaseEngine !== 'none';
				const hasOrm = orm !== undefined && orm !== 'none';
				const instantiate = 'instantiateUserSession';
				const pluginGeneric = hasOrm ? '<User>' : '';

				const callback = hasDatabase
					? `async ({ authProvider, providerInstance, tokenResponse, userSessionId, session }) => ${instantiate}({ authProvider, providerInstance, session, tokenResponse, userSessionId, createUser: (userIdentity) => createUser({ authProvider, db, userIdentity }), getUser: (userIdentity) => getUser({ authProvider, db, userIdentity }) })`
					: `({ authProvider, tokenResponse, userSessionId }) => { console.log(\`Successfully authorized OAuth2 with \${authProvider} (session: \${userSessionId})\`, tokenResponse); }`;

				const mergedConfig = `{ ${baseConfigString}${baseConfigString ? ',' : ''} onCallbackSuccess: ${callback} }`;

				return `.use(absoluteAuth${pluginGeneric}(${mergedConfig}))`;
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
