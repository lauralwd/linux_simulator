import React from "react";
import { useTreeKeyboardNav } from "./hooks/useKeys";

// Components
import ShellPanel from "./components/shell_panel";
import Header from "./components/header";
import CwdHoverInfo from "./components/cwd_hover_info";
import { getAllMissions } from "./components/Missions";
import Exercises from "./components/Exercises";
import { TreePanel } from "./components/TreePanel";
import Footer from "./components/footer";

// Filesystem & Data
import { fileSystem } from "./fs";

// Utilities & Hooks
import { normalizePath } from "./utils/path";
import { useShell } from "./hooks/useShell";
import { useMissions } from "./hooks/useMissions";
import {
  useTheme,
  useExpandedTree,
  useHoveredPathsSeen,
  useExpandTilde,
  useAutoExpandTreeOnCwdChange,
  findNodeByPath,
  isDirectory,
  computeCdInfo,
} from "./hooks/utils";

const HOME = "/home/user";

const App: React.FC = () => {
  // Theme (dark/light mode)
  const [dark, setDark] = useTheme();

  // Directory tree expansion state
  const { expanded, setExpanded, toggleExpand, collapseAll } = useExpandedTree([
    "/",
    "/home",
    "/home/user",
  ]);

  // Track hovered path in tree and all paths seen
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [hoveredPathsSeen, setHoveredPathsSeen] = useHoveredPathsSeen(hovered);

  // Show/hide hidden files in tree
  const [showHiddenInTree, setShowHiddenInTree] = React.useState<boolean>(false);

  // Current working directory state
  const [cwd, setCwdRaw] = React.useState<string>(normalizePath(HOME));
  const expandTilde = useExpandTilde(HOME);

  // Only allow setting cwd to a directory
  const setCwd: (p: string) => void = React.useCallback(
    (p) => {
      const normalized = normalizePath(p);
      if (isDirectory(fileSystem, normalized)) {
        setCwdRaw(normalized);
      }
    },
    [setCwdRaw]
  );

  // Auto-expand tree nodes when cwd changes
  useAutoExpandTreeOnCwdChange(cwd, setExpanded);

  // Keyboard navigation for the tree panel
  useTreeKeyboardNav({
    cwd,
    setCwd,
    fileSystem,
    findNodeByPath,
    isDirectory,
  });

  // Shell/terminal logic (input, output, suggestions, etc.)
  const shell = useShell({
    cwd,
    setCwd,
    fileSystem,
    HOME,
    findNodeByPath,
    isDirectory,
  });
  const {
    input, setInput,
    suggestions,
    handleShellSubmit,
    handleKeyDown,
    lsOutput, textOutput,
    error, lastCommand,
  } = shell;

  // Info for "cd" hover tooltips
  const cdInfo = computeCdInfo(hovered, fileSystem, cwd);

  // Format cwd for shell prompt
  const getPromptCwd = (): string => {
    if (cwd === "/home/user") return "~";
    if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
    return cwd;
  };

  // Missions (progress, completion, navigation)
  const allMissions = getAllMissions({ lsOutput, textOutput, cwd, lastCommand, normalizePath });
  const {
    completedMissions,
    setCompletedMissions,
    currentGroupIndex,
    setCurrentGroupIndex,
    resetMissions,
  } = useMissions(allMissions);

  // Layout
  return (
    <div className="app">
      <Header dark={dark} setDark={setDark} />

      <div className="panel">
        <TreePanel
          fileSystem={fileSystem}
          cwd={cwd}
          setCwd={setCwd}
          setHoveredPath={setHovered}
          expanded={expanded}
          toggleExpand={toggleExpand}
          collapseAll={collapseAll}
          showHiddenInTree={showHiddenInTree}
          setShowHiddenInTree={setShowHiddenInTree}
        />

        <div className="right">
          <Exercises
            allMissions={allMissions}
            completedMissions={completedMissions}
            setCompletedMissions={setCompletedMissions}
            currentGroupIndex={currentGroupIndex}
            setCurrentGroupIndex={setCurrentGroupIndex}
          />
          <ShellPanel
            cwd={cwd}
            setCwd={setCwd}
            fileSystem={fileSystem}
            HOME={HOME}
            findNodeByPath={findNodeByPath}
            isDirectory={isDirectory}
            input={input}
            setInput={setInput}
            suggestions={suggestions}
            handleShellSubmit={handleShellSubmit}
            handleKeyDown={handleKeyDown}
            textOutput={textOutput}
            error={error}
          />

          <CwdHoverInfo cwd={cwd} hovered={hovered} cdInfo={cdInfo} />

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default App;