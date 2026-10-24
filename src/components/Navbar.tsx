'use client';

import React, { useState } from 'react';
import { Terminal, Sparkles, History, ArrowRight, Loader2, Play } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';

interface NavbarProps {
  onImportRepo: (url: string) => Promise<void>;
  onLoadDemo: () => Promise<void>;
  onOpenHistory: () => void;
  isLoading: boolean;
  activeProvider: string;
}

export function Navbar({
  onImportRepo,
  onLoadDemo,
  onOpenHistory,
  isLoading,
  activeProvider,
}: NavbarProps) {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isLoading) return;
    onImportRepo(urlInput.trim());
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/20">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">CodePilot</span>
              <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20">
                AI
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Codebase Review & Security Auditor</p>
          </div>
        </div>

        {/* Repository Input Bar */}
        <form onSubmit={handleSubmit} className="hidden md:flex flex-1 max-w-lg mx-6 items-center">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <GithubIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. https://github.com/facebook/react or owner/repo"
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-9 pr-24 text-xs text-zinc-100 placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="absolute right-1 top-1 bottom-1 flex items-center gap-1 rounded-md bg-violet-600 px-3 text-xs font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Import</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Actions & Provider Badge */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Button */}
          <button
            onClick={onLoadDemo}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500/50"
            title="Load built-in full-stack demo repository"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">Try Demo Repo</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            title="View Analysis History"
          >
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Active Provider Pill */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{activeProvider} Engine</span>
          </div>
        </div>
      </div>

      {/* Mobile Input Bar */}
      <div className="md:hidden border-t border-zinc-800/80 px-4 py-2 bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="GitHub URL (e.g. owner/repo)"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Import
          </button>
        </form>
      </div>
    </header>
  );
}
