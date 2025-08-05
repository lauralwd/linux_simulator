import React, { useState } from "react";
import { FSNode } from "../fs";

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

  if (!info) return <span>{children}</span>;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      aria-describedby={`tooltip-${cmdKey}`}
    >
      {children}
      {show && (
        <div
          id={`tooltip-${cmdKey}`}
          role="tooltip"
          className="command-tooltip"
        >
          <div className="command-tooltip-title">{info.usage}</div>
          <div>
            {info.detail.split("\n").map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
};

interface ShellPanelProps {
  cwd: string;
  setCwd: (p: string) => void;
  fileSystem: FSNode;
  HOME: string;
  findNodeByPath: (r: FSNode, p: string) => FSNode | null;
  isDirectory: (r: FSNode, p: string) => boolean;
  input: string;
  setInput: (s: string) => void;
  suggestions: string[];
  handleShellSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  textOutput: string | null;
  error: string | null;
}

const ShellPanel: React.FC<ShellPanelProps> = ({
  cwd, setCwd, fileSystem, HOME, findNodeByPath, isDirectory,
  input, setInput, suggestions, handleShellSubmit, handleKeyDown, textOutput, error
}) => {

  const getPromptCwd = () => {
    if (cwd === "/home/user") return "~";
    if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
    return cwd;
  };

  return (
    <div className="shell">
      <form onSubmit={handleShellSubmit}>
        <div className="input-row">
          <code className="prompt">user@demo:{getPromptCwd()}$</code>
          <input
            id="shell-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="shell-input"
            autoComplete="off"
          />
          <button type="submit" className="primary">Run</button>
        </div>
        {suggestions.length > 0 && (
          <div className="autocomplete-suggestions">
            {suggestions.map((s) => (
              <div key={s} className="suggestion" onClick={() => setInput(s)}>
                {s}
              </div>
            ))}
          </div>
        )}
      </form>
      {textOutput && (
        <div className="section">
          <div className="label">Output:</div>
          <pre className="code-block">{textOutput}</pre>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <div className="hint shell-hint">
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
          <CommandWithTooltip cmdKey="cut"><code>cut [-d DELIM] -f LIST &lt;file&gt;...</code></CommandWithTooltip><br />
          <CommandWithTooltip cmdKey="|"><code>command1 | command2 (pipe)</code></CommandWithTooltip><br />
        </p>
      </div>
    </div>
  );
};

export default ShellPanel;