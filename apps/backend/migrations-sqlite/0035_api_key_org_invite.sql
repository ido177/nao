CREATE TABLE `api_key` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_by` text NOT NULL,
	`last_used_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_key_key_hash_unique` ON `api_key` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_key_orgId_idx` ON `api_key` (`org_id`);--> statement-breakpoint
CREATE INDEX `api_key_keyHash_idx` ON `api_key` (`key_hash`);--> statement-breakpoint
CREATE TABLE `org_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `org_invite_email_idx` ON `org_invite` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `org_invite_org_id_email_unique` ON `org_invite` (`org_id`,`email`);