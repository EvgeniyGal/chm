CREATE TYPE "public"."work_type" AS ENUM('WORKS', 'SERVICES');--> statement-breakpoint
CREATE TABLE "acceptance_acts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"signing_location" text NOT NULL,
	"completion_date" timestamp with time zone NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"contractor_company_id" uuid NOT NULL,
	"contract_id" uuid,
	"invoice_id" uuid NOT NULL,
	"signer_full_name_nom" text NOT NULL,
	"signer_full_name_gen" text NOT NULL,
	"signer_position_nom" text NOT NULL,
	"signer_position_gen" text NOT NULL,
	"total_without_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vat_20" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_with_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acceptance_acts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"signing_location" text NOT NULL,
	"work_type" "work_type" NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"contractor_company_id" uuid NOT NULL,
	"project_timeline" text NOT NULL,
	"contract_duration" text NOT NULL,
	"signer_full_name_nom" text NOT NULL,
	"signer_full_name_gen" text NOT NULL,
	"signer_position_nom" text NOT NULL,
	"signer_position_gen" text NOT NULL,
	"signer_acting_under" text NOT NULL,
	"total_without_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vat_20" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_with_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"contractor_company_id" uuid NOT NULL,
	"contract_id" uuid,
	"is_external_contract" boolean DEFAULT false NOT NULL,
	"external_contract_number" text,
	"external_contract_date" timestamp with time zone,
	"signer_full_name_nom" text NOT NULL,
	"signer_position_nom" text NOT NULL,
	"total_without_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vat_20" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_with_vat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"invoice_id" uuid,
	"acceptance_act_id" uuid,
	"title" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acceptance_acts" ADD CONSTRAINT "acceptance_acts_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_acts" ADD CONSTRAINT "acceptance_acts_contractor_company_id_companies_id_fk" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_acts" ADD CONSTRAINT "acceptance_acts_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_acts" ADD CONSTRAINT "acceptance_acts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contractor_company_id_companies_id_fk" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractor_company_id_companies_id_fk" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_acceptance_act_id_acceptance_acts_id_fk" FOREIGN KEY ("acceptance_act_id") REFERENCES "public"."acceptance_acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_items_contract_idx" ON "line_items" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "line_items_invoice_idx" ON "line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "line_items_acceptance_act_idx" ON "line_items" USING btree ("acceptance_act_id");