CREATE TABLE `count_history` (
	`uid` int AUTO_INCREMENT PRIMARY KEY,
	`count` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
