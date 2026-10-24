'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { RepoOverview } from '@/components/RepoOverview';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeViewer } from '@/components/CodeViewer';
import { FindingsPanel } from '@/components/FindingsPanel';
import { ChatAssistant } from '@/components/ChatAssistant';
import { ArchitectureTab } from '@/components/ArchitectureTab';
import { ExplanationModal } from '@/components/ExplanationModal';
import { UnitTestModal } from '@/components/UnitTestModal';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import {
  ShieldAlert,
  MessageSquare,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Terminal,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { FileTreeNode } from '@/lib/github/tree-builder';

export default function CodePilotApp() {
  const [repository, setRepository] = useState<any>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [eligibleFiles, setEligibleFiles] = useState<any[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'findings' | 'chat' | 'architecture'>('findings');
  const [activeProvider, setActiveProvider] = useState<string>('gemini');

  // Loading states
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modals & Drawers
  const [historyOpen, setHistoryOpen] = useState(false);
  const [explanationData, setExplanationData] = useState<{
    open: boolean;
    data: any;
    filePath: string;
  }>({ open: false, data: null, filePath: '' });
  const [unitTestData, setUnitTestData] = useState<{
    open: boolean;
    data: any;
    filePath: string;
  }>({ open: false, data: null, filePath: '' });

  // Error notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check health and initial provider
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.features?.aiProvider) {
          setActiveProvider(data.features.aiProvider);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Import Repository Handler
  const handleImportRepo = async (url: string) => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/repository/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import repository');
      }

      setRepository(data.repository);
      setFileTree(data.fileTree || []);
      setEligibleFiles(data.eligibleFiles || []);

      // Reset state for new repo
      setAnalysis(null);
      setFindings([]);
      setMessages([]);

      // Auto-select first source file
      if (data.eligibleFiles && data.eligibleFiles.length > 0) {
        const firstFile = data.eligibleFiles[0].path;
        handleSelectFile(firstFile, data.repository);
      } else {
        setSelectedPath(null);
        setFileContent(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error importing repository');
    } finally {
      setIsImporting(false);
    }
  };

  // 2. Select and Load File Content
  const handleSelectFile = async (path: string, repoOverride?: any) => {
    const targetRepo = repoOverride || repository;
    if (!targetRepo) return;

    setSelectedPath(path);
    setIsLoadingFile(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        owner: targetRepo.owner,
        repo: targetRepo.name,
        path,
        ref: targetRepo.defaultBranch || 'main',
      });

      const res = await fetch(`/api/repository/files?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch file content');
      }

      setFileContent(data.content);
    } catch (err: any) {
      setErrorMessage(`Failed to load file "${path}": ${err.message}`);
      setFileContent(`// Error loading file: ${err.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // 3. Run AI Code Review
  const handleRunAnalysis = async () => {
    if (!repository) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repository.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Code review analysis failed');
      }

      setAnalysis(data.analysis);
      setFindings(data.findings || []);
      setActiveTab('findings');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error running analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. Code Explanation
  const handleExplainCode = async (filePath: string, code: string) => {
    setIsExplaining(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analysis/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to explain code');
      }

      setExplanationData({
        open: true,
        data: data.explanation,
        filePath,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating explanation');
    } finally {
      setIsExplaining(false);
    }
  };

  // 5. Unit Test Generation
  const handleGenerateTests = async (filePath: string, code: string) => {
    setIsGeneratingTests(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analysis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate unit tests');
      }

      setUnitTestData({
        open: true,
        data: data.unitTests,
        filePath,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating unit tests');
    } finally {
      setIsGeneratingTests(false);
    }
  };

  // 6. Send Q&A Message
  const handleSendMessage = async (question: string) => {
    if (!analysis) {
      // If analysis not run yet, prompt user or run quick check
      setErrorMessage('Please run the AI Code Review first to initialize the analysis context.');
      return;
    }

    const optimisticUserMsg = {
      role: 'user' as const,
      content: question,
      contextFiles: selectedPath ? [{ path: selectedPath }] : [],
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          question,
          activeFilePath: selectedPath || undefined,
          activeFileContent: fileContent || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to answer question');
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        data.userMessage,
        data.assistantMessage,
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to get answer from AI assistant');
    }
  };

  // 7. Export Markdown Report
  const handleExportReport = async () => {
    if (!analysis?.id) return;
    setIsExporting(true);
    try {
      window.open(`/api/analysis/${analysis.id}/export`, '_blank');
    } catch (err: any) {
      setErrorMessage('Failed to trigger report export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* Navbar */}
      <Navbar
        onImportRepo={handleImportRepo}
        onLoadDemo={() => handleImportRepo('https://github.com/demo/sample-project')}
        onOpenHistory={() => setHistoryOpen(true)}
        isLoading={isImporting}
        activeProvider={activeProvider}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full gap-5">
        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="rounded p-1 hover:bg-rose-500/20 text-rose-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Empty State / Welcome Screen */}
        {!repository ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-[#121215] p-8 text-center my-auto min-h-[500px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-500/20 mb-5">
              <Terminal className="h-8 w-8" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white">
              Inspect, Audit & Understand Any GitHub Codebase
            </h2>

            <p className="mt-2 text-xs text-zinc-400 max-w-lg leading-relaxed">
              CodePilot AI safely ingests public GitHub repositories, performs static and AI-assisted security reviews, highlights vulnerabilities with exact lines, generates unit tests, and answers architectural questions.
            </p>

            {/* Quick action buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleImportRepo('https://github.com/demo/sample-project')}
                disabled={isImporting}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Try Built-in Demo Project</span>
              </button>

              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <span>View Recent Repositories</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Feature highlights */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl text-left border-t border-zinc-800/80 pt-8">
              <div className="p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs mb-1">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Security & Bug Review</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Identifies SQL injection, insecure token generation, unhandled exceptions, and maintainability smells with recommended fixes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span>Unit Test Generation</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Generates ready-to-run unit tests covering happy paths, boundary conditions, and mock setups for selected functions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>Grounded Q&A Chat</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Answers codebase questions citing source files and line ranges while distinguishing verified code facts from assumptions.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 flex-1">
            {/* Repository Overview Header */}
            <RepoOverview
              repository={repository}
              analysis={analysis}
              onRunAnalysis={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
            />

            {/* Split Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[580px]">
              {/* Left Column: File Explorer (3 cols) */}
              <div className="lg:col-span-3 h-[420px] lg:h-full">
                <FileExplorer
                  tree={fileTree}
                  selectedPath={selectedPath}
                  onSelectFile={handleSelectFile}
                  isLoadingFile={isLoadingFile}
                />
              </div>

              {/* Middle Column: Code Viewer (4 cols) */}
              <div className="lg:col-span-4 h-[420px] lg:h-full">
                <CodeViewer
                  filePath={selectedPath}
                  content={fileContent}
                  isLoading={isLoadingFile}
                  onExplainCode={handleExplainCode}
                  onGenerateTests={handleGenerateTests}
                  isExplaining={isExplaining}
                  isGeneratingTests={isGeneratingTests}
                />
              </div>

              {/* Right Column: Findings, Assistant & Architecture (5 cols) */}
              <div className="lg:col-span-5 flex flex-col h-[520px] lg:h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-zinc-800 bg-zinc-900/70 p-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setActiveTab('findings')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'findings'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                    <span>Findings</span>
                    {findings.length > 0 && (
                      <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-300">
                        {findings.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'chat'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                    <span>AI Assistant</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('architecture')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'architecture'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    <span>Architecture</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden p-0">
                  {activeTab === 'findings' && (
                    <FindingsPanel
                      findings={findings}
                      analysisId={analysis?.id}
                      onSelectFileAndLine={(path) => handleSelectFile(path)}
                      onExportReport={handleExportReport}
                      isExporting={isExporting}
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatAssistant
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={false}
                      activeFilePath={selectedPath}
                      onSelectFile={handleSelectFile}
                    />
                  )}

                  {activeTab === 'architecture' && (
                    <ArchitectureTab analysis={analysis} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#09090b] py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CodePilot AI — Autonomous Code Review & Developer Assistant</span>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Powered by Next.js, PostgreSQL, Drizzle ORM & Multi-LLM Adapter</span>
          </div>
        </div>
      </footer>

      {/* Explanation Modal */}
      <ExplanationModal
        isOpen={explanationData.open}
        onClose={() => setExplanationData((prev) => ({ ...prev, open: false }))}
        data={explanationData.data}
        filePath={explanationData.filePath}
      />

      {/* Unit Test Modal */}
      <UnitTestModal
        isOpen={unitTestData.open}
        onClose={() => setUnitTestData((prev) => ({ ...prev, open: false }))}
        data={unitTestData.data}
        filePath={unitTestData.filePath}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectRepo={(repo) => {
          setRepository(repo);
          handleImportRepo(repo.url);
        }}
      />
    </div>
  );
}
