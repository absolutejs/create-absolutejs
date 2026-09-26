CREATE TABLE "count_history" (
	"uid" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "count_history_uid_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
