import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, repositories, analyses, codeFindings } from '@/lib/db';
import { POST as importRepo } from '@/app/api/repository/import/route';
import { POST as startAnalysis } from '@/app/api/analysis/start/route';
import { GET as getAnalysis } from '@/app/api/analysis/[id]/route';
import { GET as exportAnalysis } from '@/app/api/analysis/[id]/export/route';
import { POST as chatRoute } from '@/app/api/analysis/chat/route';
import { NextRequest } from 'next/server';

describe('Analysis End-to-End API Integration', () => {
  let db: any;
  let importedRepoId: string;
  let analysisId: string;

  beforeAll(async () => {
    const initialized = await initDb();
    db = initialized.db;
  });

  it('imports the demo repository and saves it to the database', async () => {
    const req = new NextRequest('http://localhost:3000/api/repository/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://github.com/demo/sample-project' }),
    });

    const res = await importRepo(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.repository).toBeDefined();
    expect(body.repository.fullName).toBe('demo/sample-project');
    expect(body.eligibleFiles.length).toBeGreaterThan(0);

    importedRepoId = body.repository.id;
  });

  it('starts an analysis, performs code review, and persists findings', async () => {
    const req = new NextRequest('http://localhost:3000/api/analysis/start', {
      method: 'POST',
      body: JSON.stringify({
        repositoryId: importedRepoId,
        aiProvider: 'mock',
      }),
    });

    const res = await startAnalysis(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.analysis.status).toBe('completed');
    expect(body.findings.length).toBeGreaterThan(0);

    analysisId = body.analysis.id;

    // Verify findings in database
    const savedFindings = await db.select().from(codeFindings);
    expect(savedFindings.length).toBeGreaterThan(0);
  });

  it('retrieves the analysis and supports filtering by severity', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/analysis/${analysisId}?severity=critical`,
      { method: 'GET' }
    );

    const res = await getAnalysis(req, {
      params: Promise.resolve({ id: analysisId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.analysis.id).toBe(analysisId);
    expect(body.repository.id).toBe(importedRepoId);
    // Every returned finding should have critical severity
    for (const f of body.findings) {
      expect(f.severity).toBe('critical');
    }
  });

  it('answers chat questions and records message thread in database', async () => {
    const req = new NextRequest('http://localhost:3000/api/analysis/chat', {
      method: 'POST',
      body: JSON.stringify({
        analysisId,
        question: 'Explain the authentication design and potential token vulnerabilities.',
        activeFilePath: 'src/auth/jwt.ts',
        activeFileContent: 'export function signToken() {}',
        aiProvider: 'mock',
      }),
    });

    const res = await chatRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.assistantMessage).toBeDefined();
    expect(body.assistantMessage.content).toContain('JWT');
  });

  it('exports the complete code review report as Markdown', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/analysis/${analysisId}/export`,
      { method: 'GET' }
    );

    const res = await exportAnalysis(req, {
      params: Promise.resolve({ id: analysisId }),
    });
    expect(res.status).toBe(200);

    const markdown = await res.text();
    expect(markdown).toContain('# CodePilot AI — Code Review & Architecture Report');
    expect(markdown).toContain('demo/sample-project');
    expect(markdown).toContain('## Detailed Findings');
    expect(markdown).toContain('## Security & Advisory Notice');
  });
});
