'use client';

import React, { useState } from 'react';
import { X, FlaskConical, Copy, Check, CheckCircle2, Code } from 'lucide-react';

interface UnitTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  filePath: string;
}

export function UnitTestModal({
  isOpen,
  onClose,
  data,
  filePath,
}: UnitTestModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    if (!data.testCode) return;
    navigator.clipboard.writeText(data.testCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Suggested Unit Tests: {filePath}
            </h3>
            {data.framework && (
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20 uppercase">
                {data.framework}
              </span>
            )}
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
          {/* Explanation */}
          {data.explanation && (
            <p className="text-zinc-300 leading-relaxed bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
              {data.explanation}
            </p>
          )}

          {/* Covered Scenarios */}
          {data.coveredScenarios && data.coveredScenarios.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold uppercase tracking-wider text-zinc-400">
                Covered Test Scenarios
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.coveredScenarios.map((sc: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-zinc-900/60 p-2 border border-zinc-800/80 text-zinc-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{sc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Code Block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-violet-400" />
                <span>Runnable Test Code</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg bg-[#09090b] border border-zinc-800 p-4 font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed">
              <pre>{data.testCode}</pre>
            </div>
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
