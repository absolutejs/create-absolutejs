CREATE TABLE [count_history] (
	[uid] int IDENTITY(1, 1),
	[count] int NOT NULL,
	[created_at] datetime2 NOT NULL CONSTRAINT [count_history_created_at_default] DEFAULT (sysdatetime()),
	CONSTRAINT [count_history_pkey] PRIMARY KEY([uid])
);
