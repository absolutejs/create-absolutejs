import { isValidProviderOption, providers } from 'citra';

import { eq } from 'drizzle-orm';
import { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { schema, type SchemaType } from '../../../db/schema';

type UserHandlerProps = {
	authProvider: string;
	db: NeonDatabase<SchemaType>;
	userIdentity: Record<string, unknown>;
};

export const getUser = async ({
	authProvider,
	db,
	userIdentity
}: UserHandlerProps) => {
	if (!isValidProviderOption(authProvider))
		throw new Error(`Invalid auth provider: ${authProvider}`);
	const subject =
		providers[authProvider].extractSubjectFromIdentity(userIdentity);
	const authSub = `${authProvider.toUpperCase()}|${subject}`;
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.auth_sub, authSub))
		.execute();
	return user;
};

export const createUser = async ({
	authProvider,
	db,
	userIdentity
}: UserHandlerProps) => {
	if (!isValidProviderOption(authProvider))
		throw new Error(`Invalid auth provider: ${authProvider}`);
	const subject =
		providers[authProvider].extractSubjectFromIdentity(userIdentity);
	const authSub = `${authProvider.toUpperCase()}|${subject}`;
	const [newUser] = await db
		.insert(schema.users)
		.values({ auth_sub: authSub, metadata: userIdentity })
		.returning();
	if (!newUser) throw new Error('Failed to create user');
	return newUser;
};
