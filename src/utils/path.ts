// Work with POSIX-style paths only

export function normalizePath(p: string): string {
  if (!p) return "/";
  const isAbsolute = p.startsWith("/");
  const parts = p.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(part);
  }
  const normalized = "/" + stack.join("/");
  return normalized === "" ? "/" : normalized;
}

export function joinPaths(...segments: string[]): string {
  const combined = segments.join("/");
  return normalizePath(combined);
}

// Expand '~' to HOME directory
export function expandTilde(p: string, HOME: string): string {
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return HOME + p.slice(1);
  return p;
}

/**
 * Compute relative path from `from` to `to`. Similar semantics to Unix `realpath --relative-to`
 */
export function relativePath(from: string, to: string): string {
  const normFrom = normalizePath(from);
  const normTo = normalizePath(to);
  if (normFrom === normTo) return ".";
  const fromParts = normFrom.slice(1).split("/").filter(Boolean);
  const toParts = normTo.slice(1).split("/").filter(Boolean);
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  const up = fromParts.slice(i).map(() => "..");
  const down = toParts.slice(i);
  const relParts = [...up, ...down];
  return relParts.length === 0 ? "." : relParts.join("/");
}