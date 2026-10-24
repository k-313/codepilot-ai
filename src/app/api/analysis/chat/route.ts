import { NextRequest, NextResponse } from 'next/server';
import { initDb, analyses, analysisMessages, repositories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { GitHubClient } from '@/lib/github/client';
import { getAiProvider } from '@/lib/ai';
import { z } from 'zod';

const chatSchema = z.object({
  analysisId: z.string().uuid('Invalid analysis ID'),
  question: z.string().trim().min(1, 'Question cannot be empty').max(1000, 'Question too long'),
  activeFilePath: z.string().optional(),
  activeFileContent: z.string().optional(),
  aiProvider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = chatSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { analysisId, question, activeFilePath, activeFileContent, aiProvider: preferredProvider } = parseResult.data;

    const { db } = await initDb();
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, analysis.repositoryId))
      .limit(1);

    // Save user message
    const [userMessage] = await db
      .insert(analysisMessages)
      .values({
        analysisId: analysis.id,
        role: 'user',
        content: question,
        contextFiles: activeFilePath ? [{ path: activeFilePath }] : [],
        isEvidence: true,
      })
      .returning();

    // Prepare files context
    const filesContext: Array<{ path: string; content: string }> = [];

    if (activeFilePath && activeFileContent) {
      filesContext.push({ path: activeFilePath, content: activeFileContent });
    } else {
      const client = new GitHubClient();
      const filesToLoad = (analysis.selectedFiles as string[]) || [];
      for (const p of filesToLoad.slice(0, 3)) {
        try {
          const content = await client.getFileContent(repo.owner, repo.name, p, repo.defaultBranch);
          filesContext.push({ path: p, content });
        } catch {}
      }
    }

    // Call AI provider
    const provider = getAiProvider(preferredProvider);
    const answerResult = await provider.answerQuestion({
      question,
      files: filesContext,
    });

    // Save assistant message
    const [assistantMessage] = await db
      .insert(analysisMessages)
      .values({
        analysisId: analysis.id,
        role: 'assistant',
        content: answerResult.answer,
        contextFiles: answerResult.contextFiles,
        isEvidence: answerResult.isEvidence,
      })
      .returning();

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      assumptions: answerResult.assumptions,
      provider: provider.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
