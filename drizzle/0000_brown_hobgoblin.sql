CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."auditable_entity" AS ENUM('COMPANY', 'CONTRACT', 'INVOICE', 'ACCEPTANCE_ACT');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('CONTRACT', 'INVOICE', 'ACCEPTANCE_ACT');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('CONTRACT', 'INVOICE', 'ACCEPTANCE_ACT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'MANAGER');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "auditable_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"actor_user_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"diff" text DEFAULT '{}' NOT NULL,
	"note" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"short_name" text NOT NULL,
	"address" text NOT NULL,
	"contacts" text DEFAULT '[]' NOT NULL,
	"edrpou_code" text NOT NULL,
	"vat_id_tin" text,
	"tax_status" text NOT NULL,
	"iban" text NOT NULL,
	"bank" text NOT NULL,
	"contract_signer_full_name_nom" text NOT NULL,
	"contract_signer_full_name_gen" text NOT NULL,
	"contract_signer_position_nom" text NOT NULL,
	"contract_signer_position_gen" text NOT NULL,
	"contract_signer_acting_under" text NOT NULL,
	"act_signer_full_name_nom" text NOT NULL,
	"act_signer_full_name_gen" text NOT NULL,
	"act_signer_position_nom" text NOT NULL,
	"act_signer_position_gen" text NOT NULL,
	"invoice_signer_full_name_nom" text NOT NULL,
	"invoice_signer_position_nom" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_counters" (
	"document_type" "document_type" NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_counters_document_type_year_month_pk" PRIMARY KEY("document_type","year","month")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" varchar(128) NOT NULL,
	"original_filename" text,
	"sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'MANAGER' NOT NULL,
	"email_verified" timestamp with time zone,
	"password_hash" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
