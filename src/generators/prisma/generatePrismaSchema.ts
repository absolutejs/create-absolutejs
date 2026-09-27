import { posix } from 'path';
import type { AuthOption } from '../../types';
import {
	prismaClientDirectory,
	type PrismaProvider,
	type PrismaTarget
} from './prismaTargets';

type GeneratePrismaSchemaProps = {
	authOption: AuthOption;
	databaseDirectory: string;
	target: PrismaTarget;
};

/* Mirrors the Drizzle example tables (count_history, or users with auth) so
   both ORMs scaffold the same database. MongoDB documents are keyed by an
   ObjectId, so the numeric `uid` the API exposes is a unique field there,
   assigned from an atomic counter document. */
/* CockroachDB only autoincrements BigInt; an Int key takes a sequence, so
   the uid stays a JavaScript number like every other engine's. Its maximum is
   pinned to INT4's, which is what CockroachDB gives the identity column —
   otherwise Prisma reports the migrated table as drifted from the schema. */
const countHistoryModel = ({ provider }: PrismaTarget) =>
	provider === 'mongodb'
		? `model CountHistory {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  uid        Int      @unique
  count      Int
  created_at DateTime @default(now())

  @@map("count_history")
}

/// Hands out sequential count_history uids (MongoDB has no autoincrement).
model Counter {
  id    String @id @map("_id")
  value Int

  @@map("counters")
}`
		: `model CountHistory {
  uid        Int      @id @default(${provider === 'cockroachdb' ? 'sequence(maxValue: 2147483647)' : 'autoincrement()'})
  count      Int
  created_at DateTime @default(now())

  @@map("count_history")
}`;

/* The auth subject's column type: bounded like the Drizzle schema's
   varchar(255) wherever the provider has a native type for it. */
const authSubType: Record<PrismaProvider, string> = {
	cockroachdb: ' @db.String(255)',
	mongodb: '',
	mysql: ' @db.VarChar(255)',
	postgresql: ' @db.VarChar(255)',
	sqlite: '',
	sqlserver: ' @db.NVarChar(255)'
};

/* `metadata` has no database default: Prisma renders a Json default as
   invalid SQLite DDL, so the handlers always write it instead. */
const userModel = ({ provider, supportsJson }: PrismaTarget) => {
	const metadataColumn = supportsJson
		? 'metadata   Json'
		: 'metadata   String   @db.NVarChar(Max)';
	const idColumns =
		provider === 'mongodb'
			? `id         String   @id @default(auto()) @map("_id") @db.ObjectId
  auth_sub   String   @unique`
			: `auth_sub   String   @id${authSubType[provider]}`;

	return `model User {
  ${idColumns}
  created_at DateTime @default(now())
  ${metadataColumn}

  @@map("users")
}`;
};

export const generatePrismaSchema = ({
	authOption,
	databaseDirectory,
	target
}: GeneratePrismaSchemaProps) => {
	const output = posix.relative(
		posix.normalize(databaseDirectory),
		prismaClientDirectory
	);
	/* Prisma 7 takes the connection URL from prisma.config.ts; Prisma 6 (the
	   MongoDB line) still reads it from the schema. */
	const url =
		target.line === 'prisma6' ? '\n  url      = env("DATABASE_URL")' : '';
	const model =
		authOption === 'abs' ? userModel(target) : countHistoryModel(target);

	return `generator client {
  provider = "prisma-client"
  output   = "${output}"
}

datasource db {
  provider = "${target.provider}"${url}
}

${model}
`;
};
