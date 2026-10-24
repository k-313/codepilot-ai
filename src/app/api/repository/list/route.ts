import { NextResponse } from 'next/server';
import { initDb, repositories, analyses } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { db } = await initDb();

    const repoList = await db
      .select()
      .from(repositories)
      .orderBy(desc(repositories.updatedAt))
      .limit(20);

    const enriched = await Promise.all(
      repoList.map(async (repo: any) => {
        const repoAnalyses = await db
          .select()
          .from(analyses)
          .where(eq(analyses.repositoryId, repo.id))
          .orderBy(desc(analyses.createdAt))
          .limit(1);

        return {
          ...repo,
          latestAnalysis: repoAnalyses[0] || null,
        };
      })
    );

    return NextResponse.json({ repositories: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list repositories' },
      { status: 500 }
    );
  }
}
