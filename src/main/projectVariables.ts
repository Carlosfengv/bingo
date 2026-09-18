import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { emptyVariableLibrary, validateVariableLibrary, variableError } from "../../packages/compiler/src/runtime/variables";

export const DEFAULT_VARIABLE_FILE = ".bingo/design/variables.json";
function safeVariableFile(root: string, relative: string) {
  const canonicalRoot = fs.realpathSync(root);
  const file = path.resolve(canonicalRoot, relative);
  const inside = path.relative(canonicalRoot, file);
  if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) throw variableError("VARIABLE_PATH", "Variable files must be inside the project.");
  let current = canonicalRoot;
  for (const part of inside.split(path.sep)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw variableError("VARIABLE_PATH", "Variable files cannot use symbolic links."); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return file;
}
function readText(file: string) {
  try { return fs.readFileSync(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function revision(text: string | null) { return text === null ? "missing" : crypto.createHash("sha256").update(text).digest("hex"); }
function assertReferencesPreserved(root: string, previous: any, next: any, manifest: any) {
  const removedTokens = previous.tokens.filter(token => !next.tokens.some(item => item.id === token.id));
  const removedModes = previous.collections.flatMap(collection => collection.modes.filter(mode => !next.collections.find(item => item.id === collection.id)?.modes.some(item => item.id === mode.id)).map(mode => [collection.id, mode.id]));
  if (!removedTokens.length && !removedModes.length) return;
  const inspect = value => {
    if (!value || typeof value !== "object") return;
    for (const binding of Array.isArray(value.bindings) ? value.bindings : []) if (removedTokens.some(token => token.id === binding?.tokenId)) throw variableError("VARIABLE_IN_USE", "This variable is used on a saved page. Replace its bindings before deleting it.");
    for (const modes of [value.localCollectionModes, value.variableModes, value.collectionModes]) {
      if (modes && removedModes.some(([collectionId, modeId]) => modes[collectionId] === modeId)) throw variableError("VARIABLE_IN_USE", "This mode is used on a page or theme. Clear or replace its selection before deleting it.");
    }
    for (const child of Object.values(value)) {
      if (typeof child === "string" && removedTokens.some(token => token.cssName && child.includes(`var(--${token.cssName})`))) throw variableError("VARIABLE_IN_USE", "This variable is used on a saved page. Replace its references before deleting it.");
      if (typeof child === "object") inspect(child);
    }
  };
  inspect(manifest);
  const pages = safeVariableFile(root, ".bingo/design/pages");
  let entries;
  try { entries = fs.readdirSync(pages, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const entry of entries) if (entry.isFile() && entry.name.endsWith(".json")) inspect(JSON.parse(fs.readFileSync(path.join(pages, entry.name), "utf8")));
}
export function readProjectVariables(root: string, manifest?: any) {
  const source = manifest?.source?.kind === "tokens" ? manifest.source.file : DEFAULT_VARIABLE_FILE;
  const text = readText(safeVariableFile(root, source));
  const library = text === null ? emptyVariableLibrary() : JSON.parse(text);
  if (library.version !== 1 || !Array.isArray(library.collections) || !Array.isArray(library.tokens)) throw variableError("VARIABLE_LIBRARY_INVALID", "The variable file is invalid.");
  const defaultModes = manifest?.themes?.find(theme => theme.id === manifest.defaultThemeId)?.collectionModes || {};
  return { library, revision: revision(text), source, defaultModes, cssSource: manifest?.source?.kind === "css" && text === null };
}
/** Synchronous compare-and-swap under an exclusive lock prevents interleaved editor writes. */
export function writeProjectVariables(root: string, input: { library: any; expectedRevision: string; source: string }, manifest?: any) {
  if (typeof input.expectedRevision !== "string") throw variableError("VARIABLE_REVISION", "Reload variables before saving.");
  validateVariableLibrary(input.library);
  const before = readProjectVariables(root, manifest);
  if (input.source !== before.source) throw variableError("VARIABLE_CONFLICT", "The variable source changed. Reload before saving.");
  const file = safeVariableFile(root, before.source);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  safeVariableFile(root, before.source);
  const lock = `${file}.lock`;
  let fd: number;
  try { fd = fs.openSync(lock, "wx", 0o600); } catch (error) {
    if (error.code === "EEXIST") throw variableError("VARIABLE_BUSY", "Variables are being saved by another editor. Try again.");
    throw error;
  }
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    if (revision(readText(file)) !== input.expectedRevision) throw variableError("VARIABLE_CONFLICT", "Variables changed outside this editor. Reload before saving.");
    assertReferencesPreserved(root, before.library, input.library, manifest);
    const text = `${JSON.stringify(input.library, null, 2)}\n`;
    const output = fs.openSync(temporary, "wx", 0o644);
    try { fs.writeFileSync(output, text, "utf8"); fs.fsyncSync(output); } finally { fs.closeSync(output); }
    fs.renameSync(temporary, file);
    return { ...before, library: input.library, revision: revision(text), cssSource: false };
  } finally {
    fs.closeSync(fd); fs.rmSync(lock, { force: true }); fs.rmSync(temporary, { force: true });
  }
}
