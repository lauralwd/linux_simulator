import { FSNode } from "../fs";
import { normalizePath, joinPaths } from "./path";

// Helper to get file content by path (relative to cwd if not absolute), with tilde expansion
export function getFileContentLocal(
  raw: string,
  cwd: string,
  HOME: string,
  findNodeByPath: (root: FSNode, path: string) => FSNode | null,
  fileSystem: FSNode,
  expandTilde: (p: string) => string
): { path: string; content: string } | null {
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
}