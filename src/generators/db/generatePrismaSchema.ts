import { AuthProvider, AvailablePrismaDialect, DatabaseHost } from "../../types";

const DIALECTS = { 
    cockroachdb: {
        provider: 'cockroachdb',
        autoIncrement: '@default(sequence())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    mariadb: {
        provider: 'mysql',
        autoIncrement: '@default(autoincrement())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    mongodb: {
        provider: 'mongodb',
        autoIncrement: '@default(auto()) @map("_id") @db.ObjectId',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    mssql: {  // ← ADD THIS
        provider: 'sqlserver',
        autoIncrement: '@default(autoincrement())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    mysql: {
        provider: 'mysql',
        autoIncrement: '@default(autoincrement())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    postgresql: {
        provider: 'postgresql',
        autoIncrement: '@default(autoincrement())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
    sqlite: {
        provider: 'sqlite',
        autoIncrement: '@default(autoincrement())',
        stringType: 'String',
        jsonType: 'Json',
        intType: 'Int',
        dateTimeType: 'DateTime'
    },
} as const;

type GeneratePrismaSchemaProps = {
    databaseEngine: AvailablePrismaDialect;
    databaseHost: DatabaseHost;
    authProvider: AuthProvider;
};

const getDatabaseUrl = (databaseEngine: AvailablePrismaDialect, databaseHost: DatabaseHost): string => {
    if (databaseHost === 'neon') {
        return 'env("DATABASE_URL")';
    }
    if (databaseHost === 'planetscale') {
        return 'env("DATABASE_URL")';
    }
    if (databaseHost === 'turso') {
        return 'env("DATABASE_URL")';
    }
    switch (databaseEngine) {
        case 'postgresql':
            return '"postgresql://user:password@localhost:5432/database"';
        case 'mysql':
        case 'mariadb':
            return '"mysql://user:userpassword@localhost:3306/database"';
        case 'sqlite':
            return '"file:./database.sqlite"';
        case 'cockroachdb':
            return '"postgresql://root@localhost:26257/database?sslmode=disable"';
        case 'mssql':
            return '"sqlserver://localhost:1433;database=database;user=sa;password=Strong_Passw0rd;encrypt=true;trustServerCertificate=true"';
        case 'mongodb':
            return '"mongodb://user:password@localhost:27017/database"';
        default:
            return 'env("DATABASE_URL")';
    }
};

export const generatePrismaSchema = ({
    databaseEngine,
    databaseHost,
    authProvider
}: GeneratePrismaSchemaProps): string => {
    const cfg = DIALECTS[databaseEngine];
    const databaseUrl = getDatabaseUrl(databaseEngine, databaseHost);
    
    const generatorBlock = `generator client {
  provider = "prisma-client-js"
}
`;
    
    const datasourceBlock = `datasource db {
  provider = "${cfg.provider}"
  url      = ${databaseUrl}
}
`;

    const modelBlock = authProvider === 'absoluteAuth' 
        ? `model User {
  auth_sub   ${cfg.stringType} @id @db.VarChar(255)
  created_at ${cfg.dateTimeType} @default(now())
  metadata   ${cfg.jsonType}    @default("{}")
  
  @@map("users")
}
`
        : `model CountHistory {
  uid        ${cfg.intType} @id ${cfg.autoIncrement}
  count      ${cfg.intType}
  created_at ${cfg.dateTimeType} @default(now())
  
  @@map("count_history")
}
`;
    
    return `${generatorBlock}\n${datasourceBlock}\n${modelBlock}`;
};
