import { NextRequest, NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai';
import { z } from 'zod';

const testSchema = z.object({
  filePath: z.string().min(1, 'File path is required'),
  code: z.string().min(1, 'Code snippet is required'),
  functionName: z.string().optional(),
  testFramework: z.enum(['vitest', 'jest', 'pytest', 'go', 'standard']).optional(),
  aiProvider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = testSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { filePath, code, functionName, testFramework, aiProvider: preferredProvider } = parseResult.data;

    const provider = getAiProvider(preferredProvider);
    const result = await provider.generateUnitTests({
      filePath,
      code,
      functionName,
      testFramework,
    });

    return NextResponse.json({
      success: true,
      unitTests: result,
      provider: provider.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate unit tests' },
      { status: 500 }
    );
  }
}
