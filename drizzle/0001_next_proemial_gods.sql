DROP TABLE "prescriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "medications" jsonb;--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "diagnosis" text;