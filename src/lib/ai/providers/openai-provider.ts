import {
  AiProvider,
  AnalysisContext,
  RepositoryAnalysisResult,
  repositoryAnalysisResultSchema,
  CodeExplanationContext,
  CodeExplanationResult,
  QuestionContext,
  QuestionAnswerResult,
  UnitTestContext,
  UnitTestResult,
} from '../types';
import {
  SYSTEM_SECURITY_INSTRUCTIONS,
  formatUntrustedSourceFiles,
  REPOSITORY_ANALYSIS_PROMPT,
  CODE_EXPLANATION_PROMPT,
  UNIT_TEST_PROMPT,
} from '../prompts';

function cleanJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string, baseUrl?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider');
    }
  }

  private async callChat(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<string> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const payload: any = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    };

    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async analyzeRepository(context: AnalysisContext): Promise<RepositoryAnalysisResult> {
    const formattedFiles = formatUntrustedSourceFiles(context.files);
    const userPrompt = `${REPOSITORY_ANALYSIS_PROMPT}\n\nRepository: ${context.owner}/${context.repo}\n\nSource Files:\n${formattedFiles}`;

    const text = await this.callChat(SYSTEM_SECURITY_INSTRUCTIONS, userPrompt, true);
    const parsed = JSON.parse(cleanJson(text));
    return repositoryAnalysisResultSchema.parse(parsed);
  }

  async explainCode(context: CodeExplanationContext): Promise<CodeExplanationResult> {
    const userPrompt = `${CODE_EXPLANATION_PROMPT}\n\nFile Path: ${context.filePath}\nSelected Function: ${context.selectedFunction || 'Whole file'}\n\nSource Code:\n${context.code}`;

    const text = await this.callChat(SYSTEM_SECURITY_INSTRUCTIONS, userPrompt, true);
    return JSON.parse(cleanJson(text)) as CodeExplanationResult;
  }

  async answerQuestion(context: QuestionContext): Promise<QuestionAnswerResult> {
    const formattedFiles = formatUntrustedSourceFiles(context.files);
    const userPrompt = `You are answering a question about the provided repository source code.
Distinguish verified facts directly visible in code from assumptions.
Cite exact files and line numbers whenever possible.

Question: ${context.question}

Source Files:
${formattedFiles}

Return response in strict JSON:
{
  "answer": "Detailed markdown answer with citations",
  "contextFiles": [{"path": "file/path.ext", "startLine": 1, "endLine": 10}],
  "isEvidence": true,
  "assumptions": ["List of assumptions if any"]
}`;

    const text = await this.callChat(SYSTEM_SECURITY_INSTRUCTIONS, userPrompt, true);
    return JSON.parse(cleanJson(text)) as QuestionAnswerResult;
  }

  async generateUnitTests(context: UnitTestContext): Promise<UnitTestResult> {
    const userPrompt = `${UNIT_TEST_PROMPT}\n\nFile: ${context.filePath}\nFramework requested: ${context.testFramework || 'idiomatic for project'}\n\nSource Code:\n${context.code}`;

    const text = await this.callChat(SYSTEM_SECURITY_INSTRUCTIONS, userPrompt, true);
    return JSON.parse(cleanJson(text)) as UnitTestResult;
  }
}
