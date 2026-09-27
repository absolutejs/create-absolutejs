-- CreateTable
CREATE TABLE "users" (
    "auth_sub" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL
);

