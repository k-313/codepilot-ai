import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Global singleton caching to avoid multiple instances across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: any;
  // eslint-disable-next-line no-var
  var __pgliteClient: PGlite | null;
  // eslint-disable-next-line no-var
  var __postgresClient: postgres.Sql | null;
}

let db: any;
let isEmbedded = false;

const FALLBACK_STATEMENTS = [
  `DO $$ BEGIN CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."finding_category" AS ENUM('security', 'bug', 'performance', 'maintainability'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."finding_severity" AS ENUM('critical', 'high', 'medium', 'low', 'info'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `CREATE TABLE IF NOT EXISTS "repositories" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL REFERENCES "public"."repositories"("id") ON DELETE cascade,
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
  );`,
  `CREATE TABLE IF NOT EXISTS "analysis_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL REFERENCES "public"."analyses"("id") ON DELETE cascade,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"context_files" jsonb DEFAULT '[]'::jsonb,
	"is_evidence" boolean DEFAULT true NOT NULL,
	"suggested_tests" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "code_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL REFERENCES "public"."analyses"("id") ON DELETE cascade,
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
  );`,
  `CREATE INDEX IF NOT EXISTS "idx_analyses_repository_id" ON "analyses" USING btree ("repository_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_analyses_status" ON "analyses" USING btree ("status");`,
  `CREATE INDEX IF NOT EXISTS "idx_analyses_created_at" ON "analyses" USING btree ("created_at");`,
  `CREATE INDEX IF NOT EXISTS "idx_analysis_messages_analysis_id" ON "analysis_messages" USING btree ("analysis_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_analysis_messages_created_at" ON "analysis_messages" USING btree ("created_at");`,
  `CREATE INDEX IF NOT EXISTS "idx_code_findings_analysis_id" ON "code_findings" USING btree ("analysis_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_code_findings_severity" ON "code_findings" USING btree ("severity");`,
  `CREATE INDEX IF NOT EXISTS "idx_code_findings_file_path" ON "code_findings" USING btree ("file_path");`,
  `CREATE INDEX IF NOT EXISTS "idx_code_findings_category" ON "code_findings" USING btree ("category");`,
  `CREATE INDEX IF NOT EXISTS "idx_repositories_full_name" ON "repositories" USING btree ("full_name");`,
  `CREATE INDEX IF NOT EXISTS "idx_repositories_owner_name" ON "repositories" USING btree ("owner","name");`
];

export async function initDb() {
  if (global.__dbInstance) {
    return { db: global.__dbInstance, isEmbedded };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    try {
      const client = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        onnotice: () => {},
      });
      db = drizzlePostgres(client, { schema });
      global.__dbInstance = db;
      global.__postgresClient = client;
      isEmbedded = false;
      return { db, isEmbedded: false };
    } catch (err) {
      console.warn('[DB] Failed to connect to DATABASE_URL, falling back to embedded PGlite:', err);
    }
  }

  // Fallback to embedded in-memory PGlite for zero-config local & serverless
  isEmbedded = true;
  let pglite: PGlite;

  const isServerless =
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NODE_ENV === 'test';

  if (isServerless) {
    pglite = new PGlite();
  } else {
    try {
      const dataDir = path.resolve(process.cwd(), '.pgdata');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pglite = new PGlite(dataDir);
    } catch {
      pglite = new PGlite();
    }
  }

  await pglite.waitReady;

  // Execute schema definitions
  for (const sql of FALLBACK_STATEMENTS) {
    try {
      await pglite.exec(sql);
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn('[DB Init Notice]:', e.message);
      }
    }
  }

  db = drizzlePglite(pglite, { schema });
  global.__dbInstance = db;
  global.__pgliteClient = pglite;

  return { db, isEmbedded: true };
}

export function getDb() {
  if (global.__dbInstance) {
    return global.__dbInstance;
  }
  throw new Error('Database not initialized. Call await initDb() before accessing getDb()');
}

export { schema };
export * from './schema';
