import { CredentialsFor, ProviderOption, ProvidersMap } from '@absolutejs/auth';

type NonEmptyArray<T> = [T, ...T[]];

type OAuth2ConfigurationDefaults = {
	[Provider in ProviderOption]?: {
		credentials: {
			[K in keyof Omit<CredentialsFor<Provider>, 'redirectUri'>]: string;
		};
		searchParams?: [string, string][];
	} & (ProvidersMap[Provider]['scopeRequired'] extends true
		? { scope: NonEmptyArray<string> }
		: { scope?: string[] });
};

const defaultProviderConfigurations: OAuth2ConfigurationDefaults = {
	google: {
		credentials: {
			clientId: "getEnv('GOOGLE_CLIENT_ID')",
			clientSecret: "getEnv('GOOGLE_CLIENT_SECRET')"
		},
		scope: [
			'openid',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email'
		],
		searchParams: [['access_type', 'offline']]
	}
};

/* Mirrors the `User` shape the raw-SQL path writes into types/databaseTypes, so
   an auth scaffold without a database resolves the same type from the same
   module the example page already imports. */
export const generateSessionUserType = () => `export type User = {
	auth_sub: string;
	created_at: Date;
	metadata: Record<string, unknown>;
};
`;

export const generateAbsoluteAuthConfig = (
	absProviders: ProviderOption[] | undefined,
	hasDatabase: boolean
) => {
	const providerConfigs = (absProviders ?? [])
		.map((provider) => {
			const config = defaultProviderConfigurations[provider];

			if (!config) {
				console.warn(
					`No default OAuth2 configuration has been defined for provider "${provider}". ` +
						`Please add a default entry to ` +
						'`defaultProviderConfigurations` or configure this provider manually in `src/backend/utils/absoluteAuthConfig.ts`.'
				);

				return null;
			}

			const credentialsLines = [
				...Object.entries(config.credentials).map(
					([key, value]) => `                ${key}: ${value}`
				),
				`                redirectUri: getEnv('OAUTH2_CALLBACK_URI')`
			].join(',\n');

			const scopePart = config.scope
				? `,
			scope: ${JSON.stringify(config.scope)}`
				: '';

			const searchParamsPart =
				config.searchParams && config.searchParams.length > 0
					? `,
			searchParams: ${JSON.stringify(config.searchParams)}`
					: '';

			return `        ${provider}: {
			credentials: {
${credentialsLines}
			}${scopePart}${searchParamsPart}
		}`;
		})
		.filter((entry): entry is string => entry !== null)
		.join(',\n');

	if (!hasDatabase) {
		return `import { getEnv } from '@absolutejs/absolute';
import {
	createInMemoryAuthSessionStore,
	defineAuthConfig
} from '@absolutejs/auth';
import { User } from '../../types/databaseTypes';

export const absoluteAuthConfig = () =>
	defineAuthConfig<User>({
		authSessionStore: createInMemoryAuthSessionStore(),
		/* Without a database there is nowhere to persist users, so no user is
		   ever registered and this resolver has nothing to look a subject up in.
		   Scaffold with a database to persist users and resolve them here. */
		getUser: () => null,
		providersConfiguration: {
${providerConfigs}
		}
	});
`;
	}

	return `import { getEnv } from '@absolutejs/absolute';
import {
	createInMemoryAuthSessionStore,
	defineAuthConfig,
	extractPropFromIdentity,
	instantiateUserSession
} from '@absolutejs/auth';
import { DatabaseType, User } from '../../types/databaseTypes';
import { createUser, getUser } from '../handlers/userHandlers';

export const absoluteAuthConfig = (db: DatabaseType) =>
	defineAuthConfig<User>({
	authSessionStore: createInMemoryAuthSessionStore(),
	getUser: async (sub) => (await getUser(db, sub)) ?? null,
	providersConfiguration: {
${providerConfigs}
	},
	/* \`providerConfiguration\` is handed to the callback rather than looked up by
	   name, so identity extraction also works for custom providers. */
	onCallbackSuccess: async ({
		authProvider,
		providerConfiguration,
		providerInstance,
		tokenResponse,
		unregisteredSession,
		cookie: { user_session_id },
		status,
		session
	}) =>
		instantiateUserSession({
			authProvider,
			providerConfiguration,
			providerInstance,
			session,
			tokenResponse,
			unregisteredSession,
			user_session_id,
			getUser: async (userIdentity) => {
				const provider = authProvider.toUpperCase();

				const subject = extractPropFromIdentity(
					userIdentity,
					providerConfiguration.subject,
					providerConfiguration.subjectType
				);
				const authSub = \`\${provider}|\${subject}\`;

				try {
					const user = await getUser(db, authSub);

					return user;
				} catch (error) {
					console.error('Error fetching user:', error);
					return status(
						'Internal Server Error',
						'Could not fetch user data.'
					);
				}
			},
			onNewUser: async (userIdentity) => {
				const provider = authProvider.toUpperCase();

				const subject = extractPropFromIdentity(
					userIdentity,
					providerConfiguration.subject,
					providerConfiguration.subjectType
				);
				const authSub = \`\${provider}|\${subject}\`;

				try {
					const newUser = await createUser(db, {
						auth_sub: authSub,
						metadata: userIdentity
					});
					return newUser;
				} catch (error) {
					console.error('Error creating user:', error);
					return status(
						'Internal Server Error',
						'Could not create new user.'
					);
				}
			}
		})
});
`;
};
