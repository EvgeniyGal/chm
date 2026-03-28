ALTER TABLE "contracts" ADD COLUMN "is_signed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;