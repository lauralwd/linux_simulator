import React from "react";
import { FSNode } from "../fs";
import { useShell, LsOutput } from "../hooks/useShell";

interface ShellPanelProps {
  cwd: string;
  setCwd: (p: string) => void;
  fileSystem: FSNode;
  HOME: string;
  findNodeByPath: (r: FSNode, p: string) => FSNode | null;
  isDirectory: (r: FSNode, p: string) => boolean;
}

const ShellPanel: React.FC<ShellPanelProps> = ({
  cwd, setCwd, fileSystem, HOME, findNodeByPath, isDirectory
}) => {
  const {
    input, setInput,
    suggestions,
    handleShellSubmit,
    handleKeyDown,
    lsOutput, textOutput, error
  } = useShell({ cwd, setCwd, fileSystem, HOME, findNodeByPath, isDirectory });

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
    </div>
  );
};

export default ShellPanel;