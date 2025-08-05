import React, { useRef, useEffect } from "react";
import { FSNode } from "../fs";
import { normalizePath, joinPaths } from "../utils/path";

type Props = {
  root: FSNode;
  cwd: string;
  setCwd: (p: string) => void;
  setHoveredPath: (p: string | null) => void;
  expanded: Set<string>;
  toggleExpand: (p: string) => void;
  showHidden: boolean;
};

type NodeProps = {
  node: FSNode;
  parentPath: string;
  cwd: string;
  setCwd: (p: string) => void;
  setHoveredPath: (p: string | null) => void;
  level: number;
  registerRef: (path: string, el: HTMLDivElement | null) => void;
  expanded: Set<string>;
  toggleExpand: (p: string) => void;
  showHidden: boolean;
};

const TreeNode: React.FC<NodeProps> = ({
  node,
  parentPath,
  cwd,
  setCwd,
  setHoveredPath,
  level,
  registerRef,
  expanded,
  toggleExpand,
  showHidden
}) => {
  const path = joinPaths(parentPath, node.name);
  const isCwd = normalizePath(cwd) === normalizePath(path);
  const hasChildren = node.type === "dir" && node.children && node.children.length > 0;
  const isExpanded = expanded.has(normalizePath(path));

  const refCallback = (el: HTMLDivElement | null) => {
    registerRef(path, el);
  };

  if (node.name.startsWith('.') && !showHidden) {
    return null;
  }

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isCwd}
      style={{ paddingLeft: level * 16, position: "relative" }}
    >
      <div
        ref={refCallback}
        className={`node-row ${isCwd ? "cwd" : ""}`}
        onMouseEnter={() => setHoveredPath(path)}
        onMouseLeave={() => setHoveredPath(null)}
      >
        <span
          aria-label={hasChildren ? (isExpanded ? "Collapse folder" : "Expand folder") : undefined}
          role={hasChildren ? "button" : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(path);
          }}
          style={{ userSelect: "none", marginRight: 6, cursor: hasChildren ? "pointer" : "default" }}
        >
          {node.type === "dir" ? (isExpanded ? "📂" : "📁") : "📄"}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (node.type === "dir") setCwd(path);
          }}
          style={{ cursor: node.type === "dir" ? "pointer" : "default" }}
          tabIndex={isCwd ? 0 : -1}
          aria-label={node.type === "dir" ? `Directory ${path}` : `File ${path}`}
        >
          {node.name || "/"}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div role="group">
          {(node.children || [])
            .filter((c) => showHidden || !c.name.startsWith('.'))
            .map((child) => (
              <TreeNode
                key={child.name + path}
                node={child}
                parentPath={path}
                cwd={cwd}
                setCwd={setCwd}
                setHoveredPath={setHoveredPath}
                level={level + 1}
                registerRef={registerRef}
                expanded={expanded}
                toggleExpand={toggleExpand}
                showHidden={showHidden}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const DirectoryTree: React.FC<Props> = ({
  root,
  cwd,
  setCwd,
  setHoveredPath,
  expanded,
  toggleExpand,
  showHidden
}) => {
  const refMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = (path: string, el: HTMLDivElement | null) => {
    if (el) {
      refMap.current.set(normalizePath(path), el);
    } else {
      refMap.current.delete(normalizePath(path));
    }
  };

  useEffect(() => {
    const normalized = normalizePath(cwd);
    const el = refMap.current.get(normalized);
    if (el) {
      el.focus({ preventScroll: false });
    }
  }, [cwd]);

  return (
    <div role="tree" aria-label="Filesystem directory tree" className="tree-container">
      <TreeNode
        node={root}
        parentPath=""
        cwd={cwd}
        setCwd={setCwd}
        setHoveredPath={setHoveredPath}
        level={0}
        registerRef={registerRef}
        expanded={expanded}
        toggleExpand={toggleExpand}
        showHidden={showHidden}
      />
    </div>
  );
};