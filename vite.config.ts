import React, { useState } from "react";
import {
  fileSystem,
  findNodeByPath,
  isDirectory,
  joinPaths,
  normalizePath,
  getMetadata,
  getFileContent,
  getDirSize,
  humanReadableSize,
  showHiddenOverride,
} from "./fs-utils";

type LsOutput = {
  path: string;
  entries: { name: string; type: string }[];
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

export default function App() {
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("/");
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const [lsOutput, setLsOutput] = useState<LsOutput | null>(null);
  const [duOutput, setDuOutput] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShellSubmit = () => {
    const trimmed = input.trim();

    // simple pipe support: split on '|', execute sequentially, passing previous text output as stdin
    const stages = trimmed.split("|").map((s) => s.trim()).filter(Boolean);
    if (stages.length > 1) {
      let currentText: string | null = null;
      let lastLs: LsOutput | null = null;
      let lastDu: any = null;

      const runSingle = (raw: string, stdin: string | null) => {
        const parts = raw.split(" ").filter(Boolean);
        const cmd = parts[0];
        const result: { text: string | null; ls: LsOutput | null; du: any | null; error: string | null } = {
          text: null,
          ls: null,
          du: null,
          error: null
        };
        if (cmd === "cd") {
          result.error = "cd: cannot be piped";
          return result;
        }
        if (cmd === "ls") {
          // reuse ls parsing logic
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
            const rawT = parts.slice(argStart).join(" ");
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
            // text fallback
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
          // create textual version for piping
          const lines: string[] = [];
          if (longFormat) {
            for (const e of entries) {
              const fullPath = joinPaths(targetPath, e.name);
              const node2 = findNodeByPath(fileSystem, fullPath);
              let perms = "";
              let sizeStr = "";
              let mtimeStr = "";
              if (node2) {
                const meta = getMetadata(fullPath, node2);
                perms = meta.permissions;
                sizeStr = human ? humanReadableSize(meta.size) : `${meta.size}`;
                mtimeStr = meta.mtime.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
              }
              const nameDisplay = e.type === "dir" ? e.name + "/" : e.name;
              const blockPart = blocks ? `${Math.ceil((node2 ? (node2.type === "dir" ? getDirSize(fullPath) : getMetadata(fullPath, node2).size) : 0) / 1024)} ` : "";
              lines.push(`${blockPart}${perms} ${nameDisplay} ${sizeStr} ${mtimeStr}`.trim());
            }
          } else {
            for (const e of entries) {
              const nameDisplay = e.type === "dir" ? e.name + "/" : e.name;
              if (blocks) {
                const fullPath = joinPaths(targetPath, e.name);
                const node2 = findNodeByPath(fileSystem, fullPath);
                const size = node2 ? (node2.type === "dir" ? getDirSize(fullPath) : getMetadata(fullPath, node2).size) : 0;
                const blockCount = Math.ceil(size / 1024);
                const blockStr = human ? humanReadableSize(blockCount * 1024) : String(blockCount);
                lines.push(`${blockStr} ${nameDisplay}`);
              } else {
                lines.push(nameDisplay);
              }
            }
          }
          result.text = lines.join("\n");
          return result;
        } else if (cmd === "cat") {
          if (parts.length >= 2) {
            const outputs: string[] = [];
            for (const raw of parts.slice(1)) {
              const file = getFileContent(raw);
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
            const file = getFileContent(raw);
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
          const perFileOutputs: string[] = [];
          const totals = { lines: 0, words: 0, bytes: 0 };
          if (files.length === 0) {
            if (stdin !== null) {
              const content = stdin;
              const lines = content.split("\n").length;
              const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
              const bytes = new TextEncoder().encode(content).length;
              totals.lines += lines;
              totals.words += words;
              totals.bytes += bytes;
              let partsOut: string[] = [];
              if (!flags.l && !flags.w && !flags.c) {
                partsOut = [String(lines), String(words), String(bytes)];
              } else {
                if (flags.l) partsOut.push(String(lines));
                if (flags.w) partsOut.push(String(words));
                if (flags.c) partsOut.push(String(bytes));
              }
              result.text = [...partsOut, "-"].join(" ");
              return result;
            } else {
              result.error = "wc: missing file operand";
              return result;
            }
          }
          for (const raw of files) {
            const file = getFileContent(raw);
            if (!file) {
              result.error = `wc: ${raw}: No such file`;
              continue;
            }
            const content = file.content;
            const lines = content.split("\n").length;
            const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
            const bytes = new TextEncoder().encode(content).length;
            totals.lines += lines;
            totals.words += words;
            totals.bytes += bytes;
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
              totalParts = [String(totals.lines), String(totals.words), String(totals.bytes), "total"];
            } else {
              if (flags.l) totalParts.push(String(totals.lines));
              if (flags.w) totalParts.push(String(totals.words));
              if (flags.c) totalParts.push(String(totals.bytes));
              totalParts.push("total");
            }
            perFileOutputs.push(totalParts.join(" "));
          }
          result.text = perFileOutputs.join("\n");
          return result;
        } else if (cmd === "grep") {
          if (parts.length < 3 && stdin === null) {
            result.error = "grep: missing operand";
            return result;
          }
          let ignoreCase = false;
          let idxGrep = 1;
          while (parts[idxGrep]?.startsWith("-") && parts[idxGrep].length > 1) {
            if (parts[idxGrep].includes("i")) ignoreCase = true;
            idxGrep++;
          }
          const pattern = parts[idxGrep];
          if (!pattern) {
            result.error = "grep: missing pattern";
            return result;
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
          if (filesGrep.length === 0) {
            if (stdin !== null) {
              const lines = stdin.split("\n");
              for (const line of lines) {
                let match = false;
                if (regex) {
                  match = regex.test(line);
                } else {
                  if (ignoreCase) match = line.toLowerCase().includes(pattern.toLowerCase());
                  else match = line.includes(pattern);
                }
                if (match) outLinesGrep.push(line);
              }
            } else {
              result.error = "grep: missing file";
              return result;
            }
          } else {
            for (const raw of filesGrep) {
              const file = getFileContent(raw);
              if (!file) {
                result.error = `grep: ${raw}: No such file`;
                continue;
              }
              const lines = file.content.split("\n");
              for (const line of lines) {
                let match = false;
                if (regex) {
                  match = regex.test(line);
                } else {
                  if (ignoreCase) match = line.toLowerCase().includes(pattern.toLowerCase());
                  else match = line.includes(pattern);
                }
                if (match) {
                  if (filesGrep.length > 1) outLinesGrep.push(`${file.path}:${line}`);
                  else outLinesGrep.push(line);
                }
              }
            }
          }
          result.text = outLinesGrep.join("\n");
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
          if (filesCut.length === 0) {
            if (stdin === null) {
              result.error = "cut: missing file";
              return result;
            }
          }
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
          if (filesCut.length === 0 && stdin !== null) {
            const lines = stdin.split("\n");
            for (const line of lines) {
              const cols = line.split(delimChar);
              const selected = fieldNums.map((n) => (n - 1 < cols.length ? cols[n - 1] : ""));
              outLinesCut.push(selected.join(delimChar));
            }
          } else {
            for (const raw of filesCut) {
              const file = getFileContent(raw);
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
        } else {
          result.error = `Unknown command: ${cmd}. Supported: cd, ls, cat, head, tail, wc, grep, cut.`;
          return result;
        }
      };

      for (const stage of stages) {
        const out = runSingle(stage, currentText);
        if (out.error) {
          setError(out.error);
          return;
        }
        if (out.ls) lastLs = out.ls;
        if (out.du) lastDu = out.du;
        if (out.text !== null) {
          currentText = out.text;
        } else if (out.ls) {
          // fallback to textualize ls for next pipe
          currentText = out.ls.entries
            .map((e) => (e.type === "dir" ? e.name + "/" : e.name))
            .join("\n");
        }
      }
      // apply final outputs
      if (lastLs) setLsOutput(lastLs);
      if (lastDu) setDuOutput(lastDu);
      if (currentText !== null) setTextOutput(currentText);
      setInput("");
      return;
    }

    if (trimmed === "") return;

    const parts = trimmed.split(" ").filter(Boolean);
    const cmd = parts[0];

    if (cmd === "cd") {
      if (parts.length < 2) {
        setError("cd: missing operand");
        return;
      }
      let newPath = parts[1];
      if (!newPath.startsWith("/")) {
        newPath = normalizePath(joinPaths(cwd, newPath));
      }
      if (!isDirectory(fileSystem, newPath)) {
        setError(`cd: no such directory: ${parts[1]}`);
        return;
      }
      setCwd(newPath);
      setInput("");
      setTextOutput(null);
      setLsOutput(null);
      setDuOutput(null);
      setError(null);
      return;
    } else if (cmd === "ls") {
      // existing ls logic here (unchanged)
      // ...
    }
    // other existing command handling (unchanged)
  };

  return (
    <div>
      {/* UI elements */}
    </div>
  );
}