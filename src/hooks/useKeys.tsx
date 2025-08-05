

import { useEffect } from "react";
import { normalizePath, joinPaths } from "../utils/path";
import type { FSNode } from "../fs";

export function useTreeKeyboardNav({
  cwd,
  setCwd,
  fileSystem,
  findNodeByPath,
  isDirectory,
}: {
  cwd: string;
  setCwd: (p: string) => void;
  fileSystem: FSNode;
  findNodeByPath: (r: FSNode, p: string) => FSNode | null;
  isDirectory: (r: FSNode, p: string) => boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // if focus is in input/textarea or the shell input, don't intercept arrow keys (allow editing)
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.id === "shell-input" ||
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
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
  }, [cwd, setCwd, fileSystem, findNodeByPath, isDirectory]);
}