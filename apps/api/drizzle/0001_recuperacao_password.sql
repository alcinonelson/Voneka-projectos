ALTER TABLE "users" ADD COLUMN "recuperacao_token_hash" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recuperacao_expira_em" timestamp with time zone;
