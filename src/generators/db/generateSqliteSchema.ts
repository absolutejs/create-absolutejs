import { AuthProvider } from '../../types';

export const generateSqliteSchema = (authProvider: AuthProvider) =>
	authProvider && authProvider !== 'none'
		? `CREATE TABLE IF NOT EXISTS users (
  auth_sub TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400000),
  metadata TEXT DEFAULT '{}'
);`
		: `CREATE TABLE IF NOT EXISTS count_history (
  uid INTEGER PRIMARY KEY AUTOINCREMENT,
  count INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400000)
);`;
