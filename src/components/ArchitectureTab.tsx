'use client';

import React from 'react';
import { Layers, Package, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface ArchitectureTabProps {
  analysis: any;
}

export function ArchitectureTab({ analysis }: ArchitectureTabProps) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full rounded-xl border border-zinc-800 bg-[#121215] p-8 text-center">
        <Layers className="h-8 w-8 text-zinc-600 mb-2" />
        <h3 className="text-sm font-semibold text-zinc-300">No Architecture Analysis Yet</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm">
          Run the AI Code Review to generate an architectural summary and dependency breakdown.
        </p>
      </div>
    );
  }

  const dependencies = (analysis.importantDependencies as string[]) || [];

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-y-auto p-5 space-y-6">
      {/* Executive Summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
          <FileText className="h-4 w-4" />
          <span>Executive Summary</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 border border-zinc-800 rounded-lg p-3.5">
          {analysis.summary || 'Summary not available.'}
        </p>
      </div>

      {/* Architecture Overview */}
      {analysis.architectureOverview && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Layers className="h-4 w-4" />
            <span>Architecture & Design Patterns</span>
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 border border-zinc-800 rounded-lg p-3.5 whitespace-pre-wrap font-sans">
            {analysis.architectureOverview}
          </div>
        </div>
      )}

      {/* Core Dependencies */}
      {dependencies.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Package className="h-4 w-4" />
            <span>Identified Core Dependencies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dependencies.map((dep, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 font-mono text-xs text-zinc-200"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Evidence & Verification Box */}
      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-indigo-300">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>Evidence Grounding Guarantee</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          All architectural findings and code evaluations are verified against the ingested source tree files ({analysis.totalFilesScanned} files scanned). Unverified assumptions are explicitly separated from verifiable static facts.
        </p>
      </div>
    </div>
  );
}
