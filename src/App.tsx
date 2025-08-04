import React, { useState, useEffect, useCallback } from "react";
import { fileSystem, FSNode } from "./fs";
import { DirectoryTree } from "./components/DirectoryTree";
import { normalizePath, joinPaths, relativePath } from "./utils/path";

const HOME = "/home/Laura";

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
  const [cwd, setCwdRaw] = useState<string>(normalizePath(HOME));
  const [hovered, setHovered] = useState<string | null>(null);
  const [input, setInput] = useState<string>(`cd ${HOME}`);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const [lsOutput, setLsOutput] = useState<LsOutput | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set([normalizePath("/"), normalizePath("/home"), normalizePath("/home/Laura")]);
  });

  const [hoveredPathsSeen, setHoveredPathsSeen] = useState<Set<string>>(new Set());

  const [showHiddenOverride, setShowHiddenOverride] = useState<boolean>(false);
  const [showHiddenInTree, setShowHiddenInTree] = useState<boolean>(false);

  const setCwd = useCallback(
    (p: string) => {
      const normalized = normalizePath(p);
      if (isDirectory(fileSystem, normalized)) {
        setCwdRaw(normalized);
        setError(null);
      } else {
        setError(`cd: not a directory: ${p}`);
      }
    },
    [setCwdRaw]
  );

  const toggleExpand = (p: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      const norm = normalizePath(p);
      if (copy.has(norm)) copy.delete(norm);
      else copy.add(norm);
      return copy;
    });
  };

  // Arrow-key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = input.trim();
    if (trimmed === "") return;
    const parts = trimmed.split(" ").filter(Boolean);
    const cmd = parts[0];
    if (cmd === "cd") {
      if (parts.length === 1) {
        setCwd(HOME);
        setLsOutput(null);
        setInput("");
        return;
      }
      const targetRaw = parts.slice(1).join(" ");
      let target: string;
      if (targetRaw.startsWith("/")) {
        target = normalizePath(targetRaw);
      } else {
        target = normalizePath(joinPaths(cwd, targetRaw));
      }
      if (isDirectory(fileSystem, target)) {
        setCwd(target);
        setLsOutput(null);
        setInput("");
      } else {
        setError(`cd: not a directory: ${targetRaw}`);
      }
    } else if (cmd === "ls") {
      let targetPath = cwd;
      let showAll = false;
      let longFormat = false;
      let human = false;
      let blocks = false;
      let argStart = 1;
      // Parse flags
      for (let i = 1; i < parts.length; ++i) {
        if (parts[i].startsWith("-") && parts[i].length > 1) {
          for (let j = 1; j < parts[i].length; ++j) {
            const part = parts[i][j];
            if (part === "a") showAll = true;
            else if (part === "l") longFormat = true;
            else if (part === "h") human = true;
            else if (part === "s") blocks = true;
          }
          argStart = i + 1;
        } else {
          break;
        }
      }
      if (parts.length > argStart) {
        const raw = parts.slice(argStart).join(" ");
        if (raw.startsWith("/")) targetPath = normalizePath(raw);
        else targetPath = normalizePath(joinPaths(cwd, raw));
      }
      if (!isDirectory(fileSystem, targetPath)) {
        setError(`ls: cannot access '${parts.slice(argStart).join(" ")}': No such directory`);
        setLsOutput(null);
        return;
      }
      // List directory and filter entries as per showAll
      const node = findNodeByPath(fileSystem, targetPath);
      if (!node || node.type !== "dir" || !node.children) {
        setLsOutput({
          path: targetPath,
          entries: [],
          showAll,
          long: longFormat,
          human,
          blocks
        });
        setInput("");
        return;
      }
      let entries = node.children
        .filter((c) => showAll || !c.name.startsWith("."))
        .map((c) => ({ name: c.name, type: c.type }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      setLsOutput({
        path: targetPath,
        entries,
        showAll,
        long: longFormat,
        human,
        blocks
      });
      setInput("");
    } else {
      setError(`Unknown command: ${cmd}. Only 'cd' and 'ls' supported.`);
    }
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
  const getPathCompletions = (arg: string): string[] => {
  // Helper: Find the longest common prefix among an array of strings
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
    let baseDir: string;
    let prefix: string;
    if (arg.startsWith("/")) {
      if (arg.endsWith("/")) {
        baseDir = normalizePath(arg);
        prefix = "";
      } else {
        const idx = arg.lastIndexOf("/");
        if (idx === -1 || idx === 0) {
          baseDir = "/";
          prefix = arg.slice(1);
        } else {
          baseDir = normalizePath(arg.slice(0, idx));
          prefix = arg.slice(idx + 1);
        }
      }
    } else {
      if (arg.endsWith("/")) {
        baseDir = normalizePath(joinPaths(cwd, arg));
        prefix = "";
      } else {
        const idx = arg.lastIndexOf("/");
        if (idx === -1) {
          baseDir = cwd;
          prefix = arg;
        } else {
          baseDir = normalizePath(joinPaths(cwd, arg.slice(0, idx)));
          prefix = arg.slice(idx + 1);
        }
      }
    }
    const node = findNodeByPath(fileSystem, baseDir);
    if (!node || node.type !== "dir" || !node.children) return [];
    const matches = node.children
      .filter((c) => c.name.startsWith(prefix))
      .map((c) => {
        let suggestionPath: string;
        if (arg.startsWith("/")) {
          suggestionPath = baseDir === "/" ? `/${c.name}` : `${baseDir}/${c.name}`;
        } else {
          if (arg.includes("/")) {
            suggestionPath = `${arg.slice(0, arg.lastIndexOf("/") + 1)}${c.name}`;
          } else {
            suggestionPath = c.name;
          }
        }
        return c.type === "dir" ? suggestionPath + "/" : suggestionPath;
      });
    return matches.slice(0, 8);
  };

  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    const parts = input.trim().split(" ").filter(Boolean);
    if (parts.length >= 2 && (parts[0] === "cd" || parts[0] === "ls")) {
      const arg = parts.slice(1).join(" ");
      setSuggestions(getPathCompletions(arg));
    } else {
      setSuggestions([]);
    }
  }, [input, cwd]);

  const missions = [
    {
      id: "nav-research",
      description: "Navigate to /home/user/Documents/Research",
      isComplete: () => normalizePath(cwd) === "/home/user/Documents/Research"
    },
    {
      id: "ls-research",
      description: "Run ls on /home/user/Documents/Research and verify example.fasta is listed",
      isComplete: () =>
        lsOutput?.path === "/home/user/Documents/Research" &&
        lsOutput.entries.some((e) => e.name === "example.fasta")
    }
  ];

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

  return (
    <div className="app">
      <header>
        <h1>Filesystem Visualizer</h1>
        <div className="controls">
          <button onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
            {dark ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <div className="panel">
        <div className="left">
          <div className="tree-controls" style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={showHiddenInTree}
                onChange={(e) => setShowHiddenInTree(e.target.checked)}
              />{" "}
              Show hidden in tree
            </label>
          </div>
          <div className="tree-wrapper">
            <DirectoryTree
              root={fileSystem}
              cwd={cwd}
              setCwd={setCwd}
              setHoveredPath={setHovered}
              expanded={expanded}
              toggleExpand={toggleExpand}
              showHidden={showHiddenInTree}
            />
          </div>
        </div>

        <div className="right">
          <div className="info-block">
            <div className="section">
              <div className="label">Exercises</div>
              <div>
                {missions.filter((m) => m.isComplete()).length} / {missions.length} complete
              </div>
              <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                {missions.map((m) => (
                  <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{m.isComplete() ? "✅" : "⬜"}</span>
                    <span>{m.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="shell">
            <form onSubmit={handleShellSubmit}>
              <label htmlFor="shell-input" className="visually-hidden">
                Shell input
              </label>
              <div className="input-row">
                <code className="prompt">user@demo:$</code>
                <input
                  id="shell-input"
                  aria-label="Shell input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      if (suggestions.length === 0) return;
                      const parts = input.trim().split(" ").filter(Boolean);
                      const cmd = parts[0] || "";
                      if (suggestions.length === 1) {
                        let completion = suggestions[0];
                        if (!completion.endsWith("/")) completion = completion + " ";
                        setInput(`${cmd} ${completion}`);
                      } else {
                        const lcp = longestCommonPrefix(suggestions);
                        if (lcp) {
                          setInput(`${cmd} ${lcp}`);
                        }
                      }
                    }
                  }}
                  className="shell-input"
                  autoComplete="off"
                />
                <button type="submit">Run</button>
              </div>
              {suggestions.length > 0 && (
                <div className="autocomplete-suggestions">
                  {suggestions.map((s) => (
                    <div
                      key={s}
                      className="suggestion"
                      onClick={() => {
                        const parts = input.trim().split(" ").filter(Boolean);
                        const cmd = parts[0];
                        const newInput = `${cmd} ${s}` + (s.endsWith("/") ? "" : " ");
                        setInput(newInput);
                        setSuggestions([]);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </form>
            {lsOutput && (
              <div className="section">
                <div className="label">
                  Last <code>ls</code> output at <code>{lsOutput.path}</code>:
                </div>
                <div className="code-block" style={{ padding: "6px 12px" }}>
                  {lsOutput.entries.length === 0 ? (
                    <div className="muted">(empty)</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {lsOutput.long ? (
                        (() => {
                          // Simulate file sizes for block counts: 1 block (1024 bytes) per file, 2 blocks per dir
                          const getNode = (name: string, type: string) => {
                            const node = findNodeByPath(fileSystem, lsOutput.path + (lsOutput.path.endsWith("/") ? "" : "/") + name);
                            return node;
                          };
                          const getSize = (node: FSNode | null) => {
                            if (!node) return 0;
                            if (node.type === "dir") return 2048;
                            return 1024;
                          };
                          const getPerms = (node: FSNode | null) => {
                            if (!node) return "----------";
                            if (node.type === "dir") return "drwxr-xr-x";
                            return "-rw-r--r--";
                          };
                          const totalBlocks = lsOutput.entries.reduce((acc, e) => {
                            const node = getNode(e.name, e.type);
                            const size = getSize(node);
                            return acc + Math.ceil(size / 1024);
                          }, 0);
                          const humanReadableSize = (n: number) => {
                            if (n < 1024) return `${n} B`;
                            if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
                            return `${(n / (1024 * 1024)).toFixed(1)}M`;
                          };
                          return (
                            <>
                              {lsOutput.blocks && (
                                <div>
                                  total{" "}
                                  {lsOutput.human
                                    ? humanReadableSize(totalBlocks * 1024)
                                    : totalBlocks}
                                </div>
                              )}
                              {lsOutput.entries.map((e) => {
                                const node = getNode(e.name, e.type);
                                const size = getSize(node);
                                const blockCount = Math.ceil(size / 1024);
                                return (
                                  <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {lsOutput.blocks && (
                                      <span style={{ minWidth: 36, textAlign: "right", color: "#888" }}>
                                        {lsOutput.human
                                          ? humanReadableSize(blockCount * 1024)
                                          : blockCount}
                                      </span>
                                    )}
                                    <span style={{ minWidth: 11, fontFamily: "monospace" }}>
                                      {getPerms(node)}
                                    </span>
                                    <span aria-hidden="true" style={{ marginLeft: 6, marginRight: 6 }}>
                                      {e.type === "dir" ? "📁" : "📄"}
                                    </span>
                                    {e.name}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()
                      ) : (
                        lsOutput.entries.map((e) => {
                          // Short format
                          // Simulate file sizes for block counts: 1 block (1024 bytes) per file, 2 blocks per dir
                          const node = findNodeByPath(fileSystem, lsOutput.path + (lsOutput.path.endsWith("/") ? "" : "/") + e.name);
                          const size = node
                            ? node.type === "dir"
                              ? 2048
                              : 1024
                            : 0;
                          const blockCount = Math.ceil(size / 1024);
                          const humanReadableSize = (n: number) => {
                            if (n < 1024) return `${n} B`;
                            if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
                            return `${(n / (1024 * 1024)).toFixed(1)}M`;
                          };
                          return (
                            <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {lsOutput.blocks && (
                                <span style={{ minWidth: 36, textAlign: "right", color: "#888" }}>
                                  {lsOutput.human
                                    ? humanReadableSize(blockCount * 1024)
                                    : blockCount}
                                </span>
                              )}
                              <span aria-hidden="true" style={{ marginRight: 6 }}>
                                {e.type === "dir" ? "📁" : "📄"}
                              </span>
                              {e.name}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {error && <div className="error">{error}</div>}
            <div className="hint" style={{ marginTop: 8 }}>
              <p style={{ margin: 0 }}>
                Supported commands: <code>cd &lt;path&gt;</code> and <code>ls [&lt;path&gt;]</code>.
              </p>
            </div>
          </div>

          <div className="info-block">
            <div className="section">
              <div className="label">Current working directory (`pwd`):</div>
              <pre className="code-block">{cwd}</pre>
            </div>

            <div className="section">
              <div className="label">Hover target:</div>
              {hovered ? (
                <>
                  <pre className="code-block">{hovered}</pre>
                  <div className="subsection">
                    <div className="label">Suggested cd:</div>
                    {cdInfo && cdInfo.valid ? (
                      <>
                        <div>
                          <strong>Absolute:</strong> <code>{cdInfo.abs}</code>
                        </div>
                        <div>
                          <strong>Relative:</strong> <code>{cdInfo.rel}</code>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>Note:</strong> target is a file, not a directory.
                        </div>
                        <div>
                          <strong>To go to its containing directory:</strong>{" "}
                          <code>{cdInfo?.rel}</code>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="muted">Hover over a node to see how to cd to it.</div>
              )}
            </div>
          </div>

          <div className="hint">
            <p style={{ margin: 0 }}>
              Navigation: <kbd>←</kbd> parent, <kbd>→</kbd> first child directory, <kbd>↑</kbd>/
              <kbd>↓</kbd> among sibling directories. Clicking a directory name sets CWD. Clicking the
              folder icon toggles collapse/expand.
            </p>
          </div>
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