import { User, schema } from '../../db/schema';
import { ReactExample } from '../frontend/pages/ReactExample';
import { createUser, getUser } from './handlers/userHandlers';
import {
	asset,
	build,
	getEnv,
	handleReactPageRequest,
	networking
} from '@absolutejs/absolute';
import { absoluteAuth, instantiateUserSession } from '@absolutejs/auth';
import { staticPlugin } from '@elysiajs/static';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Elysia } from 'elysia';

const manifest = await build({
	assetsDirectory: 'src/backend/assets',
	buildDirectory: 'build',
	reactDirectory: 'src/frontend',
	tailwind: {
		input: './src/frontend/styles/tailwind.css',
		output: '/assets/css/tailwind.generated.css'
	}
});

const pool = new Pool({ connectionString: getEnv('DATABASE_URL') });
const db = drizzle(pool, { schema });

new Elysia()
	.use(networking)
	.use(
		absoluteAuth<User>({
			providersConfiguration: {},
			onCallbackSuccess: async ({
				authProvider,
				providerInstance,
				tokenResponse,
				userSessionId,
				session
			}) =>
				instantiateUserSession({
					authProvider,
					providerInstance,
					session,
					tokenResponse,
					userSessionId,
					createUser: (userIdentity) =>
						createUser({ authProvider, db, userIdentity }),
					getUser: (userIdentity) =>
						getUser({ authProvider, db, userIdentity })
				})
		})
	)
	.use(staticPlugin({ assets: './build', prefix: '' }))
	.get('/', () =>
		handleReactPageRequest(
			ReactExample,
			asset(manifest, 'ReactExampleIndex'),
			{ initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
		)
	)
	.get('/react', () =>
		handleReactPageRequest(
			ReactExample,
			asset(manifest, 'ReactExampleIndex'),
			{ initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
		)
	)
	.on('error', (err) => {
		const { request } = err;
		console.error(
			`Server error on ${request.method} ${request.url}: ${err.message}`
		);
	});
