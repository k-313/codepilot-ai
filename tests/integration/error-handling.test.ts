import { describe, it, expect } from 'vitest';
import { POST as importRepo } from '@/app/api/repository/import/route';
import { POST as startAnalysis } from '@/app/api/analysis/start/route';
import { GET as getAnalysis } from '@/app/api/analysis/[id]/route';
import { POST as chatRoute } from '@/app/api/analysis/chat/route';
import { NextRequest } from 'next/server';

describe('API Robustness & Error Handling', () => {
  it('returns 400 for empty or invalid import requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/repository/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await importRepo(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when importing an invalid or malicious URL', async () => {
    const req = new NextRequest('http://localhost:3000/api/repository/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://localhost:8080/evil/repo' }),
    });

    const res = await importRepo(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 404 when starting analysis on a non-existent repository', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest('http://localhost:3000/api/analysis/start', {
      method: 'POST',
      body: JSON.stringify({ repositoryId: nonExistentUuid }),
    });

    const res = await startAnalysis(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain('Repository not found');
  });

  it('returns 404 when querying an invalid analysis ID', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest(`http://localhost:3000/api/analysis/${nonExistentUuid}`, {
      method: 'GET',
    });

    const res = await getAnalysis(req, {
      params: Promise.resolve({ id: nonExistentUuid }),
    });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain('Analysis not found');
  });

  it('returns 400 when sending an empty chat question', async () => {
    const req = new NextRequest('http://localhost:3000/api/analysis/chat', {
      method: 'POST',
      body: JSON.stringify({
        analysisId: '00000000-0000-0000-0000-000000000000',
        question: '   ',
      }),
    });

    const res = await chatRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
