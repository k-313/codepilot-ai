import { initDb, repositories, analyses, codeFindings, analysisMessages } from './index';

export async function seed() {
  console.log('[Seed] Initializing database...');
  const { db } = await initDb();

  console.log('[Seed] Inserting sample portfolio repository...');
  const [repo] = await db
    .insert(repositories)
    .values({
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      url: 'https://github.com/facebook/react',
      defaultBranch: 'main',
      description: 'The library for web and native user interfaces.',
      languages: { JavaScript: 1420000, TypeScript: 280000, HTML: 12000 },
      starCount: 228000,
      forkCount: 46000,
      openIssuesCount: 920,
      fileCount: 48,
      totalSizeBytes: 380000,
    })
    .onConflictDoNothing()
    .returning();

  if (repo) {
    console.log('[Seed] Inserting baseline analysis...');
    const [analysis] = await db
      .insert(analyses)
      .values({
        repositoryId: repo.id,
        status: 'completed',
        summary:
          'Comprehensive architectural analysis of React core runtime and component reconciliation scheduler.',
        architectureOverview:
          'React uses a fiber architecture based on incremental reconciliation, double buffering, and cooperative work scheduling.',
        importantDependencies: ['scheduler', 'react-dom'],
        selectedFiles: ['packages/react/src/React.js', 'packages/react-reconciler/src/ReactFiber.js'],
        totalFilesScanned: 24,
        findingsCount: 2,
        durationMs: 1420,
      })
      .returning();

    if (analysis) {
      await db.insert(codeFindings).values([
        {
          analysisId: analysis.id,
          title: 'Ensure Strict Fiber Re-entrancy Invariant Checks',
          severity: 'low',
          category: 'maintainability',
          filePath: 'packages/react-reconciler/src/ReactFiber.js',
          startLine: 142,
          endLine: 150,
          explanation:
            'Fiber work loop assumptions must maintain strict invariants during suspense interruption.',
          recommendedFix:
            'Verify lanes priority queue before resuming suspended fiber work units.',
          confidence: 'high',
        },
      ]);
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
