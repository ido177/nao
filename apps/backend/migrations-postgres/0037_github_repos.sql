ALTER TABLE "project" ADD COLUMN "env_vars" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "github_access_token" text;