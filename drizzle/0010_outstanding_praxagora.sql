ALTER TABLE "acceptance_acts" ADD COLUMN "is_signed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "acceptance_acts" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;