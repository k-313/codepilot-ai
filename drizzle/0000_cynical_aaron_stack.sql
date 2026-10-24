CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('security', 'bug', 'performance', 'maintainability');--> statement-breakpoint
CREATE TYPE "public"."finding_severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"summary" text,
	"architecture_overview" text,
	"important_dependencies" jsonb DEFAULT '[]'::jsonb,
	"selected_files" jsonb DEFAULT '[]'::jsonb,
	"error_message" text,
	"duration_ms" integer,
	"total_files_scanned" integer DEFAULT 0 NOT NULL,
	"findings_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"context_files" jsonb DEFAULT '[]'::jsonb,
	"is_evidence" boolean DEFAULT true NOT NULL,
	"suggested_tests" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"title" text NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"category" "finding_category" DEFAULT 'maintainability' NOT NULL,
	"file_path" text NOT NULL,
	"start_line" integer,
	"end_line" integer,
	"snippet" text,
	"explanation" text NOT NULL,
	"recommended_fix" text NOT NULL,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"url" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"description" text,
	"languages" jsonb DEFAULT '{}'::jsonb,
	"star_count" integer DEFAULT 0 NOT NULL,
	"fork_count" integer DEFAULT 0 NOT NULL,
	"open_issues_count" integer DEFAULT 0 NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size_bytes" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_messages" ADD CONSTRAINT "analysis_messages_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_findings" ADD CONSTRAINT "code_findings_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analyses_repository_id" ON "analyses" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "idx_analyses_status" ON "analyses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_analyses_created_at" ON "analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_analysis_messages_analysis_id" ON "analysis_messages" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "idx_analysis_messages_created_at" ON "analysis_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_code_findings_analysis_id" ON "code_findings" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "idx_code_findings_severity" ON "code_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_code_findings_file_path" ON "code_findings" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "idx_code_findings_category" ON "code_findings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_repositories_full_name" ON "repositories" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_repositories_owner_name" ON "repositories" USING btree ("owner","name");