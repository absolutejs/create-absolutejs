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

			if (
				isAuth &&
				databaseEngine !== undefined &&
				databaseEngine !== 'none'
			) {
				const baseConfigString = pluginImport.config
					? JSON.stringify(pluginImport.config).slice(1, -1)
					: '';
				const instantiate =
					orm !== undefined && orm !== 'none'
						? 'instantiateUserSession<User>'
						: 'instantiateUserSession';
				const mergedConfig = `{ ${baseConfigString}${
					baseConfigString ? ',' : ''
				} onCallbackSuccess: async ({ authProvider, providerInstance, tokenResponse, userSessionId, session }) => ${instantiate}({ authProvider, providerInstance, session, tokenResponse, userSessionId, createUser: async (userIdentity) => { const user = await createUser({ authProvider, db, userIdentity }); if (!user) throw new Error('Failed to create user'); return user; }, getUser: async (userIdentity) => { const user = await getUser({ authProvider, db, userIdentity }); return user; } }) }`;

				return `.use(absoluteAuth(${mergedConfig}))`;
			}

			if (isAuth && pluginImport.config !== undefined) {
				return `.use(absoluteAuth(${JSON.stringify(
					pluginImport.config
				)}))`;
			}

			if (isAuth && pluginImport.config === null) {
				return `.use(absoluteAuth())`;
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
