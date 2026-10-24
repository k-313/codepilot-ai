'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Bug,
  Zap,
  Wrench,
  Download,
  Filter,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';

interface FindingsPanelProps {
  findings: any[];
  analysisId?: string;
  onSelectFileAndLine?: (filePath: string, line?: number) => void;
  onExportReport?: () => void;
  isExporting?: boolean;
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  critical: {
    label: 'Critical',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: ShieldAlert,
  },
  high: {
    label: 'High',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Bug,
  },
  low: {
    label: 'Low',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: Zap,
  },
  info: {
    label: 'Info',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    icon: Info,
  },
};

export function FindingsPanel({
  findings,
  analysisId,
  onSelectFileAndLine,
  onExportReport,
  isExporting,
}: FindingsPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string>('all');

  const filesWithFindings = Array.from(
    new Set(findings.map((f) => f.filePath))
  ).sort();

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (selectedFile !== 'all' && f.filePath !== selectedFile) return false;
    return true;
  });

  const counts = {
    all: findings.length,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-3.5 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Code Review Findings
          </h2>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">
            {findings.length}
          </span>
        </div>

        {onExportReport && (
          <button
            onClick={onExportReport}
            disabled={findings.length === 0 || isExporting}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-violet-400" />
            <span>Export Report (.md)</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 p-2.5 bg-zinc-950/40 text-xs">
        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map(
            (sev) => {
              const count = counts[sev];
              const isSelected = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                    isSelected
                      ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="capitalize">{sev}</span>
                  <span
                    className={`rounded-full px-1 text-[10px] ${
                      sev === 'critical' && count > 0
                        ? 'bg-rose-500/20 text-rose-400 font-bold'
                        : sev === 'high' && count > 0
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* File Dropdown Filter */}
        {filesWithFindings.length > 1 && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Filter className="h-3 w-3 text-zinc-500" />
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All Files ({filesWithFindings.length})</option>
              {filesWithFindings.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500/60 mb-2" />
            <p className="text-xs font-medium text-zinc-300">
              {findings.length === 0
                ? 'No issues detected yet. Run the code review to analyze the repository.'
                : 'No findings match the active filters.'}
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const config =
              SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
            const SeverityIcon = config.icon;

            return (
              <div
                key={finding.id || finding.title}
                className="rounded-lg border border-zinc-800/90 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700"
              >
                {/* Header: Severity, Category, Location */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
                    >
                      <SeverityIcon className="h-3 w-3" />
                      {config.label}
                    </span>

                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300 capitalize">
                      {finding.category}
                    </span>

                    <span className="text-[11px] text-zinc-500">
                      Confidence: {finding.confidence}
                    </span>
                  </div>

                  {/* File & Line Link */}
                  <button
                    onClick={() =>
                      onSelectFileAndLine?.(
                        finding.filePath,
                        finding.startLine || undefined
                      )
                    }
                    className="flex items-center gap-1 text-xs font-mono text-violet-400 hover:text-violet-300 hover:underline"
                  >
                    <span>{finding.filePath}</span>
                    {finding.startLine && (
                      <span>
                        :{finding.startLine}
                        {finding.endLine && finding.endLine !== finding.startLine
                          ? `–${finding.endLine}`
                          : ''}
                      </span>
                    )}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="mt-2.5 text-sm font-semibold text-zinc-100">
                  {finding.title}
                </h3>

                {/* Snippet */}
                {finding.snippet && (
                  <div className="mt-2 rounded-md bg-[#09090b] p-2.5 font-mono text-xs text-zinc-300 border border-zinc-800/60 overflow-x-auto">
                    <code>{finding.snippet}</code>
                  </div>
                )}

                {/* Explanation */}
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  {finding.explanation}
                </p>

                {/* Recommended Fix */}
                <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Recommended Fix</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    {finding.recommendedFix}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
