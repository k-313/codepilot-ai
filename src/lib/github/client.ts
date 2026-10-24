import { filterRepositoryTree, GitHubTreeItem, FilterResult } from './file-filter';
import { buildFileTree, FileTreeNode } from './tree-builder';

const DEFAULT_TIMEOUT_MS = 15000;

export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description: string | null;
  languages: Record<string, number>;
  starCount: number;
  forkCount: number;
  openIssuesCount: number;
}

export interface IngestionResult {
  metadata: RepositoryMetadata;
  filterStats: FilterResult;
  fileTree: FileTreeNode[];
  eligibleFiles: Array<{ path: string; size: number; sha: string }>;
}

export class GitHubApiError extends Error {
  status: number;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;

  constructor(
    message: string,
    status: number = 500,
    rateLimitRemaining?: number,
    rateLimitReset?: Date
  ) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.rateLimitRemaining = rateLimitRemaining;
    this.rateLimitReset = rateLimitReset;
  }
}

export class GitHubClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN?.trim();
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodePilot-AI-Assistant/1.0',
    };

    if (this.token && !this.token.includes('placeholder')) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new GitHubApiError(`Request to GitHub timed out after ${timeoutMs / 1000}s`, 504);
      }
      throw new GitHubApiError(`Network error reaching GitHub: ${err.message}`, 502);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private checkRateLimits(response: Response) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    const rateLimitRemaining = remaining ? parseInt(remaining, 10) : undefined;
    const rateLimitReset = reset ? new Date(parseInt(reset, 10) * 1000) : undefined;

    if (response.status === 403 && rateLimitRemaining === 0) {
      const resetTimeStr = rateLimitReset ? rateLimitReset.toLocaleTimeString() : 'soon';
      throw new GitHubApiError(
        `GitHub API rate limit exceeded. Public rate limit resets at ${resetTimeStr}. Add a GITHUB_TOKEN in settings to increase capacity.`,
        429,
        rateLimitRemaining,
        rateLimitReset
      );
    }

    return { rateLimitRemaining, rateLimitReset };
  }

  async getRepository(owner: string, repo: string): Promise<RepositoryMetadata> {
    // Demo repository offline mode support
    if (owner === 'demo' && repo === 'sample-project') {
      return this.getDemoRepository();
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const response = await this.fetchWithTimeout(url);
    this.checkRateLimits(response);

    if (response.status === 404) {
      throw new GitHubApiError(
        `Repository "${owner}/${repo}" was not found or is private. CodePilot AI currently analyzes public repositories.`,
        404
      );
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API returned error ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();

    // Fetch languages
    const languages = await this.getLanguages(owner, repo);

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      defaultBranch: data.default_branch || 'main',
      description: data.description || null,
      languages,
      starCount: data.stargazers_count || 0,
      forkCount: data.forks_count || 0,
      openIssuesCount: data.open_issues_count || 0,
    };
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    if (owner === 'demo') {
      return { TypeScript: 84000, CSS: 6200, HTML: 3100 };
    }
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;
    try {
      const response = await this.fetchWithTimeout(url, 8000);
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  }

  async getFileTree(owner: string, repo: string, defaultBranch = 'main'): Promise<GitHubTreeItem[]> {
    if (owner === 'demo' && repo === 'sample-project') {
      return this.getDemoTree();
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`;
    const response = await this.fetchWithTimeout(url);
    this.checkRateLimits(response);

    if (!response.ok) {
      throw new GitHubApiError(
        `Failed to fetch repository tree: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return (data.tree || []) as GitHubTreeItem[];
  }

  async getFileContent(owner: string, repo: string, filePath: string, ref = 'main'): Promise<string> {
    if (owner === 'demo' && repo === 'sample-project') {
      return this.getDemoFileContent(filePath);
    }

    // SSRF & path traversal guard
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      throw new GitHubApiError('Invalid file path request', 400);
    }

    const encodedPath = filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
    let response = await this.fetchWithTimeout(url);
    this.checkRateLimits(response);

    // If 404 and ref was 'main' or 'master', try the alternative common branch
    if (response.status === 404 && (ref === 'main' || ref === 'master')) {
      const fallbackRef = ref === 'main' ? 'master' : 'main';
      const fallbackUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(fallbackRef)}`;
      const fallbackRes = await this.fetchWithTimeout(fallbackUrl);
      if (fallbackRes.ok) {
        response = fallbackRes;
      }
    }

    if (!response.ok) {
      throw new GitHubApiError(`Failed to fetch file content for "${filePath}": ${response.statusText}`, response.status);
    }

    const data = await response.json();

    if (data.type !== 'file' || !data.content) {
      throw new GitHubApiError(`Path "${filePath}" is not a readable file`, 400);
    }

    if (data.size > 150 * 1024) {
      throw new GitHubApiError(`File exceeds maximum readable size limit`, 413);
    }

    // GitHub returns base64
    const buffer = Buffer.from(data.content, 'base64');
    return buffer.toString('utf-8');
  }

  async ingestRepository(owner: string, repo: string): Promise<IngestionResult> {
    const metadata = await this.getRepository(owner, repo);
    const rawTree = await this.getFileTree(owner, repo, metadata.defaultBranch);
    const filterStats = filterRepositoryTree(rawTree);

    const eligibleFiles = filterStats.eligible.map((item) => ({
      path: item.path,
      size: item.size || 0,
      sha: item.sha,
    }));

    const fileTree = buildFileTree(eligibleFiles);

    return {
      metadata,
      filterStats,
      fileTree,
      eligibleFiles,
    };
  }

  // --- Safe Demo / Offline Fixtures ---
  private getDemoRepository(): RepositoryMetadata {
    return {
      owner: 'demo',
      name: 'sample-project',
      fullName: 'demo/sample-project',
      url: 'https://github.com/demo/sample-project',
      defaultBranch: 'main',
      description: 'A modern full-stack TypeScript demo application for CodePilot AI portfolio verification.',
      languages: { TypeScript: 92000, CSS: 8000, HTML: 2400 },
      starCount: 128,
      forkCount: 34,
      openIssuesCount: 3,
    };
  }

  private getDemoTree(): GitHubTreeItem[] {
    return [
      { path: 'src/index.ts', type: 'blob', sha: 'sha-index', size: 1240 },
      { path: 'src/auth/jwt.ts', type: 'blob', sha: 'sha-jwt', size: 2150 },
      { path: 'src/auth/roles.ts', type: 'blob', sha: 'sha-roles', size: 980 },
      { path: 'src/api/users.ts', type: 'blob', sha: 'sha-users', size: 3400 },
      { path: 'src/utils/sanitize.ts', type: 'blob', sha: 'sha-sanitize', size: 1800 },
      { path: 'package.json', type: 'blob', sha: 'sha-pkg', size: 850 },
      { path: 'README.md', type: 'blob', sha: 'sha-readme', size: 1540 },
      // Binary files that should be filtered
      { path: 'public/logo.png', type: 'blob', sha: 'sha-png', size: 45000 },
      { path: 'package-lock.json', type: 'blob', sha: 'sha-lock', size: 180000 },
      { path: 'node_modules/express/index.js', type: 'blob', sha: 'sha-dep', size: 500 },
    ];
  }

  private getDemoFileContent(filePath: string): string {
    switch (filePath) {
      case 'src/auth/jwt.ts':
        return `import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'insecure-default-secret';

export function signToken(payload: { userId: string; role: string }): string {
  // Vulnerability: Token does not have expiration time set
  return jwt.sign(payload, SECRET_KEY);
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    // Unsafe: exposes raw error details
    throw new Error('Token verification failed: ' + (err as Error).message);
  }
}
`;
      case 'src/api/users.ts':
        return `import { db } from '../db';

export async function getUserProfile(userId: string) {
  // Potential SQL Injection if string concatenated without parameterized query
  const query = \`SELECT id, username, email, password_hash FROM users WHERE id = '\${userId}'\`;
  const result = await db.raw(query);
  return result[0];
}
`;
      case 'src/utils/sanitize.ts':
        return `export function sanitizeInput(input: string): string {
  // Simple HTML strip regex - susceptible to XSS bypass with nested tags
  return input.replace(/<[^>]*>?/gm, '');
}
`;
      default:
        return `// Source code for ${filePath}\nexport const version = '1.0.0';\n`;
    }
  }
}
