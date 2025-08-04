import React, { useState, useEffect, useCallback } from "react";
import { fileSystem, FSNode } from "./fs";
import { DirectoryTree } from "./components/DirectoryTree";
import { normalizePath, joinPaths, relativePath } from "./utils/path";

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
    return new Set([normalizePath("/"), normalizePath("/home"), normalizePath("/home/user")]);
  });

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
    return { path: normalized, entries };
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
      if (parts.length > 1) {
        const raw = parts.slice(1).join(" ");
        if (raw.startsWith("/")) targetPath = normalizePath(raw);
        else targetPath = normalizePath(joinPaths(cwd, raw));
      }
      if (!isDirectory(fileSystem, targetPath)) {
        setError(`ls: cannot access '${parts.slice(1).join(" ")}': No such directory`);
        setLsOutput(null);
        return;
      }
      const out = listDirectory(targetPath);
      if (out) {
        setLsOutput(out);
        setInput("");
      }
    } else {
      setError(`Unknown command: ${cmd}. Only 'cd' and 'ls' supported.`);
    }
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
          <div className="tree-wrapper">
            <DirectoryTree
              root={fileSystem}
              cwd={cwd}
              setCwd={setCwd}
              setHoveredPath={setHovered}
              expanded={expanded}
              toggleExpand={toggleExpand}
            />
          </div>
        </div>

        <div className="right">
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
                  className="shell-input"
                  autoComplete="off"
                />
                <button type="submit">Run</button>
              </div>
            </form>
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
                      {lsOutput.entries.map((e) => (
                        <div key={e.name}>
                          <span aria-hidden="true" style={{ marginRight: 6 }}>
                            {e.type === "dir" ? "📁" : "📄"}
                          </span>
                          {e.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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