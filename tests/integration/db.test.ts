import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, repositories, analyses, analysisMessages, codeFindings } from '@/lib/db';
import { eq } from 'drizzle-orm';

describe('Database Schema & Persistence (PostgreSQL / PGlite)', () => {
  let db: any;

  beforeAll(async () => {
    const initialized = await initDb();
    db = initialized.db;
  });

  it('inserts and retrieves a repository record', async () => {
    const testRepo = {
      owner: 'testowner',
      name: 'testrepo',
      fullName: 'testowner/testrepo-' + Date.now(),
      url: 'https://github.com/testowner/testrepo',
      defaultBranch: 'main',
      description: 'A test repository',
      languages: { TypeScript: 12000, JavaScript: 3000 },
      starCount: 42,
      forkCount: 5,
      openIssuesCount: 2,
      fileCount: 15,
      totalSizeBytes: 45000,
    };

    const [inserted] = await db.insert(repositories).values(testRepo).returning();
    expect(inserted).toBeDefined();
    expect(inserted.id).toBeDefined();
    expect(inserted.fullName).toBe(testRepo.fullName);

    const [fetched] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, inserted.id));
    expect(fetched).toBeDefined();
    expect(fetched.owner).toBe('testowner');
    expect(fetched.starCount).toBe(42);
  });

  it('inserts an analysis linked to a repository with status lifecycle', async () => {
    const [repo] = await db
      .insert(repositories)
      .values({
        owner: 'acme',
        name: 'rocket',
        fullName: 'acme/rocket-' + Date.now(),
        url: 'https://github.com/acme/rocket',
        defaultBranch: 'main',
      })
      .returning();

    const [analysis] = await db
      .insert(analyses)
      .values({
        repositoryId: repo.id,
        status: 'pending',
        selectedFiles: ['src/index.ts', 'src/utils.ts'],
        totalFilesScanned: 2,
      })
      .returning();

    expect(analysis.id).toBeDefined();
    expect(analysis.status).toBe('pending');

    // Update status to completed
    const [updated] = await db
      .update(analyses)
      .set({
        status: 'completed',
        summary: 'Analyzed 2 files. No critical issues.',
        durationMs: 1250,
        findingsCount: 1,
      })
      .where(eq(analyses.id, analysis.id))
      .returning();

    expect(updated.status).toBe('completed');
    expect(updated.durationMs).toBe(1250);
  });

  it('inserts code review findings with severity, line numbers, and confidence', async () => {
    const [repo] = await db
      .insert(repositories)
      .values({
        owner: 'security',
        name: 'scanner',
        fullName: 'security/scanner-' + Date.now(),
        url: 'https://github.com/security/scanner',
      })
      .returning();

    const [analysis] = await db
      .insert(analyses)
      .values({
        repositoryId: repo.id,
        status: 'completed',
      })
      .returning();

    const [finding] = await db
      .insert(codeFindings)
      .values({
        analysisId: analysis.id,
        title: 'Potential Unescaped Query String in Dynamic Route',
        severity: 'high',
        category: 'security',
        filePath: 'src/app/api/search/route.ts',
        startLine: 14,
        endLine: 18,
        snippet: 'const query = req.nextUrl.searchParams.get("q");',
        explanation: 'Untrusted query parameter is concatenated directly.',
        recommendedFix: 'Use parameterized input validation with Zod.',
        confidence: 'high',
      })
      .returning();

    expect(finding.id).toBeDefined();
    expect(finding.severity).toBe('high');
    expect(finding.category).toBe('security');

    // Filter findings by severity
    const results = await db
      .select()
      .from(codeFindings)
      .where(eq(codeFindings.severity, 'high'));

    expect(results.some((f: any) => f.id === finding.id)).toBe(true);
  });

  it('cascades delete from repository to analysis, messages, and findings', async () => {
    const [repo] = await db
      .insert(repositories)
      .values({
        owner: 'cascade',
        name: 'demo',
        fullName: 'cascade/demo-' + Date.now(),
        url: 'https://github.com/cascade/demo',
      })
      .returning();

    const [analysis] = await db
      .insert(analyses)
      .values({
        repositoryId: repo.id,
        status: 'completed',
      })
      .returning();

    await db.insert(analysisMessages).values({
      analysisId: analysis.id,
      role: 'user',
      content: 'Explain the main function',
    });

    await db.insert(codeFindings).values({
      analysisId: analysis.id,
      title: 'Missing return type',
      severity: 'low',
      category: 'maintainability',
      filePath: 'src/main.ts',
      explanation: 'No explicit return type.',
      recommendedFix: 'Add return type annotation.',
    });

    // Delete repo
    await db.delete(repositories).where(eq(repositories.id, repo.id));

    // Verify analysis is deleted
    const remainingAnalyses = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, analysis.id));
    expect(remainingAnalyses.length).toBe(0);

    // Verify messages and findings are deleted
    const remainingMessages = await db
      .select()
      .from(analysisMessages)
      .where(eq(analysisMessages.analysisId, analysis.id));
    expect(remainingMessages.length).toBe(0);

    const remainingFindings = await db
      .select()
      .from(codeFindings)
      .where(eq(codeFindings.analysisId, analysis.id));
    expect(remainingFindings.length).toBe(0);
  });
});
