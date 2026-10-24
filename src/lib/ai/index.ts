import { AiProvider } from './types';
import { GeminiAiProvider } from './providers/gemini-provider';
import { OpenAiProvider } from './providers/openai-provider';
import { MockAiProvider } from './providers/mock-provider';

export function getAiProvider(preferredProvider?: string): AiProvider {
  const providerType = (
    preferredProvider ||
    process.env.AI_PROVIDER ||
    ''
  ).toLowerCase();

  if (providerType === 'gemini') {
    if (process.env.GEMINI_API_KEY) {
      return new GeminiAiProvider();
    }
    console.warn('[AI Factory] GEMINI_API_KEY not found. Falling back to MockAiProvider.');
    return new MockAiProvider();
  }

  if (providerType === 'openai') {
    if (process.env.OPENAI_API_KEY) {
      return new OpenAiProvider();
    }
    console.warn('[AI Factory] OPENAI_API_KEY not found. Falling back to MockAiProvider.');
    return new MockAiProvider();
  }

  // Automatic detection
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('placeholder')) {
    try {
      return new GeminiAiProvider();
    } catch {
      return new MockAiProvider();
    }
  }

  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')) {
    try {
      return new OpenAiProvider();
    } catch {
      return new MockAiProvider();
    }
  }

  return new MockAiProvider();
}

export * from './types';
export * from './prompts';
export { MockAiProvider, GeminiAiProvider, OpenAiProvider };
