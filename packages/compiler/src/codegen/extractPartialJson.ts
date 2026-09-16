/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/extractPartialJson.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Pull string / primitive fields out of a JSON object that is still being
* streamed (unterminated string, missing closing braces).
*/
var STRING_FIELD = field => new RegExp(`"${escapeRegExp(field)}"\\s*:\\s*"`);
function extractPartialJsonStringField(json, field) {
  const match = STRING_FIELD(field).exec(json);
  if (!match) return void 0;
  return readJsonString(json, match.index + match[0].length);
}
function extractPartialJsonBooleanField(json, field) {
  const match = new RegExp(`"${escapeRegExp(field)}"\\s*:\\s*(true|false)`).exec(json);
  if (!match) return void 0;
  return match[1] === "true";
}
var CANVAS_DRAW_TOOLS = new Set(["canvas_add", "canvas_insert", "canvas_update"]);
var FILE_WRITE_TOOLS = new Set(["project_write", "project_edit", "local_write", "local_edit"]);
function extractPartialMcpToolName(json) {
  return /"name"\s*:\s*"((?:mcp__bingo__)?canvas_(?:add|insert|update))"/.exec(json)?.[1];
}
function shortBingoToolName(name) {
  const prefix = "mcp__bingo__";
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
function isCanvasDrawToolName(name) {
  if (!name) return false;
  return CANVAS_DRAW_TOOLS.has(shortBingoToolName(name));
}
function isFileWriteToolName(name) {
  if (!name) return false;
  return FILE_WRITE_TOOLS.has(shortBingoToolName(name));
}
function extractPartialFileWriteArgs(json) {
  return {
    file_path: extractPartialJsonStringField(json, "file_path") ?? extractPartialJsonStringField(json, "path"),
    content: extractPartialJsonStringField(json, "content") ?? extractPartialJsonStringField(json, "new_string")
  };
}
function extractPartialCanvasDrawArgs(json) {
  return {
    jsx: extractPartialJsonStringField(json, "jsx"),
    parent_id: extractPartialJsonStringField(json, "parent_id"),
    claim_id: extractPartialJsonStringField(json, "claim_id"),
    element_id: extractPartialJsonStringField(json, "element_id"),
    before_id: extractPartialJsonStringField(json, "before_id"),
    after_id: extractPartialJsonStringField(json, "after_id"),
    claim_new: extractPartialJsonBooleanField(json, "claim_new")
  };
}
function readJsonString(src, start) {
  let out = "";
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      if (i + 1 >= src.length) break;
      const n = src[i + 1];
      if (n === "u") {
        if (i + 5 >= src.length) break;
        const code = Number.parseInt(src.slice(i + 2, i + 6), 16);
        if (Number.isNaN(code)) break;
        out += String.fromCharCode(code);
        i += 5;
        continue;
      }
      out += n === "n" ? "\n" : n === "r" ? "\r" : n === "t" ? "	" : n === "b" ? "\b" : n === "f" ? "\f" : n;
      i++;
      continue;
    }
    if (c === "\"") return out;
    out += c;
  }
  return out;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { extractPartialCanvasDrawArgs, extractPartialFileWriteArgs, extractPartialMcpToolName, isCanvasDrawToolName, isFileWriteToolName };
