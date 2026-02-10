import { DatabaseEngine } from '../../types';

interface DatabaseTemplate {
	command?: string;
	containerPort: number;
	env: Record<string, string>;
	healthcheck: {
		startPeriod: string;
		test: string;
	};
	image: string;
	volumePath: string;
}

const templates: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	DatabaseTemplate
> = {
	cockroachdb: {
		command: 'start-single-node --insecure',
		containerPort: 26257,
		env: {
			COCKROACH_DATABASE: 'database'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'cockroach sql --insecure -e "select 1" >/dev/null 2>&1'
		},
		image: 'cockroachdb/cockroach:latest-v25.3',
		volumePath: '/cockroach/cockroach-data'
	},
	gel: {
		containerPort: 5656,
		env: {
			GEL_SERVER_SECURITY: 'insecure_dev_mode'
		},
		healthcheck: {
			startPeriod: '30s',
			test: 'gel query -H localhost -P 5656 -u admin --tls-security insecure "select 1" >/dev/null 2>&1'
		},
		image: 'geldata/gel:latest',
		volumePath: '/var/lib/gel/data'
	},
	mariadb: {
		containerPort: 3306,
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_PASSWORD: 'userpassword',
			MYSQL_ROOT_PASSWORD: 'rootpassword',
			MYSQL_USER: 'user'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mariadb-admin ping -h127.0.0.1 --silent'
		},
		image: 'mariadb:11.4',
		volumePath: '/var/lib/mysql'
	},
	mongodb: {
		containerPort: 27017,
		env: {
			MONGO_INITDB_DATABASE: 'database',
			MONGO_INITDB_ROOT_PASSWORD: 'password',
			MONGO_INITDB_ROOT_USERNAME: 'user'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mongosh -u user -p password --authenticationDatabase admin --eval "db.adminCommand(\'ping\')" --quiet'
		},
		image: 'mongo:7.0',
		volumePath: '/data/db'
	},
	mssql: {
		containerPort: 1433,
		env: {
			ACCEPT_EULA: 'Y',
			MSSQL_SA_PASSWORD: 'SApassword1'
		},
		healthcheck: {
			startPeriod: '30s',
			test: '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1 -Q "SELECT 1" >/dev/null 2>&1'
		},
		image: 'mcr.microsoft.com/mssql/server:2022-latest',
		volumePath: '/var/opt/mssql'
	},
	mysql: {
		containerPort: 3306,
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_PASSWORD: 'userpassword',
			MYSQL_ROOT_PASSWORD: 'rootpassword',
			MYSQL_USER: 'user'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mysqladmin ping -h127.0.0.1 --silent'
		},
		image: 'mysql:8.0',
		volumePath: '/var/lib/mysql'
	},
	postgresql: {
		containerPort: 5432,
		env: {
			POSTGRES_DB: 'database',
			POSTGRES_PASSWORD: 'password',
			POSTGRES_USER: 'user'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'pg_isready -U user -h localhost --quiet'
		},
		image: 'postgres:15',
		volumePath: '/var/lib/postgresql/data'
	},
	singlestore: {
		containerPort: 3306,
		env: {
			ROOT_PASSWORD: 'password'
		},
		healthcheck: {
			startPeriod: '30s',
			test: 'singlestore -u root -ppassword -e "SELECT 1" >/dev/null 2>&1'
		},
		image: 'ghcr.io/singlestore-labs/singlestoredb-dev', // NOTE: No tag specified due to data persistence
		volumePath: '/data'
	}
};

export const generateDockerContainer = (
	databaseEngine: DatabaseEngine,
	hostPort: number
) => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: Expected a valid local database engine'
		);
	}

	const { command, containerPort, env, healthcheck, image, volumePath } =
		templates[databaseEngine];
	const commandLine = command ? `\n        command: ${command}` : '';
	const envLines = Object.entries(env)
		.map(([key, value]) => `            ${key}: ${value}`)
		.join('\n');
	const portMapping = `${hostPort}:${containerPort}`;

	return `services:
    db:
        image: ${image}
        restart: always
        environment:
${envLines}
        ports:
            - "${portMapping}"${commandLine}
        healthcheck:
            test: ["CMD-SHELL", "${healthcheck.test.replaceAll('"', '\\"')}"]
            interval: 2s
            timeout: 5s
            retries: 30
            start_period: ${healthcheck.startPeriod}
        volumes:
            - db_data:${volumePath}

volumes:
    db_data:
`;
};
