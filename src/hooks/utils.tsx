import { useState, useEffect, useCallback } from "react";
import { normalizePath, joinPaths, relativePath } from "../utils/path";
import { FSNode } from "../fs";

// --- Filesystem Helpers ---
export function findNodeByPath(root: FSNode, path: string): FSNode | null {
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
}

export function isDirectory(root: FSNode, path: string): boolean {
  const node = findNodeByPath(root, path);
  return node?.type === "dir";
}

export type LsOutput = {
  path: string;
  entries: { name: string; type: "dir" | "file" }[];
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

export function listDirectory(fileSystem: FSNode, path: string): LsOutput | null {
  const normalized = normalizePath(path);
  const node = findNodeByPath(fileSystem, normalized);
  if (!node) return null;
  if (node.type !== "dir") return null;
  const entries = (node.children || [])
    .map((c) => ({ name: c.name, type: c.type }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  return { path: normalized, entries, showAll: false, long: false, human: false, blocks: false };
}

export function getFileContent(
  fileSystem: FSNode,
  cwd: string,
  raw: string,
  expandTilde: (p: string) => string
): { path: string; content: string } | null {
  let target: string;
  let expanded = raw;
  if (raw.startsWith("~")) {
    expanded = expandTilde(raw);
  }
  if (expanded.startsWith("/")) {
    target = normalizePath(expanded);
  } else {
    target = normalizePath(joinPaths(cwd, expanded));
  }
  const node = findNodeByPath(fileSystem, target);
  if (!node || node.type !== "file") return null;
  return { path: target, content: node.content ?? "" };
}

export function computeCdInfo(
  hovered: string | null,
  fileSystem: FSNode,
  cwd: string
) {
  if (!hovered) return null;
  const target = normalizePath(hovered);
  const isDir = isDirectory(fileSystem, target);
  if (isDir) {
    const abs = `cd ${target}`;
    const rel = `cd ${relativePath(cwd, target)}`;
    return { abs, rel, valid: true };
  } else {
    const parent = normalizePath(target.split("/").slice(0, -1).join("/"));
    const rel = `cd ${relativePath(cwd, parent)}`;
    return {
      abs: `cd ${parent}  # file is not a directory`,
      rel,
      valid: false
    };
  }
}

// --- Theme Hook ---
export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("theme");
    const handler = (e: MediaQueryListEvent) => {
      if (!stored) setDark(e.matches);
    };
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      // @ts-ignore
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        // @ts-ignore
        mq.removeListener(handler);
      }
    };
  }, []);

  return [dark, setDark] as const;
}

// --- Expanded Tree Hook ---
export function useExpandedTree(initialPaths: string[]) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialPaths.map(normalizePath))
  );

  const toggleExpand = useCallback((p: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      const norm = normalizePath(p);
      if (copy.has(norm)) copy.delete(norm);
      else copy.add(norm);
      return copy;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(new Set([normalizePath("/")]));
  }, []);

  return { expanded, setExpanded, toggleExpand, collapseAll };
}

// --- Hovered Paths Seen Hook ---
export function useHoveredPathsSeen(hovered: string | null) {
  const [hoveredPathsSeen, setHoveredPathsSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (hovered) {
      setHoveredPathsSeen((prev) => {
        if (prev.has(hovered)) return prev;
        const copy = new Set(prev);
        copy.add(hovered);
        return copy;
      });
    }
  }, [hovered]);
  return [hoveredPathsSeen, setHoveredPathsSeen] as const;
}

// --- Tilde Expansion Utility ---
export function useExpandTilde(HOME: string) {
  return useCallback(
    (p: string) => {
      if (p === "~") return HOME;
      if (p.startsWith("~/")) return HOME + p.slice(1);
      return p;
    },
    [HOME]
  );
}

// --- Auto-expand Tree on CWD Change ---
export function useAutoExpandTreeOnCwdChange(cwd: string, setExpanded: (s: Set<string>) => void) {
  useEffect(() => {
    const segments = normalizePath(cwd).slice(1).split("/").filter(Boolean);
    setExpanded((prev) => {
      const copy = new Set(prev);
      let acc = "";
      for (const segment of segments) {
        acc = acc + "/" + segment;
        copy.add(normalizePath(acc));
      }
      return copy;
    });
  }, [cwd, setExpanded]);
}