import { GoogleGenAI } from '@google/genai';
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

export class GeminiAiProvider implements AiProvider {
  readonly name = 'gemini';
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for Gemini provider');
    }
    this.client = new GoogleGenAI({ apiKey: key });
    this.model = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async analyzeRepository(context: AnalysisContext): Promise<RepositoryAnalysisResult> {
    const formattedFiles = formatUntrustedSourceFiles(context.files);
    const prompt = `${SYSTEM_SECURITY_INSTRUCTIONS}\n\n${REPOSITORY_ANALYSIS_PROMPT}\n\nRepository: ${context.owner}/${context.repo}\n\nSource Files:\n${formattedFiles}`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(cleanJson(text));
    return repositoryAnalysisResultSchema.parse(parsed);
  }

  async explainCode(context: CodeExplanationContext): Promise<CodeExplanationResult> {
    const prompt = `${SYSTEM_SECURITY_INSTRUCTIONS}\n\n${CODE_EXPLANATION_PROMPT}\n\nFile Path: ${context.filePath}\nSelected Function: ${context.selectedFunction || 'Whole file'}\n\nSource Code:\n${context.code}`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    return JSON.parse(cleanJson(text)) as CodeExplanationResult;
  }

  async answerQuestion(context: QuestionContext): Promise<QuestionAnswerResult> {
    const formattedFiles = formatUntrustedSourceFiles(context.files);
    const prompt = `${SYSTEM_SECURITY_INSTRUCTIONS}

You are answering a question about the provided repository source code.
Distinguish verified facts directly visible in code from assumptions.
Cite exact files and line numbers whenever possible.

Question: ${context.question}

Source Files:
${formattedFiles}

Return your response in strict JSON:
{
  "answer": "Detailed markdown answer with citations",
  "contextFiles": [{"path": "file/path.ext", "startLine": 1, "endLine": 10}],
  "isEvidence": true,
  "assumptions": ["List of assumptions if any"]
}
`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    return JSON.parse(cleanJson(text)) as QuestionAnswerResult;
  }

  async generateUnitTests(context: UnitTestContext): Promise<UnitTestResult> {
    const prompt = `${SYSTEM_SECURITY_INSTRUCTIONS}\n\n${UNIT_TEST_PROMPT}\n\nFile: ${context.filePath}\nFramework requested: ${context.testFramework || 'idiomatic for project'}\n\nSource Code:\n${context.code}`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    return JSON.parse(cleanJson(text)) as UnitTestResult;
  }
}
