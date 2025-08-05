// React & Hooks
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTreeKeyboardNav } from "./hooks/useKeys";

// Components
import ShellPanel from "./components/shell_panel";
import Header from "./components/header";
import CwdHoverInfo from "./components/cwd_hover_info";
import { getAllMissions } from "./components/Missions";
import Exercises from "./components/Exercises";
import { TreePanel } from "./components/TreePanel";
import Footer from "./components/footer";

// Filesystem & Data
import { fileSystem, FSNode } from "./fs";

// Utilities
import { normalizePath, joinPaths, relativePath } from "./utils/path";
import { useShell } from "./hooks/useShell";
import { useMissions } from "./hooks/useMissions";

const HOME = "/home/user";

// --- Filesystem Helpers ---
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

// Check if path refers to a directory
const isDirectory = (root: FSNode, path: string): boolean => {
  const node = findNodeByPath(root, path);
  return node?.type === "dir";
};

type LsOutput = {
  path: string;
  entries: { name: string; type: "dir" | "file" }[];
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

const App: React.FC = () => {
  // --- Application State ---
  // User & Theme

  const expandTilde = (p: string) => {
    if (p === "~") return HOME;
    if (p.startsWith("~/")) return HOME + p.slice(1);
    return p;
  };

  // Directory Tree
  const [cwd, setCwdRaw] = useState<string>(normalizePath(HOME));
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set([normalizePath("/"), normalizePath("/home"), normalizePath("/home/user")]);
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPathsSeen, setHoveredPathsSeen] = useState<Set<string>>(new Set());
  const [showHiddenInTree, setShowHiddenInTree] = useState<boolean>(false);
  const [showHiddenOverride, setShowHiddenOverride] = useState<boolean>(false);

  // User & Theme
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  const setCwd = useCallback(
    (p: string) => {
      const normalized = normalizePath(p);
      if (isDirectory(fileSystem, normalized)) {
        setCwdRaw(normalized);
      }
    },
    [setCwdRaw]
  );

  // --- Tree Keyboard Navigation Hook ---
  useTreeKeyboardNav({
    cwd,
    setCwd,
    fileSystem,
    findNodeByPath,
    isDirectory,
  });

  // --- Shell Hook (terminal logic) ---
  const shell = useShell({
    cwd,
    setCwd,
    fileSystem,
    HOME,
    findNodeByPath,
    isDirectory,
  });
  const {
    input, setInput,
    suggestions,
    handleShellSubmit,
    handleKeyDown,
    lsOutput, textOutput,
    error, lastCommand,
  } = shell;

  // --- Tree Panel Handlers ---
  const toggleExpand = (p: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      const norm = normalizePath(p);
      if (copy.has(norm)) copy.delete(norm);
      else copy.add(norm);
      return copy;
    });
  };

  const collapseAll = () => {
    setExpanded(new Set([normalizePath("/")]));
  };


  // --- Theme Persistence ---
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("theme");
    const handler = (e: MediaQueryListEvent) => {
      if (!stored) {
        setDark(e.matches);
      }
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

  const listDirectory = (path: string): LsOutput | null => {
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
  };

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

  const getFileContent = (raw: string): { path: string; content: string } | null => {
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
  };

  // Hover info
  const computeCdInfo = () => {
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
  };

  const cdInfo = computeCdInfo();

  // --- Auto-expand Tree on CWD Change ---
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
  }, [cwd]);

  // --- Prompt Formatting Helper ---
  const getPromptCwd = () => {
    if (cwd === "/home/user") return "~";
    if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
    return cwd;
  };


  // --- Missions Hook (business logic) ---
  const allMissions = getAllMissions({ lsOutput, textOutput, cwd, lastCommand, normalizePath });
  const {
    completedMissions,
    setCompletedMissions,
    currentGroupIndex,
    setCurrentGroupIndex,
    resetMissions,
  } = useMissions(allMissions);

  // --- Render Layout ---
  return (
    <div className="app">
      <Header dark={dark} setDark={setDark} />

      <div className="panel">
        <TreePanel
          fileSystem={fileSystem}
          cwd={cwd}
          setCwd={setCwd}
          setHoveredPath={setHovered}
          expanded={expanded}
          toggleExpand={toggleExpand}
          collapseAll={collapseAll}
          showHiddenInTree={showHiddenInTree}
          setShowHiddenInTree={setShowHiddenInTree}
        />

        <div className="right">
          <Exercises
            allMissions={allMissions}
            completedMissions={completedMissions}
            setCompletedMissions={setCompletedMissions}
            currentGroupIndex={currentGroupIndex}
            setCurrentGroupIndex={setCurrentGroupIndex}
            //resetMissions={resetMissions}
          />
          <ShellPanel
            cwd={cwd}
            setCwd={setCwd}
            fileSystem={fileSystem}
            HOME={HOME}
            findNodeByPath={findNodeByPath}
            isDirectory={isDirectory}
            input={input}
            setInput={setInput}
            suggestions={suggestions}
            handleShellSubmit={handleShellSubmit}
            handleKeyDown={handleKeyDown}
            textOutput={textOutput}
            error={error}
          />

          <CwdHoverInfo cwd={cwd} hovered={hovered} cdInfo={cdInfo} />

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default App;