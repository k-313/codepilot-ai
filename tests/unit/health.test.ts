import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health Check API Endpoint', () => {
  it('returns a healthy status response with expected metadata', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('codepilot-ai');
    expect(body.version).toBe('1.0.0');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.features).toBeDefined();
  });
});
