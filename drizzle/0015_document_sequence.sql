CREATE TABLE "document_sequence" (
	"id" integer PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequence_singleton" CHECK ("document_sequence"."id" = 1)
);
--> statement-breakpoint
INSERT INTO "document_sequence" ("id", "value")
VALUES (
	1,
	COALESCE((
		SELECT MAX(seq)
		FROM (
			SELECT (regexp_match("number", '^(\d+)/\d{2}-\d{4}'))[1]::integer AS seq FROM "contracts"
			UNION ALL
			SELECT (regexp_match("number", '^(\d+)/\d{2}-\d{4}'))[1]::integer FROM "invoices"
			UNION ALL
			SELECT (regexp_match("number", '^(\d+)/\d{2}-\d{4}'))[1]::integer FROM "acceptance_acts"
		) parsed
		WHERE seq IS NOT NULL
	), 0)
);
