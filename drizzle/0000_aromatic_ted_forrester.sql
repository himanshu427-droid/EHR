CREATE TABLE "access_control" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" varchar NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"blockchain_tx_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "blockchain_audit" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tx_id" text NOT NULL,
	"operation" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"data_hash" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blockchain_audit_tx_id_unique" UNIQUE("tx_id")
);
--> statement-breakpoint
CREATE TABLE "insurance_claims" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" varchar NOT NULL,
	"insurance_id" varchar NOT NULL,
	"record_ids" jsonb NOT NULL,
	"claim_amount" text NOT NULL,
	"diagnosis" text NOT NULL,
	"treatment" text NOT NULL,
	"blockchain_tx_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" varchar NOT NULL,
	"lab_id" varchar NOT NULL,
	"test_type" text NOT NULL,
	"results" jsonb,
	"file_hash" text,
	"file_path" text,
	"file_name" text,
	"blockchain_tx_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" varchar NOT NULL,
	"doctor_id" varchar NOT NULL,
	"medications" jsonb NOT NULL,
	"diagnosis" text NOT NULL,
	"notes" text,
	"blockchain_tx_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" varchar NOT NULL,
	"doctor_id" varchar,
	"record_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_hash" text,
	"file_path" text,
	"file_name" text,
	"blockchain_tx_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"full_name" text NOT NULL,
	"specialty" text,
	"organization" text,
	"license_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
