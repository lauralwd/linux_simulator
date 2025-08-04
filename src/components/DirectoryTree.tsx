import React, { useMemo, useRef, useEffect } from "react";
import { FSNode } from "../fs";
import { normalizePath, joinPaths } from "../utils/path";

type Props = {
  root: FSNode;
  cwd: string;
  setCwd: (p: string) => void;
  setHoveredPath: (p: string | null) => void;
};

const findNodeByPath = (root: FSNode, path: string): FSNode | null => {
  const normalized = normalizePath(path);
  if (normalized === "/") return root;
  const segments = normalized.slice(1).split("/").filter(Boolean);
  let current: FSNode | undefined = root;
  for (const seg of segments) {
    if (!current || current.type !== "dir" || !current.children) return null;
    current = current.children.find((c) => c.name === seg);
    if (!current) return null;
  }
  return current || null;
};

type NodeProps = {
  node: FSNode;
  parentPath: string;
  cwd: string;
  setCwd: (p: string) => void;
  setHoveredPath: (p: string | null) => void;
  level: number;
  registerRef: (path: string, el: HTMLDivElement | null) => void;
};

const TreeNode: React.FC<NodeProps> = ({
  node,
  parentPath,
  cwd,
  setCwd,
  setHoveredPath,
  level,
  registerRef
}) => {
  const path = joinPaths(parentPath, node.name);
  const isCwd = normalizePath(cwd) === normalizePath(path);
  const hasChildren = node.type === "dir" && node.children && node.children.length > 0;

  const refCallback = (el: HTMLDivElement | null) => {
    registerRef(path, el);
  };

  return (
    <div role="treeitem"
      aria-expanded={hasChildren ? true : undefined}
      aria-selected={isCwd}
      style={{ paddingLeft: level * 16, position: "relative" }}
    >
      <div
        ref={refCallback}
        tabIndex={isCwd ? 0 : -1}
        className={`node-row ${isCwd ? "cwd" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (node.type === "dir") setCwd(path);
        }}
        onMouseEnter={() => setHoveredPath(path)}
        onMouseLeave={() => setHoveredPath(null)}
        aria-label={node.type === "dir" ? `Directory ${path}` : `File ${path}`}
      >
        <span aria-hidden="true" style={{ userSelect: "none", marginRight: 6 }}>
          {node.type === "dir" ? "📁" : "📄"}
        </span>
        <span>{node.name || "/"}</span>
      </div>
      {hasChildren && (
        <div role="group">
          {node.children!.map((child) => (
            <TreeNode
              key={child.name + path}
              node={child}
              parentPath={path}
              cwd={cwd}
              setCwd={setCwd}
              setHoveredPath={setHoveredPath}
              level={level + 1}
              registerRef={registerRef}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DirectoryTree: React.FC<Props> = ({ root, cwd, setCwd, setHoveredPath }) => {
  // Keep a map of path -> element so we can focus when cwd changes
  const refMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = (path: string, el: HTMLDivElement | null) => {
    if (el) {
      refMap.current.set(normalizePath(path), el);
    } else {
      refMap.current.delete(normalizePath(path));
    }
  };

  useEffect(() => {
    // Focus the current cwd element with a small delay to allow rendering
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
      />
    </div>
  );
};