// 1. Imports & Types
import { useState, useEffect } from "react";
import { FSNode } from "../fs";
import { normalizePath, joinPaths, relativePath } from "../utils/path";
import { expandTilde } from "../utils/path";
import { getFileContentLocal } from "../utils/fs";
import { getPathCompletions } from "../utils/completion";

export type LsOutput = {
  path: string;
  entries: { name: string; type: "dir" | "file" }[];
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

export function useShell(params: {
  cwd: string;
  setCwd: (path: string) => void;
  fileSystem: FSNode;
  HOME: string;
  findNodeByPath: (root: FSNode, path: string) => FSNode | null;
  isDirectory: (root: FSNode, path: string) => boolean;
}) {
  // 2. Hook Signature & Destructure Params
  const { cwd, setCwd, fileSystem, HOME, findNodeByPath, isDirectory } = params;

  // 3. State Declarations
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lsOutput, setLsOutput] = useState<LsOutput | null>(null);
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 4. Helpers (now imported)

  // 5. Command Execution Logic
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
          rawT = expandTilde(rawT, HOME);
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
        .filter((c) => showAll || !c.name.startsWith("."))
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
          const file = getFileContentLocal(
            raw,
            cwd,
            HOME,
            findNodeByPath,
            fileSystem,
            (p) => expandTilde(p, HOME)
          );
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

  // 6. Input Validation & 7. Handlers
  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTextOutput(null);
    setLsOutput(null);
    const trimmed = input.trim();
    setLastCommand(trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);

    // --- Input Validation ---
    // 1. Disallow empty input (already handled)
    if (trimmed === "") {
      setInput("");
      return;
    }

    // 2. Disallow unsupported/dangerous characters
    // (e.g., backticks, semicolons, &&, ||, >, <, $)
    if (/[`;&|><$]/.test(trimmed.replace(/\|/g, ""))) { // allow pipe for chaining
      setError("Unsupported or potentially dangerous characters in command.");
      setInput("");
      return;
    }

    // 3. Limit command length
    if (trimmed.length > 200) {
      setError("Command too long.");
      setInput("");
      return;
    }

    // 4. Validate command name
    const allowedCommands = [
      "cd", "pwd", "ls", "cat", "head", "tail", "wc", "grep", "cut"
    ];
    const firstCmd = trimmed.split(/\s+/)[0];
    if (
      !allowedCommands.includes(firstCmd) &&
      !trimmed.includes("|") // allow pipes for chaining
    ) {
      setError(`Unknown command: ${firstCmd}. Supported: ${allowedCommands.join(", ")}.`);
      setInput("");
      return;
    }

    const stages = trimmed.split("|").map((s) => s.trim()).filter(Boolean);

    if (stages.length > 1) {
      let currentText: string | null = null;
      let lastLs: LsOutput | null = null;
      for (const stage of stages) {
        const out = runSingle(stage, currentText);
        if (out.error) {
          setError(out.error);
          setInput("");
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
    // Always clear the prompt
      setInput("");
      if (singleParts.length === 1) {
        setCwd(HOME);
        setInput("");
        return;
      }
      const targetRaw = singleParts.slice(1).join(" ");
      let target: string;
      const expandedRaw = targetRaw.startsWith("~") ? expandTilde(targetRaw, HOME) : targetRaw;
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
        setInput("");
      }
      return;
    }
    const out = runSingle(trimmed, null);
    if (out.error) {
      setError(out.error);
      setInput("");
      return;
    }
    if (out.ls) setLsOutput(out.ls);
    if (out.text !== null) setTextOutput(out.text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length) {
        // pick first suggestion
        const s = suggestions[0];
        const parts = input.trim().split(/\s+/);
        const cmd = parts[0] || "";
        const newVal = `${cmd} ${s}${s.endsWith("/") ? "" : " "}`;
        setInput(newVal);
        setSuggestions([]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistoryIndex((prev) => {
        const idx = prev === null ? history.length - 1 : Math.max(0, prev - 1);
        setInput(history[idx] || "");
        return idx;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== null) {
        const idx = Math.min(history.length - 1, historyIndex + 1);
        setInput(history[idx] || "");
        setHistoryIndex(idx);
      }
    }
  };

  // 8. Effects
  useEffect(() => {
    // Autocomplete logic
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
      setSuggestions(
        getPathCompletions(
          argForCompletion,
          cwd,
          HOME,
          fileSystem,
          findNodeByPath,
          (p) => expandTilde(p, HOME)
        )
      );
      return;
    }
    setSuggestions([]);
  }, [input, cwd, HOME, fileSystem, findNodeByPath]);

  // 9. Return Statement
  return {
    input,
    setInput,
    error,
    lsOutput,
    textOutput,
    lastCommand,
    history,
    historyIndex,
    suggestions,
    handleShellSubmit,
    handleKeyDown,
    setError,
    setLsOutput,
    setTextOutput,
    setLastCommand,
    setHistory,
    setHistoryIndex,
    setSuggestions,
  };
}