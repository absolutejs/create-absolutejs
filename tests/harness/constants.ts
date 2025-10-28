import { join } from 'path';

export const COMBO = {
  frontend: 'react',
  backend: 'elysia',
  database: 'postgresql',
  orm: 'prisma',
  auth: 'absolute-auth',
  host: 'neon',
};

export const FLAGS = [
  '--react',
  '--db', 'postgresql',
  '--orm', 'prisma',
  '--auth', 'absolute-auth',
  '--db-host', 'neon',
  '--skip',     
  '--install',  
];

export const PROJECT_NAME = 'test-scaffold';
export const REPO_ROOT = process.cwd();
export const CLI_PATH = join(REPO_ROOT, 'src', 'index.ts');
export const OUTPUT_PATH = join(REPO_ROOT, PROJECT_NAME);

export const TIMEOUTS = {
  scaffold: 60_000,   
  install: 120_000,  
  build: 120_000, 
};

export const EXPECTED = {
  dirs: [
    'src',
    'src/frontend',
    'src/backend',
    'db',
  ],
  files: [
    'package.json',
    '.env',
    'tsconfig.json',
    'src/backend/server.ts',
    'db/schema.ts', 
  ],
  deps: [
    '@prisma/client',
    'react',
    'react-dom',
    'elysia',
    '@absolutejs/absolute',
    '@absolutejs/auth',
  ],
  envVars: ['DATABASE_URL'],
};