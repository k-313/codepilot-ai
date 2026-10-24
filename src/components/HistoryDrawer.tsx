'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  GitBranch,
  Star,
  FileCode,
  ShieldAlert,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (repo: any) => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  onSelectRepo,
}: HistoryDrawerProps) {
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/repository/list');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repositories || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md h-full border-l border-zinc-800 bg-[#121215] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Analysis History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-500 text-xs">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <span>Loading saved repositories...</span>
            </div>
          ) : repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-zinc-500">
              <p>No repository analysis history found in database.</p>
              <p className="mt-1 text-zinc-600">Import a repository to start analyzing.</p>
            </div>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => {
                  onSelectRepo(repo);
                  onClose();
                }}
                className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 transition-all hover:border-violet-500/50 hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-violet-400 transition-colors">
                    {repo.fullName}
                  </h4>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">
                  {repo.description || 'Public repository.'}
                </p>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400" />
                    {repo.starCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCode className="h-3 w-3 text-violet-400" />
                    {repo.fileCount || 0} files
                  </span>
                  {repo.latestAnalysis && (
                    <span className="flex items-center gap-1 ml-auto text-rose-400">
                      <ShieldAlert className="h-3 w-3" />
                      {repo.latestAnalysis.findingsCount || 0} findings
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
