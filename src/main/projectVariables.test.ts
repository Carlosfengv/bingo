import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readProjectVariables, writeProjectVariables } from "./projectVariables";

const library = { version: 1, collections: [{ id: "colors", defaultModeId: "light", modes: [{ id: "light" }] }], tokens: [{ id: "bg", type: "color", collectionId: "colors", cssName: "bg", valuesByMode: { light: { kind: "literal", value: "#fff" } } }] };
test("variable files are atomic, portable and protected against stale writes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-vars-"));
  try {
    const initial = readProjectVariables(root);
    const saved = writeProjectVariables(root, { library, expectedRevision: initial.revision, source: initial.source });
    assert.deepEqual(readProjectVariables(root).library, library);
    assert.notEqual(saved.revision, "missing");
    assert.throws(() => writeProjectVariables(root, { library, expectedRevision: "missing", source: saved.source }), /changed outside/);
    assert.ok(!fs.existsSync(path.join(root, `${saved.source}.lock`)));
    fs.writeFileSync(path.join(root, saved.source), JSON.stringify({ ...library, tokens: [] }));
    assert.throws(() => writeProjectVariables(root, { library, expectedRevision: saved.revision, source: saved.source }), /changed outside/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("configured sources are reused and symlink/path escapes are rejected", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-vars-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-vars-outside-"));
  try {
    const manifest = { source: { kind: "tokens", file: "tokens/colors.json" } };
    const initial = readProjectVariables(root, manifest);
    assert.equal(initial.source, "tokens/colors.json");
    writeProjectVariables(root, { library, expectedRevision: initial.revision, source: initial.source }, manifest);
    assert.ok(fs.existsSync(path.join(root, "tokens/colors.json")));
    assert.throws(() => readProjectVariables(root, { source: { kind: "tokens", file: "../escape.json" } }), /inside/);
    fs.symlinkSync(outside, path.join(root, "linked"));
    assert.throws(() => readProjectVariables(root, { source: { kind: "tokens", file: "linked/colors.json" } }), /symbolic/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});
test("deleting a variable used on another saved page is rejected", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-vars-"));
  try {
    const initial = readProjectVariables(root);
    const saved = writeProjectVariables(root, { library, expectedRevision: initial.revision, source: initial.source });
    fs.mkdirSync(path.join(root, ".bingo/design/pages"));
    fs.writeFileSync(path.join(root, ".bingo/design/pages/other.json"), JSON.stringify({ canvas: { elements: [{ id: "x", theme: { bindings: [{ tokenId: "bg" }] } }] } }));
    assert.throws(() => writeProjectVariables(root, { library: { ...library, tokens: [] }, expectedRevision: saved.revision, source: saved.source }), /used on a saved page/);
    assert.equal(readProjectVariables(root).library.tokens.length, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
