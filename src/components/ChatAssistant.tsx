'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  User,
  Bot,
  FileCode,
  ShieldCheck,
  HelpCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextFiles?: Array<{ path: string; startLine?: number; endLine?: number }>;
  isEvidence?: boolean;
}

interface ChatAssistantProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  activeFilePath?: string | null;
  onSelectFile?: (path: string) => void;
}

const SAMPLE_PROMPTS = [
  'Summarize the core architecture and primary entrypoints.',
  'How is authentication implemented in this repository?',
  'Are there potential SQL injection or input sanitization risks?',
  'What external libraries and frameworks does this codebase rely on?',
];

export function ChatAssistant({
  messages,
  onSendMessage,
  isLoading,
  activeFilePath,
  onSelectFile,
}: ChatAssistantProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    onSendMessage(question);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-3.5 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            AI Codebase Assistant
          </h2>
        </div>
        {activeFilePath && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-zinc-500">Context:</span>
            <span className="font-mono text-violet-300 truncate max-w-[140px]">
              {activeFilePath}
            </span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="h-10 w-10 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Ask CodePilot Anything
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-xs">
              Inquire about system architecture, token flows, database patterns, or function logic.
            </p>

            {/* Quick Prompts */}
            <div className="mt-5 w-full max-w-sm space-y-2">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block text-left">
                Suggested Questions
              </span>
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  disabled={isLoading}
                  className="w-full text-left rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-2.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:bg-zinc-800/80 transition-all disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || i}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-sm shadow-violet-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3.5 ${
                    isUser
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Context Citations */}
                  {!isUser && msg.contextFiles && msg.contextFiles.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                        <FileCode className="h-3 w-3 text-violet-400" />
                        <span>Referenced Files:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.contextFiles.map((f, idx) => (
                          <button
                            key={idx}
                            onClick={() => onSelectFile?.(f.path)}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-violet-300 hover:bg-zinc-700 transition-colors"
                          >
                            <span>{f.path}</span>
                            {f.startLine && <span>:{f.startLine}</span>}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence vs Assumption Tag */}
                  {!isUser && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] text-zinc-500">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>Grounded in repository source text</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-7 w-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
              <span>Analyzing repository content...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 p-3 bg-zinc-900/60 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this repository..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-zinc-800 bg-[#09090b] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-500 transition-colors disabled:opacity-40"
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
