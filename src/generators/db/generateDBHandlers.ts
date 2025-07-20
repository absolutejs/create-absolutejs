export const generateDBHandlers = (usesAuth: boolean) =>
	usesAuth
		? `import { isValidProviderOption, providers } from 'citra';
import { eq } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { schema, type SchemaType } from '../../../db/schema';

type UserHandlerProps = {
  authProvider: string;
  userIdentity: Record<string, unknown>;
  db: NeonHttpDatabase<SchemaType>;
};

export const getUser = async ({
  userIdentity,
  authProvider,
  db
}: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) {
    throw new Error(\`Invalid auth provider: \${authProvider}\`);
  }

  const providerConfig = providers[authProvider];
  const subject = providerConfig.extractSubjectFromIdentity(userIdentity);
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.auth_sub, authSub))
    .execute();

  return user;
};

export const createUser = async ({
  userIdentity,
  authProvider,
  db
}: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) {
    throw new Error(\`Invalid auth provider: \${authProvider}\`);
  }

  const providerConfig = providers[authProvider];
  const subject = providerConfig.extractSubjectFromIdentity(userIdentity);
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`;

  const [newUser] = await db
    .insert(schema.users)
    .values({
      auth_sub: authSub,
      metadata: userIdentity
    })
    .returning();

  if (!newUser) throw new Error('Failed to create user');

  return newUser;
};`
		: `import { eq } from 'drizzle-orm';
import { DatabaseType, NewCountHistory, schema } from '../../../db/schema';

export const getCountHistory = async (db: DatabaseType, uid: number) => {
  const [history] = await db
    .select()
    .from(schema.countHistory)
    .where(eq(schema.countHistory.uid, uid));

  return history;
};

export const createCountHistory = async ({
  count,
  db
}: NewCountHistory & { db: DatabaseType }) => {
  const [newHistory] = await db
    .insert(schema.countHistory)
    .values({ count })
    .returning();

  return newHistory;
};`;
