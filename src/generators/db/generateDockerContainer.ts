import { DatabaseEngine } from '../../types';

interface DatabaseTemplate {
	command?: string;
	env: Record<string, string>;
	healthcheck: {
		startPeriod: string;
		test: string;
	};
	image: string;
	port: string;
	volumePath: string;
}

const templates: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	DatabaseTemplate
> = {
	cockroachdb: {
		command: 'start-single-node --insecure',
		env: {
			COCKROACH_DATABASE: 'database'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'cockroach sql --insecure -e "select 1" >/dev/null 2>&1'
		},
		image: 'cockroachdb/cockroach:latest-v25.3',
		port: '26257:26257',
		volumePath: '/cockroach/cockroach-data'
	},
	gel: {
		env: {
			GEL_SERVER_SECURITY: 'insecure_dev_mode'
		},
		healthcheck: {
			startPeriod: '30s',
			test: 'gel query -H localhost -P 5656 -u admin --tls-security insecure "select 1" >/dev/null 2>&1'
		},
		image: 'geldata/gel:latest',
		port: '5656:5656',
		volumePath: '/var/lib/gel/data'
	},
	mariadb: {
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_ROOT_PASSWORD: 'rootpassword'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mariadb-admin ping -h127.0.0.1 --silent'
		},
		image: 'mariadb:11.4',
		port: '3306:3306',
		volumePath: '/var/lib/mysql'
	},
	mongodb: {
		env: {
			MONGO_INITDB_DATABASE: 'database',
			MONGO_INITDB_ROOT_PASSWORD: 'rootpassword',
			MONGO_INITDB_ROOT_USERNAME: 'root'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mongosh -u root -p rootpassword --authenticationDatabase admin --eval "db.adminCommand(\'ping\')" --quiet'
		},
		image: 'mongo:7.0',
		port: '27017:27017',
		volumePath: '/data/db'
	},
	mssql: {
		env: {
			ACCEPT_EULA: 'Y',
			MSSQL_SA_PASSWORD: 'SApassword1'
		},
		healthcheck: {
			startPeriod: '30s',
			test: '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1 -Q "SELECT 1" >/dev/null 2>&1'
		},
		image: 'mcr.microsoft.com/mssql/server:2022-latest',
		port: '1433:1433',
		volumePath: '/var/opt/mssql'
	},
	mysql: {
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_ROOT_PASSWORD: 'rootpassword'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'mysqladmin ping -h127.0.0.1 --silent'
		},
		image: 'mysql:8.0',
		port: '3306:3306',
		volumePath: '/var/lib/mysql'
	},
	postgresql: {
		env: {
			POSTGRES_DB: 'database',
			POSTGRES_PASSWORD: 'rootpassword',
			POSTGRES_USER: 'postgres'
		},
		healthcheck: {
			startPeriod: '5s',
			test: 'pg_isready -U postgres -h localhost --quiet'
		},
		image: 'postgres:15',
		port: '5432:5432',
		volumePath: '/var/lib/postgresql/data'
	},
	singlestore: {
		env: {
			ROOT_PASSWORD: 'rootpassword'
		},
		healthcheck: {
			startPeriod: '30s',
			test: 'singlestore -u root -prootpassword -e "SELECT 1" >/dev/null 2>&1'
		},
		image: 'ghcr.io/singlestore-labs/singlestoredb-dev', // NOTE: No tag specified due to data persistence
		port: '3306:3306',
		volumePath: '/data'
	}
};

export const generateDockerContainer = (databaseEngine: DatabaseEngine) => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: Expected a valid local database engine'
		);
	}

	const { command, env, healthcheck, image, port, volumePath } =
		templates[databaseEngine];
	const commandLine = command ? `\n        command: ${command}` : '';
	const envLines = Object.entries(env)
		.map(([key, value]) => `            ${key}: ${value}`)
		.join('\n');

	return `services:
    db:
        image: ${image}
        restart: always
        environment:
${envLines}
        ports:
            - "${port}"${commandLine}
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
