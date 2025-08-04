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
  const SYSTEM_FOLDER_INFO: Record<string, { description: string; advice: string }> = {
    "/": {
      description: "Root of the filesystem; contains standard top-level directories like /bin, /etc, /home.",
      advice: "Novices should mostly explore under /home. Be cautious modifying anything outside your user space."
    },
    "/home": {
      description: "Personal user directories. Typically where users keep their files and projects.",
      advice: "Safe to explore and create files here. This is the recommended area for novice activity."
    },
    "/bin": {
      description: "Essential user command binaries (e.g., ls, cat, mkdir).",
      advice: "Useful to view and learn what commands exist; avoid modifying or deleting these."
    },
    "/sbin": {
      description: "System administration binaries (usually requires elevated privileges).",
      advice: "Novices should generally avoid using or modifying these unless instructed."
    },
    "/etc": {
      description: "Configuration files for the system and services.",
      advice: "Reading is okay for learning; editing can break system behavior unless you understand the file."
    },
    "/usr": {
      description: "Read-only user utilities and applications, including /usr/bin and /usr/sbin.",
      advice: "Safe to explore for understanding installed software. Avoid modifying unless advanced."
    },
    "/var": {
      description: "Variable data like logs, mail spools, and caches.",
      advice: "Examining log files can help debug; do not delete or change contents casually."
    },
    "/tmp": {
      description: "Temporary files storage, cleaned periodically.",
      advice: "Safe to use and inspect; contents can vanish at any time."
    },
    "/dev": {
      description: "Device nodes representing hardware and pseudo-devices.",
      advice: "Do not modify; can view to see what devices the system exposes."
    },
    "/proc": {
      description: "Virtual filesystem exposing kernel and process information.",
      advice: "Safe to explore read-only to learn about system state."
    },
    "/root": {
      description: "Home directory of the superuser (root).",
      advice: "Not typically needed for regular users; avoid unless performing privileged admin tasks."
    },
    "/lib": {
      description: "Shared libraries needed for program execution.",
      advice: "Do not modify—breaking these can prevent programs from running."
    },
    "/opt": {
      description: "Optional add-on software packages.",
      advice: "Usually safe to browse; contents depend on installed third-party tools."
    },
    "/boot": {
      description: "Boot loader and kernel-related files.",
      advice: "Avoid modifying unless you understand boot mechanics; mistakes can prevent startup."
    },
    "/mnt": {
      description: "Temporary mount points for filesystems.",
      advice: "Safe to inspect; typically empty unless something is mounted."
    },
    "/media": {
      description: "Mount points for removable media (USB drives, CDs).",
      advice: "Safe to explore when devices are mounted."
    }
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
  const [input, setInput] = useState<string>(``);
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
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

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

  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTextOutput(null);
    setLsOutput(null);
    const trimmed = input.trim();
    setLastCommand(trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    if (trimmed === "") return;

    // Helper to get file content by path (relative to cwd if not absolute), with tilde expansion
    const getFileContentLocal = (raw: string): { path: string; content: string } | null => {
      let filePath: string;
      let expanded = raw;
      if (raw.startsWith("~")) {
        expanded = expandTilde(raw);
      }
      if (expanded.startsWith("/")) filePath = normalizePath(expanded);
      else filePath = normalizePath(joinPaths(cwd, expanded));
      const node = findNodeByPath(fileSystem, filePath);
      if (!node || node.type !== "file") return null;
      return { path: filePath, content: node.content || "" };
    };

    // simple pipe support: split on '|', execute sequentially, passing previous text output as stdin
    const stages = trimmed.split("|").map((s) => s.trim()).filter(Boolean);

    const runSingle = (
      raw: string,
      stdin: string | null
    ): { text: string | null; ls: LsOutput | null; error: string | null } => {
      const parts = raw.split(" ").filter(Boolean);
      const cmd = parts[0];
      const result: { text: string | null; ls: LsOutput | null; error: string | null } = {
        text: null,
        ls: null,
        error: null
      };
      // cd cannot be piped
      if (cmd === "cd") {
        result.error = "cd: cannot be piped";
        return result;
      }

      if (cmd === "ls") {
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
          let rawT = parts.slice(argStart).join(" ");
          if (rawT.startsWith("~")) {
            rawT = expandTilde(rawT);
          }
          if (rawT.startsWith("/")) targetPath = normalizePath(rawT);
          else targetPath = normalizePath(joinPaths(cwd, rawT));
        }
        if (!isDirectory(fileSystem, targetPath)) {
          result.error = `ls: cannot access '${parts.slice(argStart).join(" ")}': No such directory`;
          return result;
        }
        const node = findNodeByPath(fileSystem, targetPath);
        if (!node || node.type !== "dir" || !node.children) {
          result.ls = { path: targetPath, entries: [], showAll, long: longFormat, human, blocks };
          result.text = "";
          return result;
        }
        let entries = node.children
          .filter((c) => showAll || showHiddenOverride || !c.name.startsWith("."))
          .map((c) => ({ name: c.name, type: c.type }))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        result.ls = { path: targetPath, entries, showAll, long: longFormat, human, blocks };
        result.text = entries.map((e) => (e.type === "dir" ? e.name + "/" : e.name)).join("\n");
        return result;
      } else if (cmd === "cat") {
        if (parts.length >= 2) {
          const outputs: string[] = [];
          for (const raw of parts.slice(1)) {
            const file = getFileContentLocal(raw);
            if (!file) {
              result.error = `cat: ${raw}: No such file`;
              continue;
            }
            if (parts.slice(1).length > 1) {
              outputs.push(`==> ${file.path} <==`);
            }
            outputs.push(file.content);
          }
          result.text = outputs.join("\n");
          return result;
        } else if (stdin !== null) {
          result.text = stdin;
          return result;
        } else {
          result.error = "cat: missing operand";
          return result;
        }
      } else if (cmd === "head" || cmd === "tail") {
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
        let contentSource: string | null = null;
        if (parts.length > idx) {
          const raw = parts.slice(idx).join(" ");
          const file = getFileContentLocal(raw);
          if (!file) {
            result.error = `${cmd}: ${raw}: No such file`;
            return result;
          }
          contentSource = file.content;
        } else if (stdin !== null) {
          contentSource = stdin;
        } else {
          result.error = `${cmd}: missing operand`;
          return result;
        }
        const lines = contentSource.split("\n");
        let selected: string[];
        if (cmd === "head") selected = lines.slice(0, num);
        else selected = lines.slice(-num);
        result.text = selected.join("\n");
        return result;
      } else if (cmd === "wc") {
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
        const linesTotals = { lines: 0, words: 0, bytes: 0 };
        const perFileOutputs: string[] = [];
        const processContent = (content: string, name: string) => {
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
          partsOut.push(name);
          perFileOutputs.push(partsOut.join(" "));
        };
        if (files.length === 0) {
          if (stdin !== null) {
            processContent(stdin, "-");
          } else {
            result.error = "wc: missing file operand";
            return result;
          }
        } else {
          for (const raw of files) {
            const file = getFileContentLocal(raw);
            if (!file) {
              result.error = `wc: ${raw}: No such file`;
              continue;
            }
            processContent(file.content, file.path);
          }
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
        result.text = perFileOutputs.join("\n");
        return result;
      } else if (cmd === "grep") {
        let ignoreCase = false;
        let countFlag = false;
        let idxGrep = 1;
        while (parts[idxGrep]?.startsWith("-") && parts[idxGrep].length > 1) {
          for (let j = 1; j < parts[idxGrep].length; ++j) {
            const ch = parts[idxGrep][j];
            if (ch === "i") ignoreCase = true;
            if (ch === "c") countFlag = true;
          }
          idxGrep++;
        }
        let pattern = parts[idxGrep];
        if (!pattern) {
          result.error = "grep: missing pattern";
          return result;
        }
        // strip surrounding single or double quotes if present
        if ((pattern.startsWith("'") && pattern.endsWith("'") && pattern.length >= 2) || (pattern.startsWith("\"") && pattern.endsWith("\"") && pattern.length >= 2)) {
          pattern = pattern.slice(1, -1);
        }
        idxGrep++;
        const filesGrep = parts.slice(idxGrep);
        const outLinesGrep: string[] = [];
        let regex: RegExp | null = null;
        try {
          regex = new RegExp(pattern, ignoreCase ? "i" : "");
        } catch (e) {
          regex = null;
        }
        const processLines = (lines: string[], name?: string) => {
          let matchCount = 0;
          const matched: string[] = [];
          for (const line of lines) {
            let match = false;
            if (regex) {
              match = regex.test(line);
            } else {
              if (ignoreCase) match = line.toLowerCase().includes(pattern.toLowerCase());
              else match = line.includes(pattern);
            }
            if (match) {
              matchCount++;
              if (!countFlag) {
                if (name && filesGrep.length > 1) matched.push(`${name}:${line}`);
                else matched.push(line);
              }
            }
          }
          if (countFlag) {
            if (name && filesGrep.length > 1) return `${name}:${matchCount}`;
            return String(matchCount);
          }
          return matched.join("\n");
        };
        if (filesGrep.length === 0) {
          if (stdin !== null) {
            const lines = stdin.split("\n");
            const out = processLines(lines);
            result.text = out;
          } else {
            result.error = "grep: missing file";
            return result;
          }
        } else {
          const perFile: string[] = [];
          for (const raw of filesGrep) {
            const file = getFileContentLocal(raw);
            if (!file) {
              result.error = `grep: ${raw}: No such file`;
              continue;
            }
            const lines = file.content.split("\n");
            const out = processLines(lines, file.path);
            perFile.push(out as string);
          }
          result.text = perFile.join("\n");
        }
        return result;
      } else if (cmd === "cut") {
        if (parts.length < 2) {
          result.error = "cut: missing operand";
          return result;
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
          result.error = "cut: missing -f option";
          return result;
        }
        const filesCut = parts.slice(idxCut);
        const delimChar = delim === "\\t" ? "\t" : delim;
        const fieldNums = fieldsArg
          .split(",")
          .map((f) => parseInt(f, 10))
          .filter((n) => !isNaN(n) && n > 0);
        if (fieldNums.length === 0) {
          result.error = "cut: invalid field list";
          return result;
        }
        const outLinesCut: string[] = [];
        if (filesCut.length === 0) {
          if (stdin !== null) {
            const lines = stdin.split("\n");
            for (const line of lines) {
              const cols = line.split(delimChar);
              const selected = fieldNums.map((n) => (n - 1 < cols.length ? cols[n - 1] : ""));
              outLinesCut.push(selected.join(delimChar));
            }
          } else {
            result.error = "cut: missing file";
            return result;
          }
        } else {
          for (const raw of filesCut) {
            const file = getFileContentLocal(raw);
            if (!file) {
              result.error = `cut: ${raw}: No such file`;
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
        }
        result.text = outLinesCut.join("\n");
        return result;
      } else if (cmd === "pwd") {
        result.text = cwd;
        return result;
      } else {
        result.error = `Unknown command: ${cmd}. Supported: cd, pwd, ls, cat, head, tail, wc, grep, cut.`;
        return result;
      }
    };

    if (stages.length > 1) {
      let currentText: string | null = null;
      let lastLs: LsOutput | null = null;
      for (const stage of stages) {
        const out = runSingle(stage, currentText);
        if (out.error) {
          setError(out.error);
          return;
        }
        if (out.ls) lastLs = out.ls;
        if (out.text !== null) {
          currentText = out.text;
        } else if (out.ls) {
          currentText = out.ls.entries
            .map((e) => (e.type === "dir" ? e.name + "/" : e.name))
            .join("\n");
        }
      }
      if (lastLs) setLsOutput(lastLs);
      if (currentText !== null) setTextOutput(currentText);
      setInput("");
      return;
    }

    // no pipe: single command fallback
    const singleParts = trimmed.split(" ").filter(Boolean);
    const singleCmd = singleParts[0];
    if (singleCmd === "cd") {
      if (singleParts.length === 1) {
        setCwd(HOME);
        setInput("");
        return;
      }
      const targetRaw = singleParts.slice(1).join(" ");
      let target: string;
      const expandedRaw = targetRaw.startsWith("~") ? expandTilde(targetRaw) : targetRaw;
      if (expandedRaw.startsWith("/")) {
        target = normalizePath(expandedRaw);
      } else {
        target = normalizePath(joinPaths(cwd, expandedRaw));
      }
      if (isDirectory(fileSystem, target)) {
        setCwd(target);
        setInput("");
      } else {
        setError(`cd: not a directory: ${targetRaw}`);
      }
      return;
    }
    const out = runSingle(trimmed, null);
    if (out.error) {
      setError(out.error);
      return;
    }
    if (out.ls) setLsOutput(out.ls);
    if (out.text !== null) setTextOutput(out.text);
    setInput("");
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

  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    // Only complete file/folder paths, never suggest command names.
    const stages = input.split("|").map((s) => s);
    const lastStage = stages[stages.length - 1];
    const trimmedStage = lastStage.trimStart();
    const tokens = trimmedStage.trim().split(/\s+/).filter(Boolean);
    const stageEndsWithSpace = /\s$/.test(lastStage);

    let argForCompletion: string | null = null;
    if (tokens.length === 0) {
      setSuggestions([]);
      return;
    }
    const cmd = tokens[0];
    if (cmd === "cd" || cmd === "ls") {
      if (stageEndsWithSpace) {
        argForCompletion = "";
      } else if (tokens.length >= 2) {
        argForCompletion = tokens[tokens.length - 1];
      }
    } else if (["cat", "head", "tail", "wc", "cut"].includes(cmd)) {
      if (stageEndsWithSpace) {
        argForCompletion = "";
      } else if (tokens.length >= 2) {
        argForCompletion = tokens[tokens.length - 1];
      }
    } else if (cmd === "grep") {
      // grep <pattern> <file>
      if (tokens.length >= 3) {
        if (stageEndsWithSpace) {
          argForCompletion = "";
        } else {
          argForCompletion = tokens[tokens.length - 1];
        }
      }
    }

    if (argForCompletion !== null) {
      setSuggestions(getPathCompletions(argForCompletion));
      return;
    }
    setSuggestions([]);
  }, [input, cwd]);

  // Grouped exercise structure
  const allMissions = React.useMemo(() => [
    {
      groupName: "Basics",
      missions: [
        { id: "list-home", description: "List contents of your home directory", isComplete: () => lsOutput?.path === "/home/user" && !lsOutput?.showAll },
        { id: "show-hidden-home", description: "Show hidden files in your home directory", isComplete: () => lsOutput?.path === "/home/user" && lsOutput?.showAll },
        { id: "view-readme", description: "View (cat) README.txt content", isComplete: () => (textOutput?.toLowerCase().includes("filesystem visualizer") ?? false) },
        { id: "cd-thesis", description: "Change directory (cd) to /home/user/Documents/Thesis with a relative path!", isComplete: () => {
          if (normalizePath(cwd) !== "/home/user/Documents/Thesis") return false;
          if (!lastCommand) return false;
          const parts = lastCommand.trim().split(/\s+/);
          if (parts[0] !== "cd") return false;
          const arg = parts.slice(1).join(" ");
          if (!arg) return false;
          if (arg.startsWith("/") || arg.startsWith("~")) return false; // must be relative
          return true;
        } },
      ]
    },
    {
      groupName: "File Viewing",
      missions: [
        { id: "head-chapter1", description: "Show first 5 lines of chapter1.md", isComplete: () => textOutput?.includes("# Chapter 1: Introduction") ?? false },
        { id: "tail-chapter2", description: "Show last lines of chapter2.md", isComplete: () => (textOutput?.includes("1. Data collection") && textOutput?.includes("2. Analysis")) ?? false },
        { id: "search-filesystem", description: "Search for the word 'filesystem' in README.txt", isComplete: () => {
          if (!textOutput) return false;
          if (!lastCommand) return false;
          const out = textOutput.toLowerCase();
          if (!out.includes("filesystem")) return false;
          const cmd = lastCommand.toLowerCase();
          if (!cmd.includes("grep")) return false;
          if (!cmd.includes("filesystem")) return false;
          if (!cmd.includes("readme")) return false;
          return true;
        } },
        { id: "find-example-fasta", description: "Browse the home folder via command line to find example.fasta", isComplete: () => normalizePath(cwd) === "/home/user/Documents/Research" },
      ]
    },
    {
      groupName: "File inspection",
      missions: [
        { id: "count-fasta-seqs", description: "Count sequences in example.fasta (Use grep '^>' to find fasta headers)", isComplete: () => textOutput?.trim().startsWith("3") ?? false },
        { id: "thesis-sizes", description: "List items in Thesis directory with human-readable sizes and block counts using ls -lhs", isComplete: () => lsOutput?.path === "/home/user/Documents/Thesis" && lsOutput?.long && lsOutput?.human && lsOutput?.blocks },
        {
          id: "sample-id-condition",
          description: "Extract sample IDs and conditions from sample metadata in Laura's Research folder using cut -f1,2",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            // must have used cut
            const parts = lastCommand.trim().split(/\s+/);
            if (parts[0] !== "cut") return false;
            // find fields argument for -f1,2 or -f 1,2
            let fieldsArg: string | null = null;
            for (let i = 1; i < parts.length; i++) {
              if (parts[i].startsWith("-f")) {
                if (parts[i] === "-f") {
                  if (parts[i + 1]) fieldsArg = parts[i + 1];
                } else {
                  fieldsArg = parts[i].slice(2);
                }
              }
            }
            if (fieldsArg !== "1,2") return false;
            // check output has header and at least one data line
            const lines = textOutput.trim().split(/\n/);
            if (lines.length < 2) return false;
            const header = lines[0];
            if (!(header.includes("sample_id") && header.includes("condition"))) return false;
            // verify at least one sample line with expected pattern (e.g., s1 control)
            if (!lines.some((line) => line.startsWith("s1") && line.includes("control"))) return false;
            return true;
          }
        },
      ]
    },
    {
      groupName: "Projects & Data",
      missions: [
        { id: "count-expenses", description: "Count number of expense entries (excluding header) in expenses.csv", isComplete: () => { const t = textOutput?.trim(); if (!t) return false; return t.split(/\s+/)[0] === "4"; } },
                {
          id: "count-pipeline-errors",
          description: "Count number of errors in pipeline.log using grep and wc",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("error") || !lc.includes("pipeline.log")) return false;
            const usedCount = lc.includes("-c") || lc.includes("| wc -l");
            if (!usedCount) return false;
            const out = textOutput.trim();
            return /^\d+$/.test(out);
          }
        },
        {
          id: "last-warnings-pipeline",
          description: "Show last 5 warnings from pipeline.log",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("warning") || !lc.includes("pipeline.log")) return false;
            if (!lc.includes("tail")) return false;
            return textOutput.toLowerCase().includes("warning");
          }
        },
        {
          id: "find-kinase-genes",
          description: "Find genes annotated with 'kinase' in gene_annotations.tsv",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("kinase") || !lc.includes("gene_annotations.tsv")) return false;
            return /geneA|geneC|geneE/.test(textOutput);
          }
        },
        {
          id: "count-html-webapp",
          description: "Count .html files in webapp project",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const out = textOutput.trim();
            if (!/^\d+$/.test(out)) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes(".html")) return false;
            return true;
          }
        }
      ]
    }
  ], [lsOutput, textOutput, cwd, lastCommand, normalizePath]);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  useEffect(() => {
    setCompletedMissions((prev) => {
      const copy = new Set(prev);
      allMissions.forEach((group) => {
        group.missions.forEach((m) => {
          if (m.isComplete()) copy.add(m.id);
        });
      });
      return copy;
    });
  }, [cwd, lsOutput, textOutput, lastCommand, allMissions]);

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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div>
                  {/* Show completed/total for current group */}
                  {(() => {
                    const group = allMissions[currentGroupIndex];
                    const groupMissions = group.missions;
                    const completedCount = groupMissions.filter((m) => completedMissions.has(m.id) || m.isComplete()).length;
                    return (
                      <>
                        {completedCount} / {groupMissions.length} complete in <strong>{group.groupName}</strong>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => {
                    setCompletedMissions(new Set());
                    localStorage.removeItem("completedMissions");
                  }}
                  style={{ marginLeft: 12 }}
                >
                  Reset All
                </button>
              </div>
              {/* Tab buttons */}
              <div style={{ marginTop: 10, marginBottom: 4, display: "flex", gap: 6 }}>
                {allMissions.map((group, idx) => (
                  <button
                    key={group.groupName}
                    type="button"
                    onClick={() => setCurrentGroupIndex(idx)}
                    style={{
                      fontWeight: currentGroupIndex === idx ? 700 : 400,
                      background: currentGroupIndex === idx ? "#e0e0e0" : undefined,
                      borderRadius: 4,
                      border: "1px solid #aaa",
                      padding: "2px 8px",
                      cursor: "pointer"
                    }}
                  >
                    {group.groupName}
                  </button>
                ))}
              </div>
              {/* List only missions for current group */}
              <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                {allMissions[currentGroupIndex].missions.map((m) => (
                  <li
                    key={m.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}
                  >
                    <span>{completedMissions.has(m.id) || m.isComplete() ? "✅" : "⬜"}</span>
                    <span>{m.description}</span>
                  </li>
                ))}
              </ul>
              {/* Group summary at bottom */}
              <div style={{ marginTop: 8, fontSize: "0.95em", color: "#666" }}>
                {(() => {
                  const totalCompleted = allMissions.reduce((acc, group) =>
                    acc + group.missions.filter((m) => completedMissions.has(m.id) || m.isComplete()).length, 0);
                  const totalMissions = allMissions.reduce((acc, group) => acc + group.missions.length, 0);
                  return (
                    <span>
                      Overall: {totalCompleted} / {totalMissions} complete
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="shell">
            <form onSubmit={handleShellSubmit}>
              <label htmlFor="shell-input" className="visually-hidden">
                Shell input
              </label>
              <div className="input-row">
                <code className="prompt">{`user@demo:${getPromptCwd()}$`}</code>
                <input
                  id="shell-input"
                  aria-label="Shell input"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setHistoryIndex(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                      if (e.key === "ArrowUp") {
                        setHistoryIndex((prev) => {
                          let newIndex: number | null;
                          if (prev === null) newIndex = history.length - 1;
                          else newIndex = Math.max(0, prev - 1);
                          if (newIndex !== null && history[newIndex] !== undefined) {
                            setInput(history[newIndex]);
                          }
                          return newIndex;
                        });
                      } else {
                        // ArrowDown
                        setHistoryIndex((prev) => {
                          if (prev === null) return null;
                          const newIndex = prev + 1;
                          if (newIndex >= history.length) {
                            setInput("");
                            return null;
                          } else {
                            setInput(history[newIndex]);
                            return newIndex;
                          }
                        });
                      }
                      return;
                    }
                    if (e.key === "Tab") {
                      e.preventDefault();
                      if (suggestions.length === 0) return;
                      // split off last pipe stage
                      const partsByPipe = input.split("|");
                      const lastIdx = partsByPipe.length - 1;
                      const before = partsByPipe.slice(0, lastIdx).join("|");
                      const lastStage = partsByPipe[lastIdx];
                      const endsWithSpace = /\s$/.test(lastStage);
                      const stageTrimmed = lastStage.trimStart();
                      const tokens = stageTrimmed.trim().split(/\s+/).filter(Boolean);
                      let newLastStage = "";

                      if (tokens.length === 0) {
                        // completing a new command in empty stage
                        let completion = suggestions[0];
                        if (!completion.endsWith("/")) completion = completion + " ";
                        newLastStage = completion;
                      } else if (tokens.length === 1 && !endsWithSpace) {
                        // completing the command name
                        let completion = suggestions[0];
                        if (!completion.endsWith(" ")) completion = completion + " ";
                        // preserve leading whitespace
                        const leading = lastStage.match(/^\s*/)?.[0] || "";
                        newLastStage = leading + completion;
                      } else {
                        // completing argument (path) in this stage
                        const lastToken = tokens[tokens.length - 1];
                        let completion = "";
                        if (suggestions.length === 0) {
                          completion = lastToken;
                        } else if (suggestions.length === 1) {
                          completion = suggestions[0];
                        } else {
                          // multiple candidates: use longest common prefix like bash
                          const lcp = longestCommonPrefix(suggestions);
                          if (lcp && lcp !== lastToken) {
                            completion = lcp;
                          } else {
                            completion = suggestions[0];
                          }
                        }
                        // append slash or space appropriately
                        if (completion.endsWith("/")) {
                          // directory: keep slash, no extra space
                        } else if (suggestions.length === 1) {
                          completion = completion + " ";
                        } else if (completion !== lastToken) {
                          // when expanding to longer common prefix, do not add space yet
                        } else {
                          // fallback: add space to the first suggestion if it is unambiguous
                          completion = suggestions[0] + " ";
                        }
                        const prefixTokens = tokens.slice(0, -1);
                        const leadingWhitespace = lastStage.match(/^\s*/)?.[0] || "";
                        newLastStage = leadingWhitespace + [...prefixTokens, completion].join(" ");
                      }
                      const rebuilt = before ? before + "|" + newLastStage : newLastStage;
                      setInput(rebuilt);
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
                <CommandWithTooltip cmdKey="pwd"><code>pwd</code></CommandWithTooltip><br />
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
                  {hovered && (() => {
                    const sysInfo = getSystemFolderInfo(hovered);
                    if (!sysInfo) return null;
                    return (
                      <div className="subsection" style={{ marginTop: 6 }}>
                        <div className="label">About this folder:</div>
                        <div style={{ fontSize: "0.9em" }}>
                          <div>{sysInfo.description}</div>
                          <div style={{ marginTop: 4 }}>
                            <strong>Advice:</strong> {sysInfo.advice}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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