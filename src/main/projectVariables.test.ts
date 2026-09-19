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
test("extracts existing CSS tokens into light, dark and custom modes without creating a managed file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-css-vars-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src/theme.css"), `
      :root { --background: #ffffff; --foreground: #111827; --radius: 0.5rem; --surface: var(--background); }
      .dark { --background: #111827; --foreground: #f9fafb; }
      [data-theme="ocean"] { --background: #06293b; --foreground: #e7f7ff; }
    `);
    const result = readProjectVariables(root);
    const collection = result.library.collections.find(item => item.id === "project-styles");
    assert.deepEqual(collection.modes.map(mode => mode.id), ["light", "dark", "ocean"]);
    const background = result.library.tokens.find(token => token.cssName === "background");
    const radius = result.library.tokens.find(token => token.cssName === "radius");
    const surface = result.library.tokens.find(token => token.cssName === "surface");
    assert.equal(background.valuesByMode.dark.value, "#111827");
    assert.equal(radius.sourceNumber, true);
    assert.equal(radius.valuesByMode.dark.value, "0.5rem");
    assert.equal(radius.valuesByMode.dark.inheritedFromModeId, "light");
    assert.equal(surface.valuesByMode.light.kind, "alias");
    assert.equal(result.cssSource, true);
    assert.deepEqual(result.watchedFiles.sort(), [".bingo/design/variables.json", "src/theme.css"]);
    assert.equal(fs.existsSync(path.join(root, ".bingo/design/variables.json")), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("ignores Tailwind self-registration aliases without hiding the underlying token", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-css-vars-"));
  try {
    fs.writeFileSync(path.join(root, "tokens.css"), `
      :root { --background: #fff; --layer-tooltip: 60; }
      .dark { --background: #111; }
      @theme inline {
        --color-background: var(--background);
        --layer-tooltip: var(--layer-tooltip);
      }
    `);
    const result = readProjectVariables(root);
    const layer = result.library.tokens.find(token => token.cssName === "layer-tooltip");
    const color = result.library.tokens.find(token => token.cssName === "color-background");
    assert.equal(layer.valuesByMode.light.value, "60");
    assert.equal(layer.valuesByMode.dark.value, "60");
    assert.equal(layer.valuesByMode.dark.inheritedFromModeId, "light");
    assert.equal(color.valuesByMode.light.kind, "alias");
    assert.equal(color.valuesByMode.light.tokenId, result.library.tokens.find(token => token.cssName === "background").id);
    assert.equal(result.sourceConflicts.some(conflict => conflict.token === "layer-tooltip"), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("writes CSS mode values and creates missing overrides in source", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-css-vars-"));
  try {
    const cssFile = path.join(root, "tokens.css");
    fs.writeFileSync(cssFile, `:root { --background: #fff; --radius: .5rem; }\n.dark { --background: #111; }\n[data-theme="ocean"] { --background: #024; }\n`);
    const before = readProjectVariables(root);
    const next = structuredClone(before.library);
    next.tokens.find(token => token.cssName === "background").valuesByMode.dark = { kind: "literal", value: "#223344" };
    next.tokens.find(token => token.cssName === "radius").valuesByMode.dark = { kind: "literal", value: "1rem" };
    const saved = writeProjectVariables(root, { library: next, expectedRevision: before.revision, source: before.source });
    const css = fs.readFileSync(cssFile, "utf8");
    assert.match(css, /\.dark\s*\{[^}]*--background:\s*#223344/);
    assert.match(css, /\.dark\s*\{[^}]*--radius:\s*1rem/);
    assert.equal(saved.library.tokens.find(token => token.cssName === "radius").valuesByMode.dark.value, "1rem");
    assert.equal(fs.existsSync(path.join(root, ".bingo/design/variables.json")), false);
    fs.appendFileSync(cssFile, `.light { --background: #eee; }\n`);
    assert.throws(() => writeProjectVariables(root, { library: next, expectedRevision: saved.revision, source: saved.source }), /changed outside/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("keeps managed variables while adding non-conflicting source variables", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-css-vars-"));
  try {
    let initial = readProjectVariables(root);
    initial = writeProjectVariables(root, { library, expectedRevision: initial.revision, source: initial.source });
    fs.writeFileSync(path.join(root, "tokens.css"), `:root { --bg: #000; --accent: #ff0066; }`);
    const merged = readProjectVariables(root);
    assert.equal(merged.library.tokens.filter(token => token.cssName === "bg").length, 1);
    assert.equal(merged.library.tokens.some(token => token.cssName === "accent" && token.sourceRef?.kind === "css"), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
