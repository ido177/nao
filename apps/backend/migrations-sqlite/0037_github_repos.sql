ALTER TABLE `project` ADD `env_vars` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `github_access_token` text;