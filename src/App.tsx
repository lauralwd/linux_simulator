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

// Utilities
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
  // --- Theme ---
  const [dark, setDark] = useTheme();

  // --- Directory Tree State ---
  const { expanded, setExpanded, toggleExpand, collapseAll } = useExpandedTree([
    "/",
    "/home",
    "/home/user",
  ]);

  // --- Hovered Path State ---
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [hoveredPathsSeen, setHoveredPathsSeen] = useHoveredPathsSeen(hovered);

  // --- Show Hidden State ---
  const [showHiddenInTree, setShowHiddenInTree] = React.useState<boolean>(false);
  const [showHiddenOverride, setShowHiddenOverride] = React.useState<boolean>(false);

  // --- CWD State ---
  const [cwd, setCwdRaw] = React.useState<string>(normalizePath(HOME));
  const expandTilde = useExpandTilde(HOME);

  const setCwd = React.useCallback(
    (p: string) => {
      const normalized = normalizePath(p);
      if (isDirectory(fileSystem, normalized)) {
        setCwdRaw(normalized);
      }
    },
    [setCwdRaw]
  );

  // --- Auto-expand tree on cwd change ---
  useAutoExpandTreeOnCwdChange(cwd, setExpanded);

  // --- Tree Keyboard Navigation Hook ---
  useTreeKeyboardNav({
    cwd,
    setCwd,
    fileSystem,
    findNodeByPath,
    isDirectory,
  });

  // --- Shell Hook (terminal logic) ---
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

  // --- Hover info ---
  const cdInfo = computeCdInfo(hovered, fileSystem, cwd);

  // --- Prompt Formatting Helper ---
  const getPromptCwd = () => {
    if (cwd === "/home/user") return "~";
    if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
    return cwd;
  };

  // --- Missions Hook (business logic) ---
  const allMissions = getAllMissions({ lsOutput, textOutput, cwd, lastCommand, normalizePath });
  const {
    completedMissions,
    setCompletedMissions,
    currentGroupIndex,
    setCurrentGroupIndex,
    resetMissions,
  } = useMissions(allMissions);

  // --- Render Layout ---
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