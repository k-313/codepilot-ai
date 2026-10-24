'use client';

import React from 'react';
import {
  GitBranch,
  Star,
  GitFork,
  AlertCircle,
  FileCode,
  HardDrive,
  ExternalLink,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

interface RepoOverviewProps {
  repository: any;
  analysis: any;
  onRunAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  filterStats?: any;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Default: '#8b5cf6',
};

export function RepoOverview({
  repository,
  analysis,
  onRunAnalysis,
  isAnalyzing,
  filterStats,
}: RepoOverviewProps) {
  if (!repository) return null;

  const languages = (repository.languages as Record<string, number>) || {};
  const totalLangBytes = Object.values(languages).reduce((a, b) => a + b, 0);

  const langList = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalLangBytes > 0 ? Math.round((bytes / totalLangBytes) * 100) : 0,
      color: LANGUAGE_COLORS[name] || LANGUAGE_COLORS.Default,
    }));

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#121215] p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Repo title & description */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{repository.owner}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-violet-400">{repository.name}</span>
            </h1>

            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
              <GitBranch className="h-3 w-3 text-zinc-400" />
              {repository.defaultBranch || 'main'}
            </span>

            {analysis?.status === 'completed' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Reviewed
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {repository.description || 'Public repository imported for automated static analysis.'}
          </p>
        </div>

        {/* Action Button: Run Full Review */}
        <div className="flex items-center gap-3">
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </a>

          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Auditing Codebase...</span>
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4 text-violet-200" />
                <span>{analysis ? 'Re-Run AI Code Review' : 'Run Full AI Code Review'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-semibold text-zinc-200">{repository.starCount?.toLocaleString() || 0}</span>
          <span className="text-zinc-500">stars</span>
        </div>

        <div className="flex items-center gap-1.5">
          <GitFork className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">{repository.forkCount?.toLocaleString() || 0}</span>
          <span className="text-zinc-500">forks</span>
        </div>

        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">{repository.openIssuesCount?.toLocaleString() || 0}</span>
          <span className="text-zinc-500">issues</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FileCode className="h-3.5 w-3.5 text-violet-400" />
          <span className="font-semibold text-zinc-200">{repository.fileCount || 0}</span>
          <span className="text-zinc-500">eligible files</span>
        </div>

        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">{formatSize(repository.totalSizeBytes || 0)}</span>
          <span className="text-zinc-500">scanned code</span>
        </div>

        {analysis && (
          <div className="flex items-center gap-1.5 ml-auto">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span className="font-semibold text-rose-400">{analysis.findingsCount || 0}</span>
            <span className="text-zinc-500">findings flagged</span>
          </div>
        )}
      </div>

      {/* Language Breakdown Bar */}
      {langList.length > 0 && (
        <div className="mt-3.5 space-y-1.5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            {langList.map((lang) => (
              <div
                key={lang.name}
                style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                className="h-full transition-all duration-300"
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-zinc-400">
            {langList.map((lang) => (
              <div key={lang.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="font-medium text-zinc-300">{lang.name}</span>
                <span className="text-zinc-500">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
