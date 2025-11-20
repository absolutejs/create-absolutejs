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

const postgresNeonQueryOperations: QueryOperations = {
	insertHistory: `const { rows } = await db.query(
    'INSERT INTO count_history (count) VALUES ($1) RETURNING *',
    [count]
  )
  return rows[0]`,
	insertUser: `const { rows } = await db.query(
    'INSERT INTO users (auth_sub, metadata) VALUES ($1, $2) RETURNING *',
    [authSub, userIdentity]
  )
  const newUser = rows[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const { rows } = await db.query(
    'SELECT * FROM count_history WHERE uid = $1 LIMIT 1',
    [uid]
  )
  return rows[0] ?? null`,
	selectUser: `const { rows } = await db.query(
    'SELECT * FROM users WHERE auth_sub = $1 LIMIT 1',
    [authSub]
  )
  return rows[0] ?? null`
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

const mongodbQueryOperations: QueryOperations = {
	insertHistory: `const { insertedId } = await db.collection('count_history').insertOne({ count })
  const newHistory = await db.collection('count_history').findOne({ _id: insertedId })
  return newHistory`,
	insertUser: `const { insertedId } = await db.collection('users').insertOne({ auth_sub: authSub, metadata: userIdentity })
  const newUser = await db.collection('users').findOne({ _id: insertedId })
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const history = await db.collection('count_history').findOne({ uid })
  return history ?? null`,
	selectUser: `const user = await db.collection('users').findOne({ auth_sub: authSub })
  return user ?? null`
};

const gelSqlQueryOperations: QueryOperations = {
	insertHistory: `await db.query('INSERT INTO count_history (count) VALUES (?)', [count])
  const [rows] = await db.query('SELECT * FROM count_history ORDER BY uid DESC LIMIT 1')
  return rows[0]`,
	insertUser: `await db.query('INSERT INTO users (auth_sub, metadata) VALUES (?, ?)', [authSub, JSON.stringify(userIdentity)])
  const [rows] = await db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1', [authSub])
  const newUser = rows[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const [rows] = await db.query('SELECT * FROM count_history WHERE uid = ? LIMIT 1', [uid])
  return rows[0] ?? null`,
	selectUser: `const [rows] = await db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1', [authSub])
  return rows[0] ?? null`
};

const singlestoreSqlQueryOperations: QueryOperations = {
	insertHistory: `await db.query('INSERT INTO count_history (count) VALUES (?)', [count])
  const [rows] = await db.query('SELECT * FROM count_history ORDER BY uid DESC LIMIT 1')
  return rows[0]`,
	insertUser: `await db.query('INSERT INTO users (auth_sub, metadata) VALUES (?, ?)', [authSub, JSON.stringify(userIdentity)])
  const [rows] = await db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1', [authSub])
  const newUser = rows[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const [rows] = await db.query('SELECT * FROM count_history WHERE uid = ? LIMIT 1', [uid])
  return rows[0] ?? null`,
	selectUser: `const [rows] = await db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1', [authSub])
  return rows[0] ?? null`
};

const mssqlSqlQueryOperations: QueryOperations = {
	insertHistory: `await db.request().input('count', count).query('INSERT INTO count_history (count) VALUES (@count)')
  const result = await db.request().query('SELECT TOP 1 * FROM count_history ORDER BY uid DESC')
  return result.recordset[0]`,
	insertUser: `await db.request().input('authSub', authSub).input('metadata', JSON.stringify(userIdentity)).query('INSERT INTO users (auth_sub, metadata) VALUES (@authSub, @metadata)')
  const result = await db.request().input('authSub', authSub).query('SELECT TOP 1 * FROM users WHERE auth_sub = @authSub')
  const newUser = result.recordset[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser`,
	selectHistory: `const result = await db.request().input('uid', uid).query('SELECT TOP 1 * FROM count_history WHERE uid = @uid')
  return result.recordset[0] ?? null`,
	selectUser: `const result = await db.request().input('authSub', authSub).query('SELECT TOP 1 * FROM users WHERE auth_sub = @authSub')
  return result.recordset[0] ?? null`
};

const mysqlSqlQueryOperations: QueryOperations = {
	insertHistory: `
    const result = await db\`
      INSERT INTO count_history (count)
      VALUES (\${count})
    \`;

    const insertId = result.lastInsertRowid;

    const [row] = await db\`
      SELECT *
      FROM count_history
      WHERE uid = \${insertId}
      LIMIT 1
    \`;

    if (!row) throw new Error("Could not retrieve the newly-inserted history");
    return row;
  `,

	insertUser: `
    const result = await db\`
      INSERT INTO users (auth_sub, metadata)
      VALUES (\${authSub}, \${JSON.stringify(userIdentity)})
    \`;

    const insertId = result.lastInsertRowid;

    const [row] = await db\`
      SELECT *
      FROM users
      WHERE uid = \${insertId}
      LIMIT 1
    \`;

    if (!row) throw new Error("Failed to create user");
    return row;
  `,

	selectHistory: `
    const [row] = await db\`
      SELECT *
      FROM count_history
      WHERE uid = \${uid}
      LIMIT 1
    \`;

    return row ?? null;
  `,

	selectUser: `
    const [row] = await db\`
      SELECT *
      FROM users
      WHERE auth_sub = \${authSub}
      LIMIT 1
    \`;

    return row ?? null;
  `
};

const mysqlDrizzleQueryOperations: QueryOperations = {
	insertHistory: `const [row] = await db
    .insert(schema.countHistory)
    .values({ count })
    .$returningId();

  if (!row) throw new Error('insert failed: no uid returned');
  const { uid } = row;

  const [newHistory] = await db
    .select()
    .from(schema.countHistory)
    .where(eq(schema.countHistory.uid, uid));

  return newHistory;`,

	insertUser: `const [row] = await db
    .insert(schema.users)
    .values({ auth_sub: authSub, metadata: userIdentity })
    .$returningId();

  if (!row) throw new Error('insert failed: no uid returned');
  const { uid } = row;

  const [newUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.uid, uid));

  if (!newUser) throw new Error('Failed to create user');
  return newUser;`,

	selectHistory: drizzleQueryOperations.selectHistory,
	selectUser: drizzleQueryOperations.selectUser
};

const driverConfigurations = {
	'cockroachdb:sql:local': {
		dbType: 'SQL',
		importLines: `import { SQL } from 'bun'`,
		queries: postgresSqlQueryOperations
	},
	'gel:sql:local': {
		dbType: 'GelClient',
		importLines: `import { GelClient } from 'gel'`,
		queries: gelSqlQueryOperations
	},
	'mariadb:sql:local': {
		dbType: 'SQL',
		importLines: `import { SQL } from 'bun'`,
		queries: mysqlSqlQueryOperations
	},
  'mariadb:drizzle:local': {
    dbType: 'MySql2Database<SchemaType>',
    importLines: `
import { eq } from 'drizzle-orm'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { schema, type SchemaType } from '../../../db/schema'`,
    queries: mysqlDrizzleQueryOperations
  },
	'mongodb:native:local': {
		dbType: 'Db',
		importLines: `import { Db } from 'mongodb'`,
		queries: mongodbQueryOperations
	},
	'mssql:sql:local': {
		dbType: 'ConnectionPool',
		importLines: `import { ConnectionPool } from 'mssql'`,
		queries: mssqlSqlQueryOperations
	},
	'mysql:drizzle:local': {
		dbType: 'MySql2Database<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: mysqlDrizzleQueryOperations
	},
	'mysql:sql:local': {
		dbType: 'SQL',
		importLines: `import { SQL } from 'bun'`,
		queries: mysqlSqlQueryOperations
	},
	'postgresql:drizzle:local': {
		dbType: 'BunSQLDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'postgresql:drizzle:neon': {
		dbType: 'NeonDatabase<SchemaType>',
		importLines: `
import { eq } from 'drizzle-orm'
import { NeonDatabase } from 'drizzle-orm/neon-serverless'
import { schema, type SchemaType } from '../../../db/schema'`,
		queries: drizzleQueryOperations
	},
	'postgresql:sql:local': {
		dbType: 'SQL',
		importLines: `import { SQL } from 'bun'`,
		queries: postgresSqlQueryOperations
	},
	'postgresql:sql:neon': {
		dbType: 'Pool',
		importLines: `import { Pool } from '@neondatabase/serverless'`,
		queries: postgresNeonQueryOperations
	},
	'singlestore:sql:local': {
		dbType: 'Connection',
		importLines: `import { Connection } from '@singlestore/db-client'`,
		queries: singlestoreSqlQueryOperations
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
