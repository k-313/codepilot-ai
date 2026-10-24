'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Sparkles,
  FlaskConical,
  Copy,
  Check,
  Loader2,
  Code2,
} from 'lucide-react';

interface CodeViewerProps {
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  onExplainCode: (filePath: string, code: string) => void;
  onGenerateTests: (filePath: string, code: string) => void;
  isExplaining?: boolean;
  isGeneratingTests?: boolean;
}

export function CodeViewer({
  filePath,
  content,
  isLoading,
  onExplainCode,
  onGenerateTests,
  isExplaining,
  isGeneratingTests,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full rounded-xl border border-zinc-800 bg-[#121215] p-8 text-center">
        <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
          <Code2 className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-300">No File Selected</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm">
          Select any source file from the repository explorer on the left to inspect its code, generate unit tests, or run AI explanations.
        </p>
      </div>
    );
  }

  const lines = content ? content.split('\n') : [];

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
      {/* File Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {filePath}
          </span>
          {content && (
            <span className="text-[11px] text-zinc-500 shrink-0">
              ({lines.length} lines)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => content && onExplainCode(filePath, content)}
            disabled={!content || isExplaining}
            className="flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-40"
            title="Explain this code with AI"
          >
            {isExplaining ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-violet-400" />
            )}
            <span>Explain</span>
          </button>

          <button
            onClick={() => content && onGenerateTests(filePath, content)}
            disabled={!content || isGeneratingTests}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
            title="Generate unit tests for this file"
          >
            {isGeneratingTests ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FlaskConical className="h-3 w-3 text-emerald-400" />
            )}
            <span>Unit Tests</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
            title="Copy code to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto bg-[#0d0d10] font-mono text-xs text-zinc-300 leading-relaxed">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <span>Fetching file content from GitHub...</span>
          </div>
        ) : (
          <div className="py-3 pr-4 flex">
            {/* Line numbers column */}
            <div className="select-none text-right pr-4 text-zinc-600 shrink-0 font-mono text-[11px] leading-[22px]">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code lines */}
            <div className="flex-1 overflow-x-auto font-mono text-[11px] leading-[22px]">
              {lines.map((line, i) => (
                <div key={i} className="hover:bg-zinc-800/40 px-1 -mx-1 rounded">
                  <pre className="inline">{line || ' '}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
