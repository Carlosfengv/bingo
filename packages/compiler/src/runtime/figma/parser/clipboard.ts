/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/parser/clipboard.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { figGuidKey } from "../utils/node";
import { parseFigmaArchive } from "./kiwi";
import * as import_base64_js from "base64-js";
import { decompress } from "fzstd";
import { compileSchema, decodeBinarySchema } from "kiwi-schema";
import { nodeId } from "openfig-core";
import { inflateRaw as inflateRaw_1 } from "pako";

var FIGMETA_START = "<!--(figmeta)";
var FIGMETA_END = "(/figmeta)-->";
var FIGMA_START = "<!--(figma)";
var FIGMA_END = "(/figma)-->";
var H2D_MARKER = "(figh2d)";
function decodeHtmlEntities(html) {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
}
function normalizeClipboardHtml(html) {
  return decodeHtmlEntities(html).replace(/<!--StartFragment-->/g, "").replace(/<!--EndFragment-->/g, "").trim();
}
function base64DecodeString(value) {
  return new TextDecoder().decode((0, import_base64_js.toByteArray)(value.replace(/\s+/g, "")));
}
function base64DecodeBytes(value) {
  return (0, import_base64_js.toByteArray)(value.replace(/\s+/g, ""));
}
function decodeFigmetaJson(html) {
  const start = html.indexOf(FIGMETA_START);
  const end = html.indexOf(FIGMETA_END);
  if (start === -1 || end === -1 || start >= end) return null;
  const base64 = html.slice(start + 13, end).replace(/\s+/g, "");
  try {
    const json = atob(base64);
    const parsed = JSON.parse(json);
    if (typeof parsed.fileKey !== "string") return null;
    if (typeof parsed.pasteID !== "number") return null;
    if (typeof parsed.dataType !== "string") return null;
    return {
      fileKey: parsed.fileKey,
      pasteID: parsed.pasteID,
      dataType: parsed.dataType
    };
  } catch {
    return null;
  }
}
function parseHTMLPayload(html) {
  const metaStart = html.indexOf(FIGMETA_START);
  const metaEnd = html.indexOf(FIGMETA_END);
  const figmaStart = html.indexOf(FIGMA_START);
  const figmaEnd = html.indexOf(FIGMA_END);
  if (metaStart === -1 || metaEnd === -1 || metaStart >= metaEnd) throw new Error("Couldn't find figmeta");
  if (figmaStart === -1 || figmaEnd === -1 || figmaStart >= figmaEnd) throw new Error("Couldn't find figma");
  return {
    meta: JSON.parse(base64DecodeString(html.slice(metaStart + 13, metaEnd))),
    figma: base64DecodeBytes(html.slice(figmaStart + 11, figmaEnd))
  };
}
function isZstdChunk(chunk) {
  return chunk.length >= 4 && chunk[0] === 40 && chunk[1] === 181 && chunk[2] === 47 && chunk[3] === 253;
}
function decompressChunk(chunk) {
  if (isZstdChunk(chunk)) return decompress(chunk);
  return inflateRaw_1(chunk);
}
function buildFigDocument(message, nodes) {
  const nodeMap = new Map();
  const childrenMap = new Map();
  for (const node of nodes) {
    const id = nodeId(node);
    if (id) nodeMap.set(id, node);
  }
  for (const node of nodes) {
    const parentId = figGuidKey(node.parentIndex?.guid);
    if (!parentId) continue;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(node);
    childrenMap.set(parentId, siblings);
  }
  return {
    header: {
      prelude: "fig-kiwi",
      version: 0
    },
    nodes,
    nodeMap,
    childrenMap,
    schema: null,
    compiledSchema: null,
    rawChunks: [],
    message,
    images: new Map()
  };
}
/**
* Fast check for native Figma clipboard HTML (figmeta + figma markers).
* Returns false for generic HTML, Bingo clipboard JSON, and H2D payloads.
*/
function isFigmaClipboardHtml(html) {
  const normalized = normalizeClipboardHtml(html);
  if (!normalized || normalized.includes(H2D_MARKER)) return false;
  if (!normalized.includes(FIGMETA_START)) return false;
  if (!(normalized.includes(FIGMA_START) || normalized.includes("data-buffer=") || normalized.includes("data-metadata="))) return false;
  return decodeFigmetaJson(normalized) !== null;
}
/**
* Decode Figma clipboard HTML into a typed Kiwi node-change tree.
* Returns null for non-Figma HTML, malformed base64, or Kiwi decode failures.
*/
function parseFigmaClipboardHtml(html) {
  const normalized = normalizeClipboardHtml(html);
  if (!normalized || !isFigmaClipboardHtml(normalized)) return null;
  try {
    const {
      meta,
      figma
    } = parseHTMLPayload(normalized);
    const {
      files
    } = parseFigmaArchive(figma);
    const [schemaCompressed, dataCompressed] = files;
    const message = compileSchema(decodeBinarySchema(decompressChunk(schemaCompressed))).decodeMessage(decompressChunk(dataCompressed));
    const nodeChanges = message.nodeChanges ?? [];
    return {
      format: "figma-kiwi",
      meta: {
        fileKey: meta.fileKey,
        pasteID: meta.pasteID,
        dataType: meta.dataType
      },
      message,
      nodeChanges,
      doc: buildFigDocument(message, nodeChanges)
    };
  } catch {
    return null;
  }
}

export { isFigmaClipboardHtml, parseFigmaClipboardHtml };
