/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatContextReferences.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { connectionDisplayName } from "../hooks/useClaudeContext";

function getContextOptions(components, pages, connections, selectedIds, query) {
  const options = [...connections.map(connection => ({
    type: "connection",
    id: `connection:${connection.name}`,
    name: connection.name,
    displayName: connectionDisplayName(connection)
  })), ...Object.entries(components).map(([name, info]) => ({
    type: "component",
    id: `component:${name}`,
    name,
    path: info.path
  })), ...pages.map(page => ({
    type: "page",
    id: `page:${page.id}`,
    pageId: page.id,
    name: page.name
  }))];
  const words = query.trim().toLowerCase().split(/\s+/);
  return options.filter(option => !selectedIds.has(option.id) && words.every(word => `${option.displayName ?? option.name} ${option.name} ${option.path ?? ""}`.toLowerCase().includes(word)));
}
/** An @ token at a word boundary; email addresses do not open the picker. */
function readContextToken(input) {
  const selection = window.getSelection();
  if (!input || !selection?.isCollapsed || !selection.rangeCount || !input.contains(selection.anchorNode)) return null;
  const before = selection.getRangeAt(0).cloneRange();
  before.setStart(input, 0);
  const text = before.toString();
  const match = /(?:^|[\s(])@([^@\n]*)$/.exec(text);
  if (!match) return null;
  let offset = text.length - match[1].length - 1;
  const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (offset < length) {
      const token = selection.getRangeAt(0).cloneRange();
      token.setStart(node, offset);
      if (token.cloneContents().querySelector("br, div, p")) return null;
      return token;
    }
    offset -= length;
    node = walker.nextNode();
  }
  return null;
}
function projectReferenceLine(ref) {
  if (ref.type === "component") {
    const source = ref.path ? ` (source: ${JSON.stringify(ref.path)}). Use this exact source path directly; read the source when needed for the request. Search for the component only if this path is unavailable.` : "";
    return `  → Component: ${JSON.stringify(ref.name)}${source}`;
  }
  if (ref.type === "page") return `  → Canvas page: ${JSON.stringify(ref.name)} (canvas_id: ${JSON.stringify(ref.pageId)})`;
  return null;
}

export { getContextOptions, projectReferenceLine, readContextToken };
