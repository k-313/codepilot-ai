export interface FileTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size?: number;
  sha?: string;
  children?: FileTreeNode[];
}

export function buildFileTree(
  files: Array<{ path: string; size?: number; sha?: string }>
): FileTreeNode[] {
  const root: FileTreeNode = {
    name: '',
    path: '',
    type: 'folder',
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          size: isFile ? file.size : undefined,
          sha: isFile ? file.sha : undefined,
          children: isFile ? undefined : [],
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort nodes: folders first, then alphabetical
  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  }

  if (root.children) {
    sortNodes(root.children);
    return root.children;
  }

  return [];
}
