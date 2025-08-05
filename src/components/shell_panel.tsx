import React from "react";
import { FSNode } from "../fs";


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
  );
};

export default ShellPanel;