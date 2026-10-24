import { NextRequest, NextResponse } from 'next/server';
import { initDb, repositories, analyses, codeFindings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { GitHubClient } from '@/lib/github/client';
import { getAiProvider } from '@/lib/ai';
import { z } from 'zod';

const startAnalysisSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
  filePaths: z.array(z.string()).optional(),
  aiProvider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = startAnalysisSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { repositoryId, filePaths, aiProvider: preferredProvider } = parseResult.data;

    const { db } = await initDb();
    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, repositoryId))
      .limit(1);

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Create an analysis record in processing state
    const [analysis] = await db
      .insert(analyses)
      .values({
        repositoryId: repo.id,
        status: 'processing',
        selectedFiles: filePaths || [],
      })
      .returning();

    // Fetch repository files content
    const client = new GitHubClient();
    let targetPaths = filePaths;

    if (!targetPaths || targetPaths.length === 0) {
      const tree = await client.getFileTree(repo.owner, repo.name, repo.defaultBranch);
      // Pick top source files (excluding configs/docs if code files exist)
      const codeFiles = tree.filter(
        (t) =>
          t.type === 'blob' &&
          (t.path.endsWith('.ts') ||
            t.path.endsWith('.tsx') ||
            t.path.endsWith('.js') ||
            t.path.endsWith('.jsx') ||
            t.path.endsWith('.py') ||
            t.path.endsWith('.go') ||
            t.path.endsWith('.rs')) &&
          !t.path.includes('.test.') &&
          !t.path.includes('.spec.')
      );

      targetPaths = (codeFiles.length > 0 ? codeFiles : tree)
        .slice(0, 10)
        .map((t) => t.path);
    }

    // Fetch contents with concurrency limit
    const loadedFiles: Array<{ path: string; content: string }> = [];
    for (const path of targetPaths) {
      try {
        const content = await client.getFileContent(
          repo.owner,
          repo.name,
          path,
          repo.defaultBranch
        );
        loadedFiles.push({ path, content });
      } catch (err: any) {
        console.warn(`[Analysis] Could not fetch file content for ${path}:`, err.message);
      }
    }

    if (loadedFiles.length === 0) {
      await db
        .update(analyses)
        .set({
          status: 'failed',
          errorMessage: 'No readable source files could be retrieved from the repository',
          durationMs: Date.now() - startTime,
        })
        .where(eq(analyses.id, analysis.id));

      return NextResponse.json(
        { error: 'No readable source files could be retrieved' },
        { status: 400 }
      );
    }

    // Run AI analysis
    const provider = getAiProvider(preferredProvider);
    const result = await provider.analyzeRepository({
      owner: repo.owner,
      repo: repo.name,
      description: repo.description,
      languages: repo.languages as Record<string, number>,
      files: loadedFiles,
    });

    // Insert findings
    const insertedFindings = [];
    for (const f of result.findings) {
      const [finding] = await db
        .insert(codeFindings)
        .values({
          analysisId: analysis.id,
          title: f.title,
          severity: f.severity,
          category: f.category,
          filePath: f.filePath,
          startLine: f.startLine || null,
          endLine: f.endLine || null,
          snippet: f.snippet || null,
          explanation: f.explanation,
          recommendedFix: f.recommendedFix,
          confidence: f.confidence || 'medium',
        })
        .returning();
      insertedFindings.push(finding);
    }

    // Update analysis status
    const durationMs = Date.now() - startTime;
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({
        status: 'completed',
        summary: result.summary,
        architectureOverview: result.architectureOverview,
        importantDependencies: result.importantDependencies,
        selectedFiles: loadedFiles.map((f) => f.path),
        totalFilesScanned: loadedFiles.length,
        findingsCount: insertedFindings.length,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(analyses.id, analysis.id))
      .returning();

    return NextResponse.json({
      success: true,
      analysis: updatedAnalysis,
      findings: insertedFindings,
      provider: provider.name,
    });
  } catch (error: any) {
    console.error('[Analysis Error]:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}
