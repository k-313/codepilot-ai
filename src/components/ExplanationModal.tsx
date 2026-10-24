'use client';

import React from 'react';
import { X, Sparkles, AlertCircle, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  filePath: string;
}

export function ExplanationModal({
  isOpen,
  onClose,
  data,
  filePath,
}: ExplanationModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              {data.title || `Code Explanation: ${filePath}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Detailed Walkthrough */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-zinc-400">
              Walkthrough
            </span>
            <p className="text-zinc-300 leading-relaxed bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800">
              {data.explanation}
            </p>
          </div>

          {/* Inputs & Outputs */}
          {data.parametersAndOutputs && (
            <div className="space-y-1.5">
              <span className="font-semibold uppercase tracking-wider text-zinc-400">
                Inputs, Returns & Side Effects
              </span>
              <p className="text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                {data.parametersAndOutputs}
              </p>
            </div>
          )}

          {/* Complexity */}
          {data.complexityAndPerformance && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Complexity & Runtime Efficiency</span>
              </div>
              <p className="text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                {data.complexityAndPerformance}
              </p>
            </div>
          )}

          {/* Edge Cases */}
          {data.potentialEdgeCases && data.potentialEdgeCases.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold uppercase tracking-wider text-zinc-400">
                Potential Edge Cases & Failure Modes
              </span>
              <ul className="space-y-1 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                {data.potentialEdgeCases.map((ec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-300">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{ec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence vs Assumptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {data.evidence && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Evidence</span>
                </div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  {data.evidence.map((ev: string, i: number) => (
                    <li key={i}>• {ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.assumptions && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                <div className="flex items-center gap-1.5 font-semibold text-violet-400 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Assumptions</span>
                </div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  {data.assumptions.map((as: string, i: number) => (
                    <li key={i}>• {as}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-zinc-800 p-3 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
