'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  ChevronRight,
  ChevronDown,
  Search,
  File,
} from 'lucide-react';
import { FileTreeNode } from '@/lib/github/tree-builder';

interface FileExplorerProps {
  tree: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  isLoadingFile?: boolean;
}

function getFileIcon(fileName: string) {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.py':
    case '.go':
    case '.rs':
    case '.java':
      return <FileCode className="h-4 w-4 text-violet-400" />;
    case '.json':
      return <FileJson className="h-4 w-4 text-amber-400" />;
    case '.md':
    case '.txt':
      return <FileText className="h-4 w-4 text-blue-400" />;
    default:
      return <File className="h-4 w-4 text-zinc-400" />;
  }
}

interface TreeItemProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  searchQuery: string;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
  searchQuery,
}: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth === 0 || searchQuery.length > 0);

  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  // Filter check if searching
  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.children &&
      JSON.stringify(node.children).toLowerCase().includes(searchQuery.toLowerCase()));

  if (!matchesSearch) return null;

  return (
    <div>
      <div
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen);
          } else {
            onSelectFile(node.path);
          }
        }}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`flex items-center gap-1.5 py-1.5 pr-3 text-xs cursor-pointer rounded-md transition-colors ${
          isSelected
            ? 'bg-violet-600/20 text-violet-300 font-medium border-l-2 border-violet-500'
            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
        }`}
      >
        {isFolder ? (
          <>
            <span className="text-zinc-500">
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-amber-400/80" />
            ) : (
              <Folder className="h-4 w-4 text-amber-400/80" />
            )}
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
            {node.size ? (
              <span className="ml-auto text-[10px] text-zinc-600">
                {Math.round(node.size / 1024) > 0
                  ? `${Math.round(node.size / 1024)}K`
                  : `${node.size}B`}
              </span>
            ) : null}
          </>
        )}
      </div>

      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  tree,
  selectedPath,
  onSelectFile,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215]">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
          Explorer
        </span>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-zinc-800/70">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 py-1.5 pl-8 pr-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500">
            No source files available. Import a repository to explore files.
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
