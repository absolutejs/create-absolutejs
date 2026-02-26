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

const cockroachdbCountHistory = `CREATE SEQUENCE IF NOT EXISTS count_history_uid_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS count_history (
  uid         BIGINT PRIMARY KEY DEFAULT nextval('count_history_uid_seq'),
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

const gelUsers = `create type users {
  create required property auth_sub: str {
    create constraint exclusive;
  };

  create required property created_at: datetime {
    set default := datetime_current();
  };

  create required property metadata: json {
    set default := to_json('{}');
  };
};`;

const gelCountHistory = `create scalar type CountHistoryUid extending sequence;
create type count_history {
  create required property uid: CountHistoryUid {
    create constraint exclusive;
    set default := sequence_next(introspect CountHistoryUid);
  };

  create required property count: int16;

  create required property created_at: datetime {
    set default := datetime_current();
  };
};`;

export const countHistoryTables = {
	cockroachdb: cockroachdbCountHistory,
	gel: gelCountHistory,
	mariadb: mariadbCountHistory,
	mssql: mssqlCountHistory,
	mysql: mysqlCountHistory,
	postgresql: postgresqlCountHistory,
	singlestore: singlestoreCountHistory
} as const;
export const initTemplates = {
	cockroachdb: {
		cli: 'sleep 1; cockroach sql --insecure --host localhost --database=database -e',
		wait: 'until (cockroach sql --insecure -e "select 1" >/dev/null 2>&1) ; do sleep 1; done'
	},
	gel: {
		cli: 'gel query -H localhost -P 5656 -u admin --tls-security insecure -b main ',
		wait: 'until gel query -H localhost -P 5656 -u admin --tls-security insecure "select 1"; do sleep 1; done'
	},
	mariadb: {
		cli: 'MYSQL_PWD=userpassword mariadb -h127.0.0.1 -u user database -e',
		wait: 'until mariadb-admin ping -h127.0.0.1 --silent; do sleep 1; done'
	},
	mongodb: {
		cli: 'mongosh -u user -p password --authenticationDatabase admin database --eval',
		wait: 'for i in $(seq 1 60); do mongosh -u user -p password --authenticationDatabase admin --eval "db.adminCommand(\\"ping\\")" --quiet 2>/dev/null && exit 0; sleep 1; done; exit 1'
	},
	mssql: {
		cli: '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1 -Q',
		wait: 'until /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1 -Q "SELECT 1" >/dev/null 2>&1; do sleep 1; done'
	},
	mysql: {
		cli: 'MYSQL_PWD=userpassword mysql -h127.0.0.1 -u user database -e',
		wait: 'until mysqladmin ping -h127.0.0.1 --silent; do sleep 1; done'
	},
	postgresql: {
		cli: 'psql -U user -d database -c',
		wait: 'until pg_isready -U user -h localhost --quiet; do sleep 1; done'
	},
	singlestore: {
		cli: 'singlestore -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS \\`database\\`" > /dev/null && singlestore -u root -ppassword -D database -e',
		wait: 'until singlestore -u root -ppassword -e "SELECT 1" >/dev/null 2>&1; do sleep 1; done'
	}
} as const;
export const userTables = {
	cockroachdb: cockroachdbUsers,
	gel: gelUsers,
	mariadb: mariadbUsers,
	mssql: mssqlUsers,
	mysql: mysqlUsers,
	postgresql: postgresqlUsers,
	singlestore: singlestoreUsers
} as const;
