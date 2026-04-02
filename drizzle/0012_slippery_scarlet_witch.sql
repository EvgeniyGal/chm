CREATE TYPE "public"."attestation_template_type" AS ENUM('protocol', 'certificate', 'report_protocol');--> statement-breakpoint
CREATE TYPE "public"."certification_group_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commission_member_role" AS ENUM('head', 'member');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."joint_characteristics" AS ENUM('bs_gg', 'bs_ng', 'ss_mb', 'ss_nb');--> statement-breakpoint
CREATE TYPE "public"."joint_type" AS ENUM('BW', 'FW');--> statement-breakpoint
CREATE TYPE "public"."sample_material_group_code" AS ENUM('W01', 'W02', 'W03', 'W04', 'W11');--> statement-breakpoint
CREATE TYPE "public"."theory_score" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."welded_parts_type" AS ENUM('plate', 'pipe');--> statement-breakpoint
CREATE TYPE "public"."welder_certification_type" AS ENUM('primary', 'additional', 'periodic', 'extraordinary');--> statement-breakpoint
CREATE TYPE "public"."welding_consumable_coating_type" AS ENUM('A', 'RA', 'R', 'RB', 'RC', 'B', 'C', 'S');--> statement-breakpoint
CREATE TABLE "certification_group_members" (
	"group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "certification_group_members_group_id_member_id_pk" PRIMARY KEY("group_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "certification_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_number" varchar(50) NOT NULL,
	"protocol_date" date NOT NULL,
	"inspection_date" date NOT NULL,
	"certificate_issue_date" date NOT NULL,
	"certificate_issue_location" varchar(255) NOT NULL,
	"head_id" uuid NOT NULL,
	"status" "certification_group_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certification_groups_group_number_unique" UNIQUE("group_number")
);
--> statement-breakpoint
CREATE TABLE "commission_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"role" "commission_member_role" DEFAULT 'member' NOT NULL,
	"position" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_type" "attestation_template_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"storage_key" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(500) NOT NULL,
	"admission_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "regulatory_documents_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sample_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_code" "sample_material_group_code" NOT NULL,
	"steel_grade" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "welder_certification_regulatory_documents" (
	"welder_certification_id" uuid NOT NULL,
	"regulatory_document_id" uuid NOT NULL,
	CONSTRAINT "welder_certification_regulatory_documents_welder_certification_id_regulatory_document_id_pk" PRIMARY KEY("welder_certification_id","regulatory_document_id")
);
--> statement-breakpoint
CREATE TABLE "welder_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"order_in_group" smallint NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"birth_location" varchar(255),
	"birthday" date,
	"prev_qualification_doc" varchar(255),
	"work_experience_years" numeric(4, 1) NOT NULL,
	"company_id" uuid NOT NULL,
	"certification_type" "welder_certification_type" DEFAULT 'primary' NOT NULL,
	"is_combined" boolean DEFAULT false NOT NULL,
	"welding_method_1" varchar(20) NOT NULL,
	"welding_method_2" varchar(20),
	"welded_parts_type" "welded_parts_type" NOT NULL,
	"joint_type" "joint_type" NOT NULL,
	"joint_characteristics" "joint_characteristics" NOT NULL,
	"welding_position_1" varchar(10) NOT NULL,
	"welding_position_2" varchar(10),
	"preheat" boolean DEFAULT false NOT NULL,
	"heat_treatment" boolean DEFAULT false NOT NULL,
	"sample_material_id" uuid NOT NULL,
	"thickness_1" numeric(6, 2),
	"thickness_2" numeric(6, 2),
	"thickness_3" numeric(6, 2),
	"pipe_diameter_1" numeric(7, 2),
	"pipe_diameter_2" numeric(7, 2),
	"pipe_diameter_3" numeric(7, 2),
	"consumable_1_id" uuid NOT NULL,
	"consumable_2_id" uuid,
	"shielding_gas_flux" varchar(255),
	"sample_mark" varchar(50) NOT NULL,
	"insp_visual" boolean DEFAULT true NOT NULL,
	"insp_radiographic" boolean DEFAULT true NOT NULL,
	"insp_ultrasonic" boolean DEFAULT false NOT NULL,
	"insp_bend" boolean DEFAULT false NOT NULL,
	"insp_metallographic" boolean DEFAULT false NOT NULL,
	"insp_additional" boolean DEFAULT false NOT NULL,
	"insp_visual_result" "inspection_result",
	"insp_radiographic_result" "inspection_result",
	"insp_ultrasonic_result" "inspection_result",
	"insp_bend_result" "inspection_result",
	"insp_metallographic_result" "inspection_result",
	"insp_additional_result" "inspection_result",
	"theory_score" "theory_score" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "welding_consumables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_grade" varchar(150) NOT NULL,
	"coating_type" "welding_consumable_coating_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certification_group_members" ADD CONSTRAINT "certification_group_members_group_id_certification_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."certification_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_group_members" ADD CONSTRAINT "certification_group_members_member_id_commission_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."commission_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_groups" ADD CONSTRAINT "certification_groups_head_id_commission_members_id_fk" FOREIGN KEY ("head_id") REFERENCES "public"."commission_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certification_regulatory_documents" ADD CONSTRAINT "welder_certification_regulatory_documents_welder_certification_id_welder_certifications_id_fk" FOREIGN KEY ("welder_certification_id") REFERENCES "public"."welder_certifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certification_regulatory_documents" ADD CONSTRAINT "welder_certification_regulatory_documents_regulatory_document_id_regulatory_documents_id_fk" FOREIGN KEY ("regulatory_document_id") REFERENCES "public"."regulatory_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD CONSTRAINT "welder_certifications_group_id_certification_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."certification_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD CONSTRAINT "welder_certifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD CONSTRAINT "welder_certifications_sample_material_id_sample_materials_id_fk" FOREIGN KEY ("sample_material_id") REFERENCES "public"."sample_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD CONSTRAINT "welder_certifications_consumable_1_id_welding_consumables_id_fk" FOREIGN KEY ("consumable_1_id") REFERENCES "public"."welding_consumables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD CONSTRAINT "welder_certifications_consumable_2_id_welding_consumables_id_fk" FOREIGN KEY ("consumable_2_id") REFERENCES "public"."welding_consumables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_templates_one_active_per_type" ON "document_templates" USING btree ("template_type") WHERE "document_templates"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "welder_certifications_group_order_uidx" ON "welder_certifications" USING btree ("group_id","order_in_group");