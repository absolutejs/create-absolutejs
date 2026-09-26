CREATE TABLE `count_history` (
	`uid` integer PRIMARY KEY AUTOINCREMENT,
	`count` integer NOT NULL,
	`created_at` integer DEFAULT ((julianday('now') - 2440587.5) * 86400000) NOT NULL
);
