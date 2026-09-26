CREATE TABLE [users] (
	[auth_sub] nvarchar(255),
	[created_at] datetime2 NOT NULL CONSTRAINT [users_created_at_default] DEFAULT (sysdatetime()),
	[metadata] nvarchar(max) CONSTRAINT [users_metadata_default] DEFAULT ('{}'),
	CONSTRAINT [users_pkey] PRIMARY KEY([auth_sub])
);
