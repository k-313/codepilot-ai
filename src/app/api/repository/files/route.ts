import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient, GitHubApiError } from '@/lib/github/client';
import { z } from 'zod';

const fileQuerySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  ref: z.string().optional().default('main'),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = {
      owner: searchParams.get('owner') || '',
      repo: searchParams.get('repo') || '',
      path: searchParams.get('path') || '',
      ref: searchParams.get('ref') || 'main',
    };

    const parseResult = fileQuerySchema.safeParse(query);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters (owner, repo, and path are required)' },
        { status: 400 }
      );
    }

    const { owner, repo, path, ref } = parseResult.data;

    const client = new GitHubClient();
    const content = await client.getFileContent(owner, repo, path, ref);
    const lines = content.split('\n').length;
    const size = Buffer.byteLength(content, 'utf8');

    return NextResponse.json({
      path,
      lines,
      size,
      content,
    });
  } catch (error: any) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}
