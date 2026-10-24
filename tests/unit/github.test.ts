import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from '@/lib/github/url-parser';
import { isEligibleFile, filterRepositoryTree } from '@/lib/github/file-filter';
import { buildFileTree } from '@/lib/github/tree-builder';
import { GitHubClient } from '@/lib/github/client';

describe('GitHub URL Parser & Security Validation', () => {
  it('parses valid HTTPS GitHub URLs', () => {
    const result1 = parseGitHubUrl('https://github.com/facebook/react');
    expect(result1.owner).toBe('facebook');
    expect(result1.repo).toBe('react');

    const result2 = parseGitHubUrl('https://github.com/vercel/next.js.git');
    expect(result2.owner).toBe('vercel');
    expect(result2.repo).toBe('next.js');

    const result3 = parseGitHubUrl('github.com/drizzle-team/drizzle-orm');
    expect(result3.owner).toBe('drizzle-team');
    expect(result3.repo).toBe('drizzle-orm');
  });

  it('rejects SSRF attempts, internal hosts, and IP addresses', () => {
    expect(() => parseGitHubUrl('http://127.0.0.1/owner/repo')).toThrow();
    expect(() => parseGitHubUrl('http://localhost:3000/owner/repo')).toThrow();
    expect(() => parseGitHubUrl('https://attacker.com/malicious/repo')).toThrow();
    expect(() => parseGitHubUrl('https://github.com/../../etc/passwd')).toThrow();
    expect(() => parseGitHubUrl('https://user:pass@github.com/owner/repo')).toThrow();
  });

  it('rejects invalid or non-alphanumeric repository names', () => {
    expect(() => parseGitHubUrl('https://github.com/-invalid-owner/repo')).toThrow();
    expect(() => parseGitHubUrl('https://github.com/owner')).toThrow();
  });
});

describe('Repository File Filter & Boundaries', () => {
  it('identifies eligible source code files correctly', () => {
    expect(isEligibleFile('src/index.ts').eligible).toBe(true);
    expect(isEligibleFile('components/Button.tsx').eligible).toBe(true);
    expect(isEligibleFile('lib/utils.py').eligible).toBe(true);
    expect(isEligibleFile('README.md').eligible).toBe(true);
  });

  it('filters out binary, media, and archive files', () => {
    expect(isEligibleFile('assets/logo.png').eligible).toBe(false);
    expect(isEligibleFile('docs/manual.pdf').eligible).toBe(false);
    expect(isEligibleFile('dist/bundle.wasm').eligible).toBe(false);
    expect(isEligibleFile('archive.zip').eligible).toBe(false);
  });

  it('filters out generated folders, dependencies, and lockfiles', () => {
    expect(isEligibleFile('node_modules/express/index.js').eligible).toBe(false);
    expect(isEligibleFile('.next/static/chunks/main.js').eligible).toBe(false);
    expect(isEligibleFile('dist/app.js').eligible).toBe(false);
    expect(isEligibleFile('package-lock.json').eligible).toBe(false);
    expect(isEligibleFile('yarn.lock').eligible).toBe(false);
    expect(isEligibleFile('bundle.min.js').eligible).toBe(false);
  });

  it('enforces maximum file size limit', () => {
    // 150 KB > 100 KB limit
    expect(isEligibleFile('huge-file.json', 150 * 1024).eligible).toBe(false);
    // 50 KB <= 100 KB limit
    expect(isEligibleFile('small-file.json', 50 * 1024).eligible).toBe(true);
  });

  it('filters and aggregates repository tree items properly', () => {
    const rawTree = [
      { path: 'src/main.ts', type: 'blob' as const, sha: '1', size: 1000 },
      { path: 'src/logo.png', type: 'blob' as const, sha: '2', size: 50000 },
      { path: 'node_modules/pkg/index.js', type: 'blob' as const, sha: '3', size: 200 },
      { path: 'README.md', type: 'blob' as const, sha: '4', size: 800 },
    ];

    const result = filterRepositoryTree(rawTree);
    expect(result.eligible.length).toBe(2);
    expect(result.ignoredCount).toBe(2);
    expect(result.totalSizeBytes).toBe(1800);
  });
});

describe('File Tree Hierarchy Builder', () => {
  it('converts flat paths into a nested tree with folders first', () => {
    const files = [
      { path: 'src/components/Header.tsx', size: 1200 },
      { path: 'src/index.ts', size: 500 },
      { path: 'package.json', size: 400 },
    ];

    const tree = buildFileTree(files);
    expect(tree.length).toBe(2); // 'src' (folder) and 'package.json' (file)
    expect(tree[0].name).toBe('src');
    expect(tree[0].type).toBe('folder');
    expect(tree[1].name).toBe('package.json');
    expect(tree[1].type).toBe('file');

    const srcChildren = tree[0].children!;
    expect(srcChildren[0].name).toBe('components');
    expect(srcChildren[0].type).toBe('folder');
    expect(srcChildren[1].name).toBe('index.ts');
  });
});

describe('GitHub Client Ingestion (Demo / Fixture Mode)', () => {
  it('safely ingests demo repository without network dependencies', async () => {
    const client = new GitHubClient();
    const result = await client.ingestRepository('demo', 'sample-project');

    expect(result.metadata.fullName).toBe('demo/sample-project');
    expect(result.metadata.defaultBranch).toBe('main');
    expect(result.eligibleFiles.length).toBeGreaterThan(0);
    expect(result.filterStats.ignoredCount).toBeGreaterThan(0); // binary and node_modules ignored

    const content = await client.getFileContent('demo', 'sample-project', 'src/auth/jwt.ts');
    expect(content).toContain('signToken');
  });
});
