import { NextRequest, NextResponse } from 'next/server';
import { initDb, analyses, repositories, codeFindings, analysisMessages } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await initDb();

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id))
      .limit(1);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, analysis.repositoryId))
      .limit(1);

    // Parse filters
    const searchParams = req.nextUrl.searchParams;
    const severityFilter = searchParams.get('severity');
    const fileFilter = searchParams.get('file');

    const conditions = [eq(codeFindings.analysisId, analysis.id)];
    if (severityFilter && severityFilter !== 'all') {
      conditions.push(eq(codeFindings.severity, severityFilter as any));
    }
    if (fileFilter && fileFilter !== 'all') {
      conditions.push(eq(codeFindings.filePath, fileFilter));
    }

    const findings = await db
      .select()
      .from(codeFindings)
      .where(and(...conditions));

    const messages = await db
      .select()
      .from(analysisMessages)
      .where(eq(analysisMessages.analysisId, analysis.id))
      .orderBy(analysisMessages.createdAt);

    return NextResponse.json({
      analysis,
      repository: repo,
      findings,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await initDb();

    await db.delete(analyses).where(eq(analyses.id, id));

    return NextResponse.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete analysis' },
      { status: 500 }
    );
  }
}
