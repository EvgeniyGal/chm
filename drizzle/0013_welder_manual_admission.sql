-- Чотири поля ручного допуску для зварника. IF NOT EXISTS: безпечно, якщо раніше вже застосовано стару 0013 лише з t/D.
ALTER TABLE "welder_certifications" ADD COLUMN IF NOT EXISTS "manual_joint_characteristics_admission" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD COLUMN IF NOT EXISTS "manual_welding_position_admission" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD COLUMN IF NOT EXISTS "manual_thickness_admission" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "welder_certifications" ADD COLUMN IF NOT EXISTS "manual_diameter_admission" text DEFAULT '' NOT NULL;