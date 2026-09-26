CREATE TABLE `users` (
	`auth_sub` varchar(255) PRIMARY KEY,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`metadata` json DEFAULT ('{}')
);
