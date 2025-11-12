import { writeFileSync } from 'fs';
import { join } from 'path';
import type { AvailablePrismaDialect, DatabaseHost } from '../../types';

type GeneratePrismaCleintProps = {
    databaseEngine: AvailablePrismaDialect;
    databaseHost: DatabaseHost;
    databaseDirectory: string;
    projectName: string;
};

const getPrismaClientImport = (databaseHost: DatabaseHost): string => {
    switch (databaseHost) {
        case 'neon':
            return `import { createClient } from '@neondatabase/serverless';`;
        case 'planetscale':
            return `import { createClient } from '@planetscale/database';`;
        case 'turso':
            return `import { createClient } from '@turso/client';`;
        default:
            return `import { PrismaClient } from '@prisma/client';`;
    }
};

export const generatePrismaClient = ({
    databaseEngine,
    databaseHost,
    databaseDirectory,
    projectName
}: GeneratePrismaCleintProps) => {
    const prismaClientImport = getPrismaClientImport(databaseHost);
    const prismaClientContent = `${prismaClientImport}
    const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
`;

    writeFileSync(join(projectName, databaseDirectory, 'prisma-client.ts'), prismaClientContent);
};
