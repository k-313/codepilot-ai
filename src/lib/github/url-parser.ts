import { z } from 'zod';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  cleanUrl: string;
}

// GitHub username: 1-39 characters, alphanumeric or single hyphens, cannot start/end with hyphen
const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

// GitHub repo name: 1-100 characters, alphanumeric, hyphen, underscore, period
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

export const gitHubUrlSchema = z
  .string()
  .trim()
  .min(1, 'Repository URL is required')
  .max(500, 'Repository URL is too long')
  .refine(
    (input) => {
      // Defend against SSRF & path traversal: disallow relative paths, IP addresses, credentials, ports
      if (
        input.includes('..') ||
        input.includes('\\') ||
        input.includes('@') ||
        input.includes('localhost') ||
        input.includes('127.0.0.1')
      ) {
        return false;
      }
      return true;
    },
    { message: 'Invalid or restricted repository URL' }
  );

export function parseGitHubUrl(input: string): ParsedGitHubUrl {
  // Validate basic string constraints
  gitHubUrlSchema.parse(input);

  let urlString = input.trim();

  // Normalize: if user pasted owner/repo or github.com/owner/repo without protocol
  if (!/^https?:\/\//i.test(urlString)) {
    if (urlString.startsWith('github.com/')) {
      urlString = `https://${urlString}`;
    } else if (!urlString.includes('/') || urlString.split('/').length !== 2) {
      urlString = `https://github.com/${urlString}`;
    } else {
      urlString = `https://github.com/${urlString}`;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Malformed URL. Please provide a valid GitHub repository URL.');
  }

  // Strict hostname check
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    throw new Error('Only public repositories on github.com are supported.');
  }

  // Strict protocol check
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid URL protocol. Only HTTP/HTTPS are supported.');
  }

  // Defend against port manipulation or credentials in URL
  if (parsed.port && parsed.port !== '443' && parsed.port !== '80') {
    throw new Error('Non-standard ports are not permitted.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Authentication credentials in URL are prohibited.');
  }

  // Path segments: expect /:owner/:repo
  const segments = parsed.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.trim());

  if (segments.length < 2) {
    throw new Error(
      'Invalid GitHub URL path. Format must be https://github.com/owner/repository'
    );
  }

  const owner = segments[0];
  let repo = segments[1];

  // Remove trailing .git if present
  if (repo.toLowerCase().endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Validate owner against regex
  if (!GITHUB_OWNER_REGEX.test(owner)) {
    throw new Error(
      `Invalid repository owner: "${owner}". Must be valid alphanumeric GitHub username/org.`
    );
  }

  // Validate repo name against regex
  if (!GITHUB_REPO_REGEX.test(repo) || repo === '.' || repo === '..') {
    throw new Error(
      `Invalid repository name: "${repo}". Cannot contain path traversal or invalid characters.`
    );
  }

  return {
    owner,
    repo,
    cleanUrl: `https://github.com/${owner}/${repo}`,
  };
}
