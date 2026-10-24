import { NextRequest, NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai';
import { z } from 'zod';

const explainSchema = z.object({
  filePath: z.string().min(1, 'File path is required'),
  code: z.string().min(1, 'Code snippet is required'),
  selectedFunction: z.string().optional(),
  aiProvider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = explainSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { filePath, code, selectedFunction, aiProvider: preferredProvider } = parseResult.data;

    const provider = getAiProvider(preferredProvider);
    const explanation = await provider.explainCode({
      filePath,
      code,
      selectedFunction,
    });

    return NextResponse.json({
      success: true,
      explanation,
      provider: provider.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to explain code' },
      { status: 500 }
    );
  }
}
