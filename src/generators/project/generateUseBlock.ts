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
					? `async ({ authProvider, providerInstance, tokenResponse, user_session_id, session }: any) => ${instantiate}({ authProvider, providerInstance, session, tokenResponse, user_session_id: user_session_id as any, createUser: (userIdentity: Record<string, unknown>) => createUser({ authProvider, db, userIdentity }), getUser: (userIdentity: Record<string, unknown>) => getUser({ authProvider, db, userIdentity }) } as any)`
					: `({ authProvider, tokenResponse, user_session_id }: any) => { console.log('Successfully authorized OAuth2 with ' + authProvider + ' (session: ' + user_session_id + ')', tokenResponse); }`;

				// Build the config object carefully to avoid template literal nesting issues
				// Use string concatenation instead of template literal interpolation to avoid parsing issues
				// Wrap callback in parentheses before applying 'as any' to ensure proper parsing
				let mergedConfig = '{';
				if (baseConfigString) {
					mergedConfig += ' ' + baseConfigString + ',';
				}
				mergedConfig += ' onCallbackSuccess: (' + callback + ') as any }';

				return '.use(absoluteAuth' + pluginGeneric + '(' + mergedConfig + '))';
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
