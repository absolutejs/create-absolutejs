import { runCommand } from '../harness';
import type { ScenarioHooks } from './utils';

export const createPostgresHooks = (label: string): ScenarioHooks => {
  let started = false;

  return {
    afterServerStop: async (projectPath) => {
      if (!started) return;

      await runCommand(['bun', 'db:down'], {
        cwd: projectPath,
        label: `${label} db:down`
      }).catch(() => undefined);
    },
    beforeServerStart: async (projectPath) => {
      await runCommand(['bun', 'db:up'], {
        cwd: projectPath,
        label: `${label} db:up`
      });

      await runCommand(
        [
          'docker',
          'compose',
          '-p',
          'postgresql',
          '-f',
          'db/docker-compose.db.yml',
          'exec',
          'db',
          'bash',
          '-lc',
          'until pg_isready -U user -h 127.0.0.1 --quiet; do sleep 1; done'
        ],
        {
          cwd: projectPath,
          label: `${label} db:wait`
        }
      );

      started = true;
    }
  };
};

export const createMysqlHooks = (label: string): ScenarioHooks => {
  let started = false;

  return {
    afterServerStop: async (projectPath) => {
      if (!started) return;

      await runCommand(['bun', 'db:down'], {
        cwd: projectPath,
        label: `${label} db:down`
      }).catch(() => undefined);
    },
    beforeServerStart: async (projectPath) => {
      await runCommand(['bun', 'db:up'], {
        cwd: projectPath,
        label: `${label} db:up`
      });

      await runCommand(
        [
          'docker',
          'compose',
          '-p',
          'mysql',
          '-f',
          'db/docker-compose.db.yml',
          'exec',
          '-e',
          'MYSQL_PWD=userpassword',
          'db',
          'bash',
          '-lc',
          'until mysqladmin ping -h127.0.0.1 --silent; do sleep 1; done'
        ],
        {
          cwd: projectPath,
          label: `${label} db:wait`
        }
      );

      started = true;
    }
  };
};

export const createMongoHooks = (label: string): ScenarioHooks => {
  let started = false;

  const runCommandOrThrow = async (
    command: string[],
    options: Parameters<typeof runCommand>[1]
  ) => {
    const result = await runCommand(command, options);

    if (result.exitCode !== 0) {
      const stdout = result.stdout.length > 0 ? `\nstdout:\n${result.stdout}` : '';
      const stderr = result.stderr.length > 0 ? `\nstderr:\n${result.stderr}` : '';
      const labelSuffix = options?.label ? ` (${options.label})` : '';

      throw new Error(
        `Command${labelSuffix} failed with exit code ${result.exitCode}.${stdout}${stderr}`
      );
    }
  };

  return {
    afterServerStop: async (projectPath) => {
      if (!started) return;

      await runCommand(['bun', 'db:down'], {
        cwd: projectPath,
        label: `${label} db:down`,
        timeoutMs: 120_000
      }).catch(() => undefined);
    },
    beforeServerStart: async (projectPath) => {
      await runCommand(
        [
          'docker',
          'compose',
          '-p',
          'mongodb',
          '-f',
          'db/docker-compose.db.yml',
          'down',
          '-v'
        ],
        {
          cwd: projectPath,
          label: `${label} db:reset`,
          timeoutMs: 120_000
        }
      ).catch(() => undefined);

      await runCommandOrThrow(['bun', 'db:up'], {
        cwd: projectPath,
        label: `${label} db:up`
      });

      const containerMongoUrl = 'mongodb://user:password@127.0.0.1:27017';
      const waitArgs = [
        'docker',
        'compose',
        '-p',
        'mongodb',
        '-f',
        'db/docker-compose.db.yml',
        'exec',
        '-e',
        'MONGODB_PASSWORD=password',
        '-e',
        'MONGODB_AUTH_DB=admin',
        '-e',
        `MONGODB_URL=${containerMongoUrl}`,
        '-e',
        'MONGODB_USER=user',
        'db',
        'bash',
        '-lc',
        'until mongosh "$MONGODB_URL" --username "$MONGODB_USER" --password "$MONGODB_PASSWORD" --authenticationDatabase "$MONGODB_AUTH_DB" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; do sleep 1; done'
      ];

      const waitEnv = {
        MONGODB_AUTH_DB: 'admin',
        MONGODB_PASSWORD: 'password',
        MONGODB_URL: containerMongoUrl,
        MONGODB_USER: 'user'
      } as const;

      await runCommandOrThrow(waitArgs, {
        cwd: projectPath,
        env: waitEnv,
        label: `${label} db:wait`
      });

      const ensureUserScript = `
        (function ensureUser() {
          const adminDb = db.getSiblingDB("admin");
          try {
            const existingUser = adminDb.getUser("user");
            if (!existingUser) {
              adminDb.createUser({ user: "user", pwd: "password", roles: [{ role: "root", db: "admin" }] });
            }
            return;
          } catch (authError) {
            try {
              adminDb.auth("user", "password");
              const existingUser = adminDb.getUser("user");
              if (!existingUser) {
                adminDb.createUser({ user: "user", pwd: "password", roles: [{ role: "root", db: "admin" }] });
              }
            } catch (createError) {
              printjson(createError);
              throw createError;
            }
          }
        })();
      `;

      const ensureUserEncoded = Buffer.from(ensureUserScript.trim(), 'utf8').toString('base64');

      const ensureUserArgs = [
        'docker',
        'compose',
        '-p',
        'mongodb',
        '-f',
        'db/docker-compose.db.yml',
        'exec',
        '-e',
        'MONGODB_AUTH_DB=admin',
        '-e',
        'MONGODB_PASSWORD=password',
        '-e',
        `MONGODB_URL=${containerMongoUrl}`,
        '-e',
        'MONGODB_USER=user',
        'db',
        'bash',
        '-lc',
        `echo ${ensureUserEncoded} | base64 --decode | mongosh "$MONGODB_URL/$MONGODB_AUTH_DB" --quiet --file /dev/stdin`
      ];

      await runCommandOrThrow(ensureUserArgs, {
        cwd: projectPath,
        env: waitEnv,
        label: `${label} ensure-user`
      });

      started = true;
    }
  };
};

