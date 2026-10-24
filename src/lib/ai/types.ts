import { z } from 'zod';

export const findingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export const findingCategorySchema = z.enum(['security', 'bug', 'performance', 'maintainability']);
export const confidenceSchema = z.enum(['high', 'medium', 'low']);

export const rawCodeFindingSchema = z.object({
  title: z.string().min(1),
  severity: findingSeveritySchema,
  category: findingCategorySchema,
  filePath: z.string().min(1),
  startLine: z.number().int().positive().nullable().optional(),
  endLine: z.number().int().positive().nullable().optional(),
  snippet: z.string().nullable().optional(),
  explanation: z.string().min(1),
  recommendedFix: z.string().min(1),
  confidence: confidenceSchema.default('medium'),
});

export type RawCodeFinding = z.infer<typeof rawCodeFindingSchema>;

export const repositoryAnalysisResultSchema = z.object({
  summary: z.string(),
  architectureOverview: z.string(),
  importantDependencies: z.array(z.string()).default([]),
  findings: z.array(rawCodeFindingSchema).default([]),
  evidenceNotes: z.string().optional(),
});

export type RepositoryAnalysisResult = z.infer<typeof repositoryAnalysisResultSchema>;

export interface SourceFileContext {
  path: string;
  content: string;
}

export interface AnalysisContext {
  owner: string;
  repo: string;
  description?: string | null;
  languages?: Record<string, number>;
  files: SourceFileContext[];
}

export interface CodeExplanationContext {
  filePath: string;
  code: string;
  selectedFunction?: string;
  surroundingContext?: string;
}

export interface CodeExplanationResult {
  title: string;
  explanation: string;
  parametersAndOutputs: string;
  complexityAndPerformance: string;
  potentialEdgeCases: string[];
  assumptions: string[];
  evidence: string[];
}

export interface QuestionContext {
  question: string;
  files: SourceFileContext[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface QuestionAnswerResult {
  answer: string;
  contextFiles: Array<{ path: string; startLine?: number; endLine?: number }>;
  isEvidence: boolean;
  assumptions: string[];
}

export interface UnitTestContext {
  filePath: string;
  functionName?: string;
  code: string;
  testFramework?: 'vitest' | 'jest' | 'pytest' | 'go' | 'standard';
}

export interface UnitTestResult {
  framework: string;
  testCode: string;
  explanation: string;
  coveredScenarios: string[];
}

export interface AiProvider {
  readonly name: string;
  analyzeRepository(context: AnalysisContext): Promise<RepositoryAnalysisResult>;
  explainCode(context: CodeExplanationContext): Promise<CodeExplanationResult>;
  answerQuestion(context: QuestionContext): Promise<QuestionAnswerResult>;
  generateUnitTests(context: UnitTestContext): Promise<UnitTestResult>;
}
