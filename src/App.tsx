import ShellPanel from "./components/shell_panel";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/header";
import CwdHoverInfo from "./components/cwd_hover_info";
import { getAllMissions } from "./components/Missions";
import Exercises from "./components/Exercises";
import { fileSystem, FSNode } from "./fs";
import { TreePanel } from "./components/TreePanel";
import { normalizePath, joinPaths, relativePath } from "./utils/path";
import { useShell } from "./hooks/useShell";

const HOME = "/home/user";



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
  const TOOLTIP_DATA: Record<string, { usage: string; detail: string }> = {
    cd: { usage: "cd <path>", detail: "Change working directory to <path>. Without argument returns to home." },
    pwd: { usage: "pwd", detail: "Print the current working directory." },
    ls: {
      usage: "ls [-a|-l|-h|-s] [path]",
      detail: "-a: show hidden files\n-l: long listing (permissions, size, mtime)\n-h: human-readable sizes\n-s: show block sizes"
    },
    cat: { usage: "cat <file>...", detail: "Concatenate and display file contents. Multiple files show headers." },
    head: { usage: "head [-n N] <file>", detail: "Show first N lines of file (default 10). Syntax: -n 5 or -5." },
    tail: { usage: "tail [-n N] <file>", detail: "Show last N lines of file (default 10)." },
    wc: {
      usage: "wc [-l|-w|-c] <file>...",
      detail: "Count lines, words, bytes. No flags shows all; multiple files include a total line."
    },
    grep: {
      usage: "grep [-i] <pattern> <file>...",
      detail: "Search for pattern in file(s). -i for case-insensitive."
    },
    cut: {
      usage: "cut [-d DELIM] -f LIST <file>...",
      detail: "Select specified fields from each line, splitting on DELIM (default tab). LIST is comma-separated field numbers. Examples: cut -f1,3 file.txt or cut -d ':' -f2 file.txt."
    },
    "|": {
      usage: "command1 | command2",
      detail: "Pass the output of command1 as input to command2 for efficient data exploration. Supports chaining multiple commands. Example: grep 'pattern' file.txt | wc -l"
    }
  };

  const CommandWithTooltip: React.FC<{ cmdKey: string; children: React.ReactNode }> = ({ cmdKey, children }) => {
    const info = TOOLTIP_DATA[cmdKey];
    const [show, setShow] = useState(false);
    return (
      <span
        style={{ position: "relative", display: "inline-block" }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        tabIndex={0}
        aria-describedby={`tooltip-${cmdKey}`}
      >
        {children}
        {show && (
          <div
            id={`tooltip-${cmdKey}`}
            role="tooltip"
            style={{
              position: "absolute",
              top: "110%",
              left: "50%",
              transform: "translate(-50%, 4px)",
              backgroundColor: dark ? "#1f2937" : "#fff",
              color: dark ? "#f5f5f5" : "#111",
              border: "1px solid rgba(0,0,0,0.15)",
              padding: 10,
              borderRadius: 6,
              boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
              zIndex: 100,
              width: 260,
              fontSize: "0.85em",
              whiteSpace: "pre-wrap"
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{info.usage}</div>
            <div>{info.detail}</div>
          </div>
        )}
      </span>
    );
  };


  const getSystemFolderKey = (path: string): string | null => {
    const norm = normalizePath(path);
    const keys = ["/", "/home", "/bin", "/sbin", "/etc", "/usr", "/var", "/tmp", "/dev", "/proc", "/root", "/lib", "/opt", "/boot", "/mnt", "/media"];
    for (const key of keys) {
      if (norm === key || norm.startsWith(key + "/")) return key;
    }
    return null;
  };

  const getSystemFolderInfo = (path: string) => {
    const key = getSystemFolderKey(path);
    if (!key) return null;
    return SYSTEM_FOLDER_INFO[key];
  };

  const expandTilde = (p: string) => {
    if (p === "~") return HOME;
    if (p.startsWith("~/")) return HOME + p.slice(1);
    return p;
  };

  const [cwd, setCwdRaw] = useState<string>(normalizePath(HOME));
  const [hovered, setHovered] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set([normalizePath("/"), normalizePath("/home"), normalizePath("/home/user")]);
  });


  const [hoveredPathsSeen, setHoveredPathsSeen] = useState<Set<string>>(new Set());

  const [showHiddenOverride, setShowHiddenOverride] = useState<boolean>(false);
  const [showHiddenInTree, setShowHiddenInTree] = useState<boolean>(false);

  const [completedMissions, setCompletedMissions] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("completedMissions");
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        return new Set(arr);
      }
    } catch {}
    return new Set();
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

  const shell = useShell({
    cwd,
    setCwd,
    fileSystem,
    HOME,
    findNodeByPath,
    isDirectory,
  });
  const { lastCommand, lsOutput, textOutput } = shell;

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

  // Arrow-key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // if focus is in input/textarea or the shell input, don't intercept arrow keys (allow editing)
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.id === "shell-input" || active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
      ) {
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const segments = normalizePath(cwd).slice(1).split("/").filter(Boolean);
        if (e.key === "ArrowLeft") {
          if (cwd !== "/") {
            const parent = "/" + segments.slice(0, -1).join("/");
            setCwd(parent === "" ? "/" : parent);
          }
        } else if (e.key === "ArrowRight") {
          const node = findNodeByPath(fileSystem, cwd);
          if (node && node.type === "dir" && node.children) {
            const firstDir = node.children.find((c) => c.type === "dir");
            if (firstDir) {
              setCwd(joinPaths(cwd, firstDir.name));
            }
          }
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          if (cwd === "/") return;
          const parentPath = "/" + segments.slice(0, -1).join("/");
          const parentNode = findNodeByPath(fileSystem, parentPath === "" ? "/" : parentPath);
          if (!parentNode || parentNode.type !== "dir" || !parentNode.children) return;
          const dirs = parentNode.children.filter((c) => c.type === "dir");
          const currentName = segments[segments.length - 1];
          const idx = dirs.findIndex((d) => d.name === currentName);
          if (idx === -1) return;
          let target: FSNode | null = null;
          if (e.key === "ArrowUp") {
            if (idx > 0) target = dirs[idx - 1];
          } else {
            if (idx < dirs.length - 1) target = dirs[idx + 1];
          }
          if (target) {
            setCwd(joinPaths(parentPath, target.name));
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cwd, setCwd]);

  // Theme persistence
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

  // ----------- AUTOCOMPLETE & MISSIONS HELPERS -----------
  const longestCommonPrefix = (arr: string[]): string => {
    if (arr.length === 0) return "";
    let prefix = arr[0];
    for (let i = 1; i < arr.length; i++) {
      while (arr[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
        if (prefix === "") return "";
      }
    }
    return prefix;
  };
  const getPathCompletions = (arg: string): string[] => {
    let useTildePrefix = false;
    let processedArg = arg;
    if (arg === "~" || arg.startsWith("~/")) {
      useTildePrefix = true;
      processedArg = expandTilde(arg);
    }
    let baseDir: string;
    let prefix: string;
    if (processedArg.startsWith("/")) {
      if (processedArg.endsWith("/")) {
        baseDir = normalizePath(processedArg);
        prefix = "";
      } else {
        const idx = processedArg.lastIndexOf("/");
        if (idx === -1 || idx === 0) {
          baseDir = "/";
          prefix = processedArg.slice(1);
        } else {
          baseDir = normalizePath(processedArg.slice(0, idx));
          prefix = processedArg.slice(idx + 1);
        }
      }
    } else {
      if (processedArg.endsWith("/")) {
        baseDir = normalizePath(joinPaths(cwd, processedArg));
        prefix = "";
      } else {
        const idx = processedArg.lastIndexOf("/");
        if (idx === -1) {
          baseDir = cwd;
          prefix = processedArg;
        } else {
          baseDir = normalizePath(joinPaths(cwd, processedArg.slice(0, idx)));
          prefix = processedArg.slice(idx + 1);
        }
      }
    }
    const node = findNodeByPath(fileSystem, baseDir);
    if (!node || node.type !== "dir" || !node.children) return [];
    const matches = node.children
      .filter((c) => c.name.startsWith(prefix))
      .map((c) => {
        let suggestionPath: string;
        if (arg.startsWith("/") || arg.startsWith("~")) {
          suggestionPath = baseDir === "/" ? `/${c.name}` : `${baseDir}/${c.name}`;
        } else {
          if (arg.includes("/")) {
            suggestionPath = `${arg.slice(0, arg.lastIndexOf("/") + 1)}${c.name}`;
          } else {
            suggestionPath = c.name;
          }
        }
        if (useTildePrefix && suggestionPath.startsWith(HOME)) {
          suggestionPath = "~" + suggestionPath.slice(HOME.length);
        }
        return c.type === "dir" ? suggestionPath + "/" : suggestionPath;
      });
    return matches.slice(0, 8);
  };

    // Grouped exercise structure
  const allMissions = getAllMissions({ lsOutput, textOutput, cwd, lastCommand, normalizePath });

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  useEffect(() => {
    setCompletedMissions((prev) => {
      const copy = new Set(prev);
      allMissions.forEach((group) => {
        for (const m of group.missions) {
          if (copy.has(m.id)) continue;
          if (m.isComplete()) {
            const idx = group.missions.findIndex((x) => x.id === m.id);
            let allPrev = true;
            for (let i = 0; i < idx; i++) {
              if (!copy.has(group.missions[i].id)) {
                allPrev = false;
                break;
              }
            }
            if (allPrev) {
              copy.add(m.id);
            }
          }
        }
      });
      return copy;
    });
  }, [cwd, lsOutput, textOutput, lastCommand, allMissions]);

  // Track previous completed missions for auto-advance logic
  const prevCompletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentGroup = allMissions[currentGroupIndex];
    const finalMission = currentGroup.missions[currentGroup.missions.length - 1];
    const wasFinalDoneBefore = prevCompletedRef.current.has(finalMission.id);
    const isFinalDoneNow = completedMissions.has(finalMission.id);
    // auto-advance only when the final mission has just become complete
    if (!wasFinalDoneBefore && isFinalDoneNow && currentGroupIndex < allMissions.length - 1) {
      setCurrentGroupIndex((i) => i + 1);
    }
    // update previous state
    prevCompletedRef.current = new Set(completedMissions);
  }, [completedMissions, currentGroupIndex, allMissions]);

  useEffect(() => {
    localStorage.setItem("completedMissions", JSON.stringify(Array.from(completedMissions)));
  }, [completedMissions]);

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

  const getPromptCwd = () => {
    if (cwd === "/home/user") return "~";
    if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
    return cwd;
  };
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
          />
          <ShellPanel
            cwd={cwd}
            setCwd={setCwd}
            fileSystem={fileSystem}
            HOME={HOME}
            findNodeByPath={findNodeByPath}
            isDirectory={isDirectory}
          />

          <CwdHoverInfo cwd={cwd} hovered={hovered} cdInfo={cdInfo} />

        </div>
      </div>

      <footer>
        <small>
          Static client-side demo. No real filesystem access. Designed for teaching <code>cd</code>/
          <code>pwd</code>/ <code>ls</code>.
        </small>
      </footer>
    </div>
  );
};

export default App;