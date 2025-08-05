import React from "react";
import { DirectoryTree } from "./DirectoryTree";
import { FSNode } from "../fs";

interface TreePanelProps {
  fileSystem: FSNode;
  cwd: string;
  setCwd: (path: string) => void;
  setHoveredPath: (path: string | null) => void;
  expanded: Set<string>;
  toggleExpand: (path: string) => void;
  collapseAll: () => void;
  showHiddenInTree: boolean;
  setShowHiddenInTree: (v: boolean) => void;
}

export const TreePanel: React.FC<TreePanelProps> = ({
  fileSystem,
  cwd,
  setCwd,
  setHoveredPath,
  expanded,
  toggleExpand,
  collapseAll,
  showHiddenInTree,
  setShowHiddenInTree,
}) => (
  <div className="left">
    <div className="tree-controls" style={{ marginBottom: 8 }}>
      <button
        onClick={() => setShowHiddenInTree(!showHiddenInTree)}
        aria-pressed={showHiddenInTree}
        aria-label={showHiddenInTree ? "Hide hidden files" : "Show hidden files"}
        style={{ marginRight: 12 }}
      >
        {showHiddenInTree ? "Hide hidden files" : "Show hidden files"}
      </button>
      <button
        style={{ marginLeft: 12 }}
        onClick={collapseAll}
        aria-label="Collapse all folders"
      >
        Collapse all folders
      </button>
    </div>
    <div className="hint tree-hint">
      <strong>Filesystem Tree Navigation:</strong> The directory tree displays the simulated filesystem, with the highlighted folder representing your current working directory (CWD) — the same directory shown as the output of the <code>pwd</code> command. Click folder names to change directories or click folder icons to expand and collapse them. Use the buttons above to toggle showing hidden files or collapse all folders.
      <br />
      <br />
      Keyboard navigation: <kbd>←</kbd> to parent, <kbd>→</kbd> to first child directory, <kbd>↑</kbd>/<kbd>↓</kbd> to navigate siblings.
    </div>
    <div className="tree-wrapper">
      <DirectoryTree
        root={fileSystem}
        cwd={cwd}
        setCwd={setCwd}
        setHoveredPath={setHoveredPath}
        expanded={expanded}
        toggleExpand={toggleExpand}
        showHidden={showHiddenInTree}
      />
    </div>
  </div>
);