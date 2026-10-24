import { NextResponse } from 'next/server';

export async function GET() {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    status: 'healthy',
    service: 'codepilot-ai',
    version: '1.0.0',
    timestamp,
    uptimeSeconds: Math.floor(uptime),
    environment: process.env.NODE_ENV || 'development',
    features: {
      aiProvider: process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'mock'),
      hasGitHubToken: Boolean(process.env.GITHUB_TOKEN),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    },
  });
}
