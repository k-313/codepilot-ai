export const MAX_FILE_SIZE_BYTES = 100 * 1024; // 100 KB
export const MAX_TOTAL_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
export const MAX_ELIGIBLE_FILES = 150;

// Directories to ignore completely
export const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  '.next',
  '.turbo',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.nyc_output',
  'vendor',
  'target',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.terraform',
  'tmp',
  'temp',
  'logs',
]);

// Binary / media / font file extensions to ignore
export const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.svg',
  '.webp',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.mp4',
  '.mp3',
  '.wav',
  '.ogg',
  '.webm',
  '.wasm',
  '.pyc',
  '.class',
  '.jar',
  '.war',
  '.sqlite',
  '.db',
  '.iso',
  '.bin',
]);

// Generated, minified, or lock files to ignore
export const IGNORED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'cargo.lock',
  'gemfile.lock',
  'poetry.lock',
  'mix.lock',
  'tsconfig.tsbuildinfo',
]);

export interface GitHubTreeItem {
  path: string;
  mode?: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url?: string;
}

export interface FilterResult {
  eligible: GitHubTreeItem[];
  ignoredCount: number;
  totalSizeBytes: number;
  exceededMaxFiles: boolean;
  exceededMaxSize: boolean;
}

export function isEligibleFile(path: string, size?: number): { eligible: boolean; reason?: string } {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');

  // 1. Check directory exclusion
  for (const segment of segments.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(segment.toLowerCase()) || segment.startsWith('.')) {
      return { eligible: false, reason: `Ignored directory: ${segment}` };
    }
  }

  const fileName = segments[segments.length - 1];
  const lowerFileName = fileName.toLowerCase();

  // 2. Hidden dotfiles (e.g. .DS_Store, .env, .gitignore)
  if (fileName.startsWith('.') && !['.env.example', '.eslintrc', '.prettierrc'].includes(fileName)) {
    return { eligible: false, reason: 'Hidden file' };
  }

  // 3. Exact lockfile and generated file check
  if (IGNORED_FILENAMES.has(lowerFileName)) {
    return { eligible: false, reason: 'Package lock or generated metadata file' };
  }

  // 4. Minified code and source maps
  if (lowerFileName.endsWith('.min.js') || lowerFileName.endsWith('.min.css') || lowerFileName.endsWith('.map')) {
    return { eligible: false, reason: 'Minified bundle or source map' };
  }

  // 5. Binary extensions
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.slice(dotIndex).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      return { eligible: false, reason: `Binary/media extension: ${ext}` };
    }
  }

  // 6. Size check (if size is known in tree metadata)
  if (typeof size === 'number' && size > MAX_FILE_SIZE_BYTES) {
    return { eligible: false, reason: `Exceeds max file size limit (${Math.round(size / 1024)}KB > 100KB)` };
  }

  return { eligible: true };
}

export function filterRepositoryTree(tree: GitHubTreeItem[]): FilterResult {
  const eligible: GitHubTreeItem[] = [];
  let ignoredCount = 0;
  let totalSizeBytes = 0;
  let exceededMaxFiles = false;
  let exceededMaxSize = false;

  for (const item of tree) {
    if (item.type !== 'blob') {
      continue;
    }

    const check = isEligibleFile(item.path, item.size);
    if (!check.eligible) {
      ignoredCount++;
      continue;
    }

    const itemSize = item.size || 0;

    // Check total count constraint
    if (eligible.length >= MAX_ELIGIBLE_FILES) {
      exceededMaxFiles = true;
      ignoredCount++;
      continue;
    }

    // Check total size constraint
    if (totalSizeBytes + itemSize > MAX_TOTAL_SIZE_BYTES) {
      exceededMaxSize = true;
      ignoredCount++;
      continue;
    }

    eligible.push(item);
    totalSizeBytes += itemSize;
  }

  return {
    eligible,
    ignoredCount,
    totalSizeBytes,
    exceededMaxFiles,
    exceededMaxSize,
  };
}
