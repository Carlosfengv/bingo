import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProjectVariableCache, variableFileChangeMatters } from "./projectVariableCache";
import { readProjectVariables, writeProjectVariables } from "./projectVariables";

const empty = (defaultModes = {}) => ({ library: { version: 1, collections: [], tokens: [] }, revision: "same", source: "variables.json", defaultModes, watchedFiles: [], sourceWarnings: [], sourceConflicts: [], cssSource: false });
test("variable reads coalesce and unchanged keys include default modes and expire", async () => {
  let reads = 0, now = 0;
  const cache = new ProjectVariableCache(async (_root, manifest) => { reads++; return empty(manifest?.defaultModes); }, { now: () => now, ttlMs: 30, maxEntries: 32, maxBytes: 100000 });
  const [first, same] = await Promise.all([cache.get("a"), cache.get("a")]);
  assert.equal(reads, 1); assert.deepEqual(first, same);
  assert.deepEqual(await cache.get("a", undefined, first.snapshotKey), { unchanged: true, snapshotKey: first.snapshotKey });
  const changed = await cache.get("a", { defaultModes: { colors: "dark" } }, first.snapshotKey);
  assert.ok(!("unchanged" in changed)); assert.notEqual(changed.snapshotKey, first.snapshotKey);
  assert.equal(reads, 2);
  now = 31; await cache.get("a", { defaultModes: { colors: "dark" } }); assert.equal(reads, 3);
});
test("invalidated in-flight reads cannot publish old results and errors are retryable", async () => {
  let finish: (value: any) => void, reads = 0;
  const cache = new ProjectVariableCache(async () => {
    if (++reads === 1) return new Promise(resolve => { finish = resolve; });
    if (reads === 3) throw new Error("unreadable");
    return { ...empty(), revision: `v${reads}` };
  });
  const result = cache.get("a"); cache.invalidate("a"); finish!(empty());
  assert.equal((await result).revision, "v2");
  cache.invalidate("a"); await assert.rejects(cache.get("a"), /unreadable/);
  assert.equal((await cache.get("a")).revision, "v4");
});
test("closing a project discards pending results and capacity evicts least recent snapshots", async () => {
  let finish: (value: any) => void;
  const closing = new ProjectVariableCache(() => new Promise(resolve => { finish = resolve; }));
  const result = closing.get("a"); closing.delete("a"); finish!(empty());
  await assert.rejects(result, /closed/);
  let reads = 0;
  const cache = new ProjectVariableCache(async () => { reads++; return empty(); }, {now: Date.now, ttlMs:30000, maxEntries:1, maxBytes:100000});
  await cache.get("a"); await cache.get("b"); await cache.get("a"); assert.equal(reads, 3);
});
test("new/deleted CSS and directory events invalidate discovery but generated traffic does not", () => {
  for (const file of ["", "src/new.css", "src/theme", ".bingo/config.json", ".bingo/design/variables.json"]) assert.equal(variableFileChangeMatters(file), true, file);
  for (const file of ["node_modules/a/theme.css", "dist/theme.css", ".bingo/design/chats/a.json", "src/a.tsx"]) assert.equal(variableFileChangeMatters(file), false, file);
  assert.equal(variableFileChangeMatters("tokens/palette.json", new Set(["tokens/palette.json"])), true);
});
test("cached reads never bypass disk conflict checks on writes", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-variable-cache-"));
  try {
    const file = path.join(root, "theme.css");fs.writeFileSync(file, ":root{--background:#fff}");
    const cache = new ProjectVariableCache(async root => readProjectVariables(root));
    const first = await cache.get(root);
    fs.writeFileSync(file, ":root{--background:#000}");
    assert.throws(() => writeProjectVariables(root, { library: first.library, expectedRevision: first.revision, source: first.source }), /changed outside/);
    cache.invalidate(root);
    const next = await cache.get(root);
    assert.notEqual(first.snapshotKey, next.snapshotKey);
    fs.writeFileSync(path.join(root,"new.css"), ":root{--accent:#f00}");cache.invalidate(root);
    assert.equal((await cache.get(root)).library.tokens.length, 2);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
