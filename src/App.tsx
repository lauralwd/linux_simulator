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
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

const App: React.FC = () => {
  const TOOLTIP_DATA: Record<string, { usage: string; detail: string }> = {
    cd: { usage: "cd <path>", detail: "Change working directory to <path>. Without argument returns to home." },
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
  const [cwd, setCwdRaw] = useState<string>(normalizePath(HOME));
  const [hovered, setHovered] = useState<string | null>(null);
  const [input, setInput] = useState<string>(`cd ${HOME}`);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  const [lsOutput, setLsOutput] = useState<LsOutput | null>(null);
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set([normalizePath("/"), normalizePath("/home"), normalizePath("/home/user")]);
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

  const collapseAll = () => {
    setExpanded(new Set([normalizePath("/")]));
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

  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTextOutput(null);
    setLsOutput(null);
    const trimmed = input.trim();
    if (trimmed === "") return;
    const parts = trimmed.split(" ").filter(Boolean);
    const cmd = parts[0];
    // Helper to get file content by path (relative to cwd if not absolute)
    const getFileContent = (raw: string): { path: string; content: string } | null => {
      let filePath: string;
      if (raw.startsWith("/")) filePath = normalizePath(raw);
      else filePath = normalizePath(joinPaths(cwd, raw));
      const node = findNodeByPath(fileSystem, filePath);
      if (!node || node.type !== "file") return null;
      return { path: filePath, content: node.content || "" };
    };
    if (cmd === "cd") {
      if (parts.length === 1) {
        setCwd(HOME);
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
        setInput("");
        return;
      }
      const node = findNodeByPath(fileSystem, targetPath);
      if (!node || node.type !== "dir" || !node.children) {
        setLsOutput({ path: targetPath, entries: [], showAll, long: longFormat, human, blocks });
        setInput("");
        return;
      }
      let entries = node.children
        .filter((c) => showAll || showHiddenOverride || !c.name.startsWith("."))
        .map((c) => ({ name: c.name, type: c.type }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      setLsOutput({ path: targetPath, entries, showAll, long: longFormat, human, blocks });
      setInput("");
    } else if (cmd === "cat") {
      if (parts.length < 2) {
        setError("cat: missing operand");
        return;
      }
      const outputs: string[] = [];
      for (const raw of parts.slice(1)) {
        const file = getFileContent(raw);
        if (!file) {
          setError(`cat: ${raw}: No such file`);
          continue;
        }
        if (parts.length > 2) {
          outputs.push(`==> ${file.path} <==`);
        }
        outputs.push(file.content);
      }
      setTextOutput(outputs.join("\n"));
      setInput("");
    } else if (cmd === "head" || cmd === "tail") {
      if (parts.length < 2) {
        setError(`${cmd}: missing operand`);
        return;
      }
      let num = 10;
      let idx = 1;
      if (parts[1] === "-n" && parts.length >= 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) num = parsed;
        idx = 3;
      } else if (/^-\d+$/.test(parts[1])) {
        const parsed = parseInt(parts[1].slice(1), 10);
        if (!isNaN(parsed)) num = parsed;
        idx = 2;
      }
      if (parts.length <= idx) {
        setError(`${cmd}: missing file operand`);
        return;
      }
      const outputs: string[] = [];
      for (const raw of parts.slice(idx)) {
        const file = getFileContent(raw);
        if (!file) {
          setError(`${cmd}: ${raw}: No such file`);
          continue;
        }
        const lines = file.content.split("\n");
        let selected: string[];
        if (cmd === "head") {
          selected = lines.slice(0, num);
        } else {
          selected = lines.slice(-num);
        }
        if (parts.slice(idx).length > 1) {
          outputs.push(`==> ${file.path} <==`);
        }
        outputs.push(selected.join("\n"));
      }
      setTextOutput(outputs.join("\n"));
      setInput("");
    } else if (cmd === "wc") {
      if (parts.length < 2) {
        setError("wc: missing operand");
        return;
      }
      const flags = { l: false, w: false, c: false };
      let idx = 1;
      while (parts[idx]?.startsWith("-") && parts[idx].length > 1) {
        for (let j = 1; j < parts[idx].length; ++j) {
          const ch = parts[idx][j];
          if (ch === "l") flags.l = true;
          if (ch === "w") flags.w = true;
          if (ch === "c") flags.c = true;
        }
        idx++;
      }
      const files = parts.slice(idx);
      if (files.length === 0) {
        setError("wc: missing file operand");
        return;
      }
      const linesTotals = { lines: 0, words: 0, bytes: 0 };
      const perFileOutputs: string[] = [];
      for (const raw of files) {
        const file = getFileContent(raw);
        if (!file) {
          setError(`wc: ${raw}: No such file`);
          continue;
        }
        const content = file.content;
        const lines = content.split("\n").length;
        const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
        const bytes = new TextEncoder().encode(content).length;
        linesTotals.lines += lines;
        linesTotals.words += words;
        linesTotals.bytes += bytes;
        let partsOut: string[] = [];
        if (!flags.l && !flags.w && !flags.c) {
          partsOut = [String(lines), String(words), String(bytes)];
        } else {
          if (flags.l) partsOut.push(String(lines));
          if (flags.w) partsOut.push(String(words));
          if (flags.c) partsOut.push(String(bytes));
        }
        partsOut.push(file.path);
        perFileOutputs.push(partsOut.join(" "));
      }
      if (files.length > 1) {
        let totalParts: string[] = [];
        if (!flags.l && !flags.w && !flags.c) {
          totalParts = [String(linesTotals.lines), String(linesTotals.words), String(linesTotals.bytes), "total"];
        } else {
          if (flags.l) totalParts.push(String(linesTotals.lines));
          if (flags.w) totalParts.push(String(linesTotals.words));
          if (flags.c) totalParts.push(String(linesTotals.bytes));
          totalParts.push("total");
        }
        perFileOutputs.push(totalParts.join(" "));
      }
      setTextOutput(perFileOutputs.join("\n"));
      setInput("");
    } else if (cmd === "grep") {
      if (parts.length < 3) {
        setError("grep: missing operand");
        return;
      }
      let ignoreCase = false;
      let idxGrep = 1;
      while (parts[idxGrep]?.startsWith("-") && parts[idxGrep].length > 1) {
        if (parts[idxGrep].includes("i")) ignoreCase = true;
        idxGrep++;
      }
      const pattern = parts[idxGrep];
      if (!pattern) {
        setError("grep: missing pattern");
        return;
      }
      idxGrep++;
      const filesGrep = parts.slice(idxGrep);
      if (filesGrep.length === 0) {
        setError("grep: missing file");
        return;
      }
      const outLinesGrep: string[] = [];
      let regex: RegExp | null = null;
      try {
        regex = new RegExp(pattern, ignoreCase ? "i" : "");
      } catch (e) {
        regex = null;
      }
      for (const raw of filesGrep) {
        const file = getFileContent(raw);
        if (!file) {
          setError(`grep: ${raw}: No such file`);
          continue;
        }
        const lines = file.content.split("\n");
        for (const line of lines) {
          let match = false;
          if (regex) {
            match = regex.test(line);
          } else {
            if (ignoreCase) {
              match = line.toLowerCase().includes(pattern.toLowerCase());
            } else {
              match = line.includes(pattern);
            }
          }
          if (match) {
            if (filesGrep.length > 1) {
              outLinesGrep.push(`${file.path}:${line}`);
            } else {
              outLinesGrep.push(line);
            }
          }
        }
      }
      setTextOutput(outLinesGrep.join("\n"));
      setInput("");
    } else if (cmd === "cut") {
      if (parts.length < 2) {
        setError("cut: missing operand");
        return;
      }
      let fieldsArg: string | null = null;
      let delim = "\t";
      let idxCut = 1;
      while (idxCut < parts.length) {
        const p = parts[idxCut];
        if (p.startsWith("-f")) {
          if (p === "-f") {
            idxCut++;
            fieldsArg = parts[idxCut] || null;
          } else {
            fieldsArg = p.slice(2);
          }
          idxCut++;
        } else if (p.startsWith("-d")) {
          if (p === "-d") {
            idxCut++;
            delim = parts[idxCut] || "\t";
          } else {
            delim = p.slice(2);
          }
          idxCut++;
        } else {
          break;
        }
      }
      if (!fieldsArg) {
        setError("cut: missing -f option");
        return;
      }
      const filesCut = parts.slice(idxCut);
      if (filesCut.length === 0) {
        setError("cut: missing file");
        return;
      }
      const delimChar = delim === "\\t" ? "\t" : delim;
      const fieldNums = fieldsArg
        .split(",")
        .map((f) => parseInt(f, 10))
        .filter((n) => !isNaN(n) && n > 0);
      if (fieldNums.length === 0) {
        setError("cut: invalid field list");
        return;
      }
      const outLinesCut: string[] = [];
      for (const raw of filesCut) {
        const file = getFileContent(raw);
        if (!file) {
          setError(`cut: ${raw}: No such file`);
          continue;
        }
        const lines = file.content.split("\n");
        if (filesCut.length > 1) {
          outLinesCut.push(`==> ${file.path} <==`);
        }
        for (const line of lines) {
          const cols = line.split(delimChar);
          const selected = fieldNums.map((n) => (n - 1 < cols.length ? cols[n - 1] : ""));
          outLinesCut.push(selected.join(delimChar));
        }
      }
      setTextOutput(outLinesCut.join("\n"));
      setInput("");
    } else {
      setError(`Unknown command: ${cmd}. Supported: cd, ls, cat, head, tail, wc, grep, cut.`);
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

  const getFileContent = (raw: string): { path: string; content: string } | null => {
    let target: string;
    if (raw.startsWith("/")) {
      target = normalizePath(raw);
    } else {
      target = normalizePath(joinPaths(cwd, raw));
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
    if (parts.length >= 2) {
      const cmd = parts[0];
      let argForCompletion = "";
      if (cmd === "cd" || cmd === "ls") {
        argForCompletion = parts.slice(1).join(" ");
      } else if (["cat", "head", "tail", "wc", "cut"].includes(cmd)) {
        argForCompletion = parts[parts.length - 1];
      } else if (cmd === "grep") {
        if (parts.length >= 3) {
          argForCompletion = parts[parts.length - 1];
        }
      }
      if (argForCompletion) {
        setSuggestions(getPathCompletions(argForCompletion));
        return;
      }
    }
    setSuggestions([]);
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
              Show hidden files
            </label>
            <button style={{ marginLeft: 12 }} onClick={collapseAll} aria-label="Collapse all folders">
              Collapse all folders
            </button>
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
          <div className="hint" style={{ marginTop: 8 }}>
            <p style={{ margin: 0 }}>
              Navigation: <kbd>←</kbd> parent, <kbd>→</kbd> first child directory, <kbd>↑</kbd>/<kbd>↓</kbd> among sibling directories. Clicking a directory name sets CWD. Clicking the folder icon toggles collapse/expand.
            </p>
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
            {textOutput && (
              <div className="section">
                <div className="label">Output:</div>
                <div className="code-block" style={{ padding: "6px 12px", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{textOutput}</pre>
                </div>
              </div>
            )}
            {error && <div className="error">{error}</div>}
            <div className="hint" style={{ marginTop: 8 }}>
              <p style={{ margin: 0 }}>
                Supported commands:<br />
                <CommandWithTooltip cmdKey="cd"><code>cd &lt;path&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="ls"><code>ls [-a|-l|-h|-s] [&lt;path&gt;]</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="cat"><code>cat &lt;file&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="head"><code>head [-n N] &lt;file&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="tail"><code>tail [-n N] &lt;file&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="wc"><code>wc [-l|-w|-c] &lt;file&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="grep"><code>grep [-i] &lt;pattern&gt; &lt;file&gt;</code></CommandWithTooltip><br />
                <CommandWithTooltip cmdKey="cut"><code>cut [-d DELIM] -f LIST &lt;file&gt;...</code></CommandWithTooltip>.
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
                    <div className="label"></div>
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