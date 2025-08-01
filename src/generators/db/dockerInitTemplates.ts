const postgresqlUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata   JSONB        DEFAULT '{}'::jsonb
);`;

const postgresqlCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INTEGER   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  count       INTEGER   NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);`;

const mysqlUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata   JSON         DEFAULT (JSON_OBJECT())
);`;

const mysqlCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INT AUTO_INCREMENT PRIMARY KEY,
  count       INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

const mariadbUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata   JSON         DEFAULT ('{}')
);`;

const mariadbCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INT AUTO_INCREMENT PRIMARY KEY,
  count       INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

const singlestoreUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata   JSON         DEFAULT ('{}')
);`;

const singlestoreCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INT AUTO_INCREMENT PRIMARY KEY,
  count       INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

const cockroachdbUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata   JSONB        DEFAULT '{}'::jsonb
);`;

const cockroachdbCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INT PRIMARY KEY DEFAULT unique_rowid(),
  count       INT      NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);`;

const mssqlUsers = `IF OBJECT_ID('users','U') IS NULL
BEGIN
  CREATE TABLE users (
    auth_sub   NVARCHAR(255) PRIMARY KEY,
    created_at DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    metadata   NVARCHAR(MAX) NULL
  );
END;`;

const mssqlCountHistory = `IF OBJECT_ID('count_history','U') IS NULL
BEGIN
  CREATE TABLE count_history (
    uid         INT IDENTITY(1,1) PRIMARY KEY,
    count       INT        NOT NULL,
    created_at  DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;`;

const gelUsers = `CREATE TABLE IF NOT EXISTS users (
  auth_sub   VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata   JSON        DEFAULT '{}'::json
);`;

const gelCountHistory = `CREATE TABLE IF NOT EXISTS count_history (
  uid         INTEGER   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  count       INTEGER   NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);`;

export const userTables = {
	cockroachdb: cockroachdbUsers,
	gel: gelUsers,
	mariadb: mariadbUsers,
	mssql: mssqlUsers,
	mysql: mysqlUsers,
	postgresql: postgresqlUsers,
	singlestore: singlestoreUsers
} as const;

export const countHistoryTables = {
	cockroachdb: cockroachdbCountHistory,
	gel: gelCountHistory,
	mariadb: mariadbCountHistory,
	mssql: mssqlCountHistory,
	mysql: mysqlCountHistory,
	postgresql: postgresqlCountHistory,
	singlestore: singlestoreCountHistory
} as const;
