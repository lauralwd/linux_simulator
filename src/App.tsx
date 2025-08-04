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

const App: React.FC = () => {
  const [cwd, setCwdRaw] = useState<string>(normalizePath(HOME));
  const [hovered, setHovered] = useState<string | null>(null);
  const [input, setInput] = useState<string>(`cd ${HOME}`);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
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

  // Keyboard handling for arrow keys to move CWD
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
          // Enter first child directory if any
          const node = findNodeByPath(fileSystem, cwd);
          if (node && node.type === "dir" && node.children) {
            const firstDir = node.children.find((c) => c.type === "dir");
            if (firstDir) {
              setCwd(joinPaths(cwd, firstDir.name));
            }
          }
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          // Move among siblings
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

  // Keep input in sync when cwd changes
  useEffect(() => {
    setInput(`cd ${cwd}`);
  }, [cwd]);

  // Theme persistence
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = input.trim();
    if (!trimmed.startsWith("cd")) {
      setError(`Only cd is supported in this demo`);
      return;
    }
    const parts = trimmed.split(" ").filter(Boolean);
    if (parts.length === 1) {
      // cd with no args -> home
      setCwd(HOME);
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
    } else {
      setError(`cd: not a directory: ${targetRaw}`);
    }
  };

  // Compute hover info
  const hoveredNode = hovered ? findNodeByPath(fileSystem, hovered) : null;

  const computeCdInfo = () => {
    if (!hovered) return null;
    const target = normalizePath(hovered);
    const isDir = isDirectory(fileSystem, target);
    if (isDir) {
      const abs = `cd ${target}`;
      const rel = `cd ${relativePath(cwd, target)}`;
      return { abs, rel, valid: true };
    } else {
      // file case
      const parent = normalizePath(target.split("/").slice(0, -1).join("/"));
      const abs = `cd ${parent}  # file is not a directory`;
      const rel = `cd ${relativePath(cwd, parent)}`;
      return { abs, rel, valid: false };
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
          </div>

          <div className="tree-wrapper">
            <DirectoryTree
              root={fileSystem}
              cwd={cwd}
              setCwd={setCwd}
              setHoveredPath={setHovered}
            />
          </div>
        </div>

        <div className="right">
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
                          <strong>Absolute:</strong>{" "}
                          <code>{cdInfo.abs}</code>
                        </div>
                        <div>
                          <strong>Relative:</strong>{" "}
                          <code>{cdInfo.rel}</code>
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
            <p>
              Use arrow keys: <kbd>←</kbd> to go to parent, <kbd>→</kbd> to enter first child
              directory, <kbd>↑</kbd>/<kbd>↓</kbd> to move among sibling directories. Clicking a
              directory also changes CWD.
            </p>
          </div>
        </div>
      </div>

      <footer>
        <small>Static client-side demo. No real filesystem access. Designed for teaching `cd`/&nbsp;`pwd`.</small>
      </footer>
    </div>
  );
};

export default App;