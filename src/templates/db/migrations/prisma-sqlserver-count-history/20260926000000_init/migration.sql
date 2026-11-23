BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[count_history] (
    [uid] INT NOT NULL IDENTITY(1,1),
    [count] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [count_history_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [count_history_pkey] PRIMARY KEY CLUSTERED ([uid])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

