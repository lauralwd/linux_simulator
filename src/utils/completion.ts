import { FSNode } from "../fs";
import { normalizePath, joinPaths } from "./path";

// Path completion helper
export function getPathCompletions(
  arg: string,
  cwd: string,
  HOME: string,
  fileSystem: FSNode,
  findNodeByPath: (root: FSNode, path: string) => FSNode | null,
  expandTilde: (p: string) => string
): string[] {
  let useTilde = false;
  let processed = arg;
  if (arg === "~" || arg.startsWith("~/")) {
    useTilde = true;
    processed = expandTilde(arg);
  }
  let baseDir: string;
  let prefix: string;
  if (processed.startsWith("/")) {
    if (processed.endsWith("/")) {
      baseDir = normalizePath(processed);
      prefix = "";
    } else {
      const idx = processed.lastIndexOf("/");
      if (idx <= 0) {
        baseDir = "/";
        prefix = processed.slice(1);
      } else {
        baseDir = normalizePath(processed.slice(0, idx));
        prefix = processed.slice(idx + 1);
      }
    }
  } else {
    if (processed.endsWith("/")) {
      baseDir = normalizePath(joinPaths(cwd, processed));
      prefix = "";
    } else {
      const idx = processed.lastIndexOf("/");
      if (idx === -1) {
        baseDir = cwd;
        prefix = processed;
      } else {
        baseDir = normalizePath(joinPaths(cwd, processed.slice(0, idx)));
        prefix = processed.slice(idx + 1);
      }
    }
  }
  const node = findNodeByPath(fileSystem, baseDir);
  if (!node || node.type !== "dir" || !node.children) return [];
  const matches = node.children
    .filter((c) => c.name.startsWith(prefix))
    .map((c) => {
      let suggestion = "";
      if (arg.startsWith("/") || arg.startsWith("~")) {
        suggestion = baseDir === "/" ? `/${c.name}` : `${baseDir}/${c.name}`;
      } else {
        if (arg.includes("/")) {
          suggestion = `${arg.slice(0, arg.lastIndexOf("/") + 1)}${c.name}`;
        } else {
          suggestion = c.name;
        }
      }
      if (useTilde && suggestion.startsWith(HOME)) {
        suggestion = `~${suggestion.slice(HOME.length)}`;
      }
      return c.type === "dir" ? suggestion + "/" : suggestion;
    });
  return matches.slice(0, 8);
}