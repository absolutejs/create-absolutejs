import type {
	AuthProvider,
	AvailablePrismaDialect,
	DatabaseHost
} from '../../types';

type DialectConfig = {
	provider: string;
	countHistoryId: string;
};

const DIALECTS: Record<AvailablePrismaDialect, DialectConfig> = {
	cockroachdb: {
		countHistoryId: 'Int @id @default(sequence())', provider: 'cockroachdb'
	},
	mariadb: {
		countHistoryId: 'Int @id @default(autoincrement())', provider: 'mysql'
	},
	mssql: {
		countHistoryId: 'Int @id @default(autoincrement())', provider: 'sqlserver'
	},
	mysql: {
		countHistoryId: 'Int @id @default(autoincrement())', provider: 'mysql'
	},
	postgresql: {
		countHistoryId: 'Int @id @default(autoincrement())', provider: 'postgresql'
	},
	sqlite: {
		countHistoryId: 'Int @id @default(autoincrement())', provider: 'sqlite'
	}
};

type GeneratePrismaSchemaProps = {
	databaseEngine: AvailablePrismaDialect;
	databaseHost: DatabaseHost;
	authProvider: AuthProvider;
};

const buildGeneratorBlock = (databaseHost: DatabaseHost) => {
	const needsDriverAdapters =
		databaseHost === 'neon' || databaseHost === 'planetscale';
	const previewFeatures = needsDriverAdapters
		? '\n  previewFeatures = ["driverAdapters"]'
		: '';

	return `generator client {
  provider = "prisma-client-js"${previewFeatures}
}`;
};

const buildDatasourceBlock = (cfg: DialectConfig) => `datasource db {
  provider = "${cfg.provider}"
  url      = env("DATABASE_URL")
}`;

const buildUserModel = () => `model User {
  auth_sub   String @id
  metadata   Json
  created_at DateTime @default(now())

  @@map("users")
}`;

const buildCountHistoryModel = (cfg: DialectConfig) => `model CountHistory {
  uid        ${cfg.countHistoryId}
  count      Int
  created_at DateTime @default(now())

  @@map("count_history")
}`;

export const generatePrismaSchema = ({
	databaseEngine,
	databaseHost,
	authProvider
}: GeneratePrismaSchemaProps) => {
	const cfg = DIALECTS[databaseEngine];
	if (!cfg) {
		throw new Error(
			`Unsupported Prisma dialect "${databaseEngine}" encountered while generating schema.`
		);
	}

	const generatorBlock = buildGeneratorBlock(databaseHost);
	const datasourceBlock = buildDatasourceBlock(cfg);
	const modelBlock =
		authProvider === 'absoluteAuth'
			? buildUserModel(cfg)
			: buildCountHistoryModel(cfg);

	return [generatorBlock, datasourceBlock, modelBlock].join('\n\n');
};
