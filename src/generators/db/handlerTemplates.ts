type QueryOperations = {
	selectUser: string;
	insertUser: string;
	selectHistory: string;
	insertHistory: string;
};

type AuthTemplateOptions = {
	importLines: string;
	dbType: string;
	queries: QueryOperations;
};

const buildSqlAuthTemplate = ({
	importLines,
	dbType,
	queries
}: AuthTemplateOptions) => `
import { isValidProviderOption, providers } from 'citra'
${importLines}

type UserHandlerProps = {
    authProvider: string
    db: ${dbType}
    userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
    if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
    const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
    const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
    ${queries.selectUser}
}

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
    if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
    const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
    const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
    ${queries.insertUser}
}
`;

type CountTemplateOptions = {
	importLines: string;
	dbType: string;
	queries: QueryOperations;
};

const buildSqlCountTemplate = ({
	importLines,
	dbType,
	queries
}: CountTemplateOptions) => `
${importLines}

export const getCountHistory = async (db: ${dbType}, uid: number) => {
    ${queries.selectHistory}
}

export const createCountHistory = async (db: ${dbType}, count: number) => {
    ${queries.insertHistory}
}
`;

const drizzleQueryOperations: QueryOperations = {
	insertHistory: `const [newHistory] = await db.insert(schema.countHistory).values({ count }).returning()
  return newHistory`,
	insertUser: `const [newUser] = await db.insert(schema.users).values({ auth_sub: authSub, metadata: userIdentity }).returning()
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const [history] = await db.select().from(schema.countHistory).where(eq(schema.countHistory.uid, uid)).execute()
  return history`,
	selectUser: `const [user] = await db.select().from(schema.users).where(eq(schema.users.auth_sub, authSub)).execute()
  return user`
};

const libsqlQueryOperations: QueryOperations = {
	insertHistory: `const { rows } = await db.execute({ sql: 'INSERT INTO count_history (count) VALUES (?) RETURNING *', args: [count] })
  return rows[0]`,
	insertUser: `const { rows } = await db.execute({ sql: 'INSERT INTO users (auth_sub, metadata) VALUES (?, ?) RETURNING *', args: [authSub, JSON.stringify(userIdentity)] })
  const newUser = rows[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const { rows } = await db.execute({ sql: 'SELECT * FROM count_history WHERE uid = ? LIMIT 1', args: [uid] })
  return rows[0] ?? null`,
	selectUser: `const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE auth_sub = ? LIMIT 1', args: [authSub] })
  return rows[0] ?? null`
};

const bunSqliteQueryOperations: QueryOperations = {
	insertHistory: `db.run('INSERT INTO count_history (count) VALUES (?)', [count])
  const statement = db.query('SELECT * FROM count_history ORDER BY rowid DESC LIMIT 1')
  const [newHistory] = statement.all()
  return newHistory`,
	insertUser: `db.run('INSERT INTO users (auth_sub, metadata) VALUES (?, ?)', [authSub, JSON.stringify(userIdentity)])
  const statement = db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1')
  const [newUser] = statement.all(authSub)
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const statement = db.query('SELECT * FROM count_history WHERE uid = ? LIMIT 1')
  const [history] = statement.all(uid)
  return history ?? null`,
	selectUser: `const statement = db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1')
  const [user] = statement.all(authSub)
  return user ?? null`
};

const postgresSqlQueryOperations: QueryOperations = {
	insertHistory: `const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory`,
	insertUser: `const [newUser] = await db\`
    INSERT INTO users (auth_sub, metadata)
    VALUES (\${authSub}, \${userIdentity})
    RETURNING *
  \`
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const [history] = await db\`
    SELECT * FROM count_history
    WHERE uid = \${uid}
    LIMIT 1
  \`
  return history ?? null`,
	selectUser: `const [user] = await db\`
    SELECT * FROM users
    WHERE auth_sub = \${authSub}
    LIMIT 1
  \`
  return user ?? null`
};

const driverConfigurations = {
	'postgresql:drizzle:local': {
		dbType: 'BunSQLDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'postgresql:drizzle:neon': {
		dbType: 'NeonHttpDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'postgresql:sql:local': {
		dbType: 'SQL',
		importLines: `import { SQL } from 'bun'`,
		queries: postgresSqlQueryOperations
	},
	'postgresql:sql:neon': {
		dbType: 'NeonQueryFunction<false, false>',
		importLines: `import { NeonQueryFunction } from '@neondatabase/serverless'`,
		queries: postgresSqlQueryOperations
	},
	'sqlite:drizzle:local': {
		dbType: 'BunSQLiteDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'sqlite:drizzle:turso': {
		dbType: 'LibSQLDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'sqlite:sql:local': {
		dbType: 'Database',
		importLines: `import { Database } from 'bun:sqlite'`,
		queries: bunSqliteQueryOperations
	},
	'sqlite:sql:turso': {
		dbType: 'Client',
		importLines: `import { Client } from '@libsql/client'`,
		queries: libsqlQueryOperations
	}
} as const;

type DriverConfigurationKey = keyof typeof driverConfigurations;

export const getAuthTemplate = (key: DriverConfigurationKey) => {
	const configuration = driverConfigurations[key];
	if (!configuration)
		throw new Error(`Unsupported driver configuration: ${key}`);

	return buildSqlAuthTemplate(configuration);
};

export const getCountTemplate = (key: DriverConfigurationKey) => {
	const configuration = driverConfigurations[key];
	if (!configuration)
		throw new Error(`Unsupported driver configuration: ${key}`);

	return buildSqlCountTemplate(configuration);
};
