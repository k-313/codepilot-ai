import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---
export const analysisStatusEnum = pgEnum('analysis_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const findingSeverityEnum = pgEnum('finding_severity', [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const findingCategoryEnum = pgEnum('finding_category', [
  'security',
  'bug',
  'performance',
  'maintainability',
]);

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
]);

// --- 1. Repositories Table ---
export const repositories = pgTable(
  'repositories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    fullName: text('full_name').notNull().unique(),
    url: text('url').notNull(),
    defaultBranch: text('default_branch').notNull().default('main'),
    description: text('description'),
    languages: jsonb('languages').$type<Record<string, number>>().default({}),
    starCount: integer('star_count').notNull().default(0),
    forkCount: integer('fork_count').notNull().default(0),
    openIssuesCount: integer('open_issues_count').notNull().default(0),
    fileCount: integer('file_count').notNull().default(0),
    totalSizeBytes: integer('total_size_bytes').notNull().default(0),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_repositories_full_name').on(table.fullName),
    index('idx_repositories_owner_name').on(table.owner, table.name),
  ]
);

// --- 2. Analyses Table ---
export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    status: analysisStatusEnum('status').notNull().default('pending'),
    summary: text('summary'),
    architectureOverview: text('architecture_overview'),
    importantDependencies: jsonb('important_dependencies').$type<string[]>().default([]),
    selectedFiles: jsonb('selected_files').$type<string[]>().default([]),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    totalFilesScanned: integer('total_files_scanned').notNull().default(0),
    findingsCount: integer('findings_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_analyses_repository_id').on(table.repositoryId),
    index('idx_analyses_status').on(table.status),
    index('idx_analyses_created_at').on(table.createdAt),
  ]
);

// --- 3. Analysis Messages (Q&A and Code Assistant) ---
export const analysisMessages = pgTable(
  'analysis_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    contextFiles: jsonb('context_files')
      .$type<Array<{ path: string; startLine?: number; endLine?: number }>>()
      .default([]),
    isEvidence: boolean('is_evidence').notNull().default(true),
    suggestedTests: text('suggested_tests'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_analysis_messages_analysis_id').on(table.analysisId),
    index('idx_analysis_messages_created_at').on(table.createdAt),
  ]
);

// --- 4. Code Review Findings Table ---
export const codeFindings = pgTable(
  'code_findings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    severity: findingSeverityEnum('severity').notNull(),
    category: findingCategoryEnum('category').notNull().default('maintainability'),
    filePath: text('file_path').notNull(),
    startLine: integer('start_line'),
    endLine: integer('end_line'),
    snippet: text('snippet'),
    explanation: text('explanation').notNull(),
    recommendedFix: text('recommended_fix').notNull(),
    confidence: text('confidence').notNull().default('medium'), // 'high' | 'medium' | 'low'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_code_findings_analysis_id').on(table.analysisId),
    index('idx_code_findings_severity').on(table.severity),
    index('idx_code_findings_file_path').on(table.filePath),
    index('idx_code_findings_category').on(table.category),
  ]
);

// --- Relations ---
export const repositoriesRelations = relations(repositories, ({ many }) => ({
  analyses: many(analyses),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [analyses.repositoryId],
    references: [repositories.id],
  }),
  messages: many(analysisMessages),
  findings: many(codeFindings),
}));

export const analysisMessagesRelations = relations(analysisMessages, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisMessages.analysisId],
    references: [analyses.id],
  }),
}));

export const codeFindingsRelations = relations(codeFindings, ({ one }) => ({
  analysis: one(analyses, {
    fields: [codeFindings.analysisId],
    references: [analyses.id],
  }),
}));

// Type exports
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
export type AnalysisMessage = typeof analysisMessages.$inferSelect;
export type NewAnalysisMessage = typeof analysisMessages.$inferInsert;
export type CodeFinding = typeof codeFindings.$inferSelect;
export type NewCodeFinding = typeof codeFindings.$inferInsert;
