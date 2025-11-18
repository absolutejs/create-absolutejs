import { writeFileSync } from 'fs';
import { join } from 'path';
import type { DatabaseHost } from '../../types';

type GeneratePrismaClientProps = {
    databaseHost: DatabaseHost;
    databaseDirectory: string;
    projectName: string;
};

const buildClientModule = (databaseHost: DatabaseHost) => {
	const usesAccelerate =
		databaseHost === 'neon' || databaseHost === 'planetscale';
	const clientImport = usesAccelerate
		? `import { PrismaClient } from '@prisma/client/edge'`
		: `import { PrismaClient } from '@prisma/client'`;
	const accelerateImport = usesAccelerate
		? `import { withAccelerate } from '@prisma/extension-accelerate'\n`
		: '';

	const instantiate = usesAccelerate
		? `const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL }
    }
  }).$extends(withAccelerate())`
		: `const prisma = globalForPrisma.prisma ?? new PrismaClient()`;

	return `${clientImport}
${accelerateImport}const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

${instantiate}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export const prismaClient = prisma
export default prismaClient
`;
};

export const generatePrismaClient = ({
    databaseHost,
    databaseDirectory,
    projectName
}: GeneratePrismaClientProps) => {
	const contents = buildClientModule(databaseHost);
	writeFileSync(
		join(projectName, databaseDirectory, 'client.ts'),
		contents,
		'utf-8'
	);
};
