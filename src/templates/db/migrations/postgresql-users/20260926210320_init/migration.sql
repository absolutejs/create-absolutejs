CREATE TABLE "users" (
	"auth_sub" varchar(255) PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'
);
