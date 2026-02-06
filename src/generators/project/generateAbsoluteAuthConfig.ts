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
import { AbsoluteAuthProps } from '@absolutejs/auth';

export const absoluteAuthConfig = (): AbsoluteAuthProps => ({
	providersConfiguration: {
${providerConfigs}
	}
});
`;
	}

	return `import { getEnv } from '@absolutejs/absolute';
import {
	AbsoluteAuthProps,
	extractPropFromIdentity,
	instantiateUserSession,
	providers
} from '@absolutejs/auth';
import { DatabaseType, User } from '../../types/databaseTypes';
import { createUser, getUser } from '../handlers/userHandlers';

export const absoluteAuthConfig = (
	db: DatabaseType
): AbsoluteAuthProps<User> => ({
	providersConfiguration: {
${providerConfigs}
	},
	onCallbackSuccess: async ({
		authProvider,
		providerInstance,
		tokenResponse,
		unregisteredSession,
		cookie: { user_session_id },
		status,
		session
	}) =>
		instantiateUserSession({
			authProvider,
			providerInstance,
			session,
			tokenResponse,
			unregisteredSession,
			user_session_id,
			getUser: async (userIdentity) => {
				const provider = authProvider.toUpperCase();
				const providerConfiguration = providers[authProvider];

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
				const providerConfiguration = providers[authProvider];

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
