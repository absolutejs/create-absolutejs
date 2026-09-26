CREATE TABLE `users` (
	`auth_sub` text PRIMARY KEY,
	`created_at` integer DEFAULT ((julianday('now') - 2440587.5) * 86400000) NOT NULL,
	`metadata` text DEFAULT '{}'
);
