import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl } from '@/lib/github/url-parser';
import { GitHubClient, GitHubApiError } from '@/lib/github/client';
import { initDb, repositories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const importRequestSchema = z.object({
  url: z.string().min(1, 'Repository URL is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = importRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { url } = parseResult.data;
    const { owner, repo } = parseGitHubUrl(url);

    const client = new GitHubClient();
    const result = await client.ingestRepository(owner, repo);

    // Save or update in database
    const { db } = await initDb();
    const existing = await db
      .select()
      .from(repositories)
      .where(eq(repositories.fullName, result.metadata.fullName))
      .limit(1);

    let savedRepo;
    const repoValues = {
      owner: result.metadata.owner,
      name: result.metadata.name,
      fullName: result.metadata.fullName,
      url: result.metadata.url,
      defaultBranch: result.metadata.defaultBranch,
      description: result.metadata.description,
      languages: result.metadata.languages,
      starCount: result.metadata.starCount,
      forkCount: result.metadata.forkCount,
      openIssuesCount: result.metadata.openIssuesCount,
      fileCount: result.eligibleFiles.length,
      totalSizeBytes: result.filterStats.totalSizeBytes,
      fetchedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const [updated] = await db
        .update(repositories)
        .set(repoValues)
        .where(eq(repositories.id, existing[0].id))
        .returning();
      savedRepo = updated;
    } else {
      const [inserted] = await db
        .insert(repositories)
        .values(repoValues)
        .returning();
      savedRepo = inserted;
    }

    return NextResponse.json({
      success: true,
      repository: savedRepo,
      fileTree: result.fileTree,
      filterStats: result.filterStats,
      eligibleFiles: result.eligibleFiles,
    });
  } catch (error: any) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        {
          error: error.message,
          rateLimitReset: error.rateLimitReset,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while importing repository' },
      { status: 400 }
    );
  }
}
