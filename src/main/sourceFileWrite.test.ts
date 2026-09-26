import assert from "node:assert/strict";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readSourceSnapshot, writeSourceFile } from "./sourceFileWrite";

test("source writes require the opening hash and keep the old bytes on conflict", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-write-"));
  try {
    const file = path.join(root, "src", "App.tsx");
    assert.throws(() => writeSourceFile(file, "unsafe", {}), /exactly one precondition/);
    const created = writeSourceFile(file, "first", { createOnly: true });
    assert.equal(created.changed, true);
    const opened = readSourceSnapshot(file)!;
    await fs.writeFile(file, "external");
    assert.throws(() => writeSourceFile(file, "draft", { expectedHash: opened.hash }), { code: "SOURCE_CONFLICT" });
    assert.equal(await fs.readFile(file, "utf8"), "external");
    assert.throws(() => writeSourceFile(file, "duplicate", { createOnly: true }), { code: "SOURCE_CONFLICT" });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("source writes skip unchanged data and leave the original intact if history fails", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-write-"));
  try {
    const file = path.join(root, "file.css");
    await fs.writeFile(file, "old");
    const opened = readSourceSnapshot(file)!;
    let versions = 0;
    const same = writeSourceFile(file, "old", { expectedHash: opened.hash, beforeWrite: () => { versions++; } });
    assert.equal(same.changed, false);
    assert.equal(versions, 0);
    assert.throws(() => writeSourceFile(file, "new", { expectedHash: opened.hash,
      beforeWrite: () => { throw new Error("history failed"); } }), /history failed/);
    assert.equal(await fs.readFile(file, "utf8"), "old");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("competing creates and updates accept only the first stale precondition", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-race-"));
  try {
    const file = path.join(root, "nested", "shared.ts");
    writeSourceFile(file, "created by A", { createOnly: true });
    assert.throws(() => writeSourceFile(file, "created by B", { createOnly: true }), { code: "SOURCE_CONFLICT" });
    const hash = readSourceSnapshot(file)!.hash;
    writeSourceFile(file, "changed by A", { expectedHash: hash });
    assert.throws(() => writeSourceFile(file, "changed by B", { expectedHash: hash }), { code: "SOURCE_CONFLICT" });
    assert.equal(await fs.readFile(file, "utf8"), "changed by A");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("a failure after writing the temporary file preserves the original and removes the temporary file", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-temp-"));
  try {
    const file = path.join(root, "shared.ts");
    await fs.writeFile(file, "original");
    const hash = readSourceSnapshot(file)!.hash;
    let checks = 0;
    assert.throws(() => writeSourceFile(file, "replacement", { expectedHash: hash,
      validate: () => { if (++checks === 3) throw new Error("validation failed"); },
    }), /validation failed/);
    assert.equal(await fs.readFile(file, "utf8"), "original");
    assert.deepEqual(await fs.readdir(root), ["shared.ts"]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("a temporary file write failure preserves the original and removes the temporary file", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-temp-write-"));
  const file = path.join(root, "shared.ts");
  const writeFile = fsSync.writeFileSync;
  try {
    await fs.writeFile(file, "original");
    const hash = readSourceSnapshot(file)!.hash;
    fsSync.writeFileSync = ((target, ...rest) => {
      if (typeof target === "number") throw new Error("injected temporary write failure");
      return writeFile(target, ...rest);
    }) as typeof fsSync.writeFileSync;
    assert.throws(() => writeSourceFile(file, "replacement", { expectedHash: hash }), /injected temporary write failure/);
    assert.equal(await fs.readFile(file, "utf8"), "original");
    assert.deepEqual(await fs.readdir(root), ["shared.ts"]);
  } finally {
    fsSync.writeFileSync = writeFile;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("a failed final replacement preserves the original and removes the prepared temporary file", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-source-rename-"));
  const file = path.join(root, "shared.ts");
  const rename = fsSync.renameSync;
  try {
    await fs.writeFile(file, "original");
    const hash = readSourceSnapshot(file)!.hash;
    fsSync.renameSync = ((from, to) => {
      if (to === file) throw new Error("injected replacement failure");
      return rename(from, to);
    }) as typeof fsSync.renameSync;
    assert.throws(() => writeSourceFile(file, "replacement", { expectedHash: hash }), /injected replacement failure/);
    assert.equal(await fs.readFile(file, "utf8"), "original");
    assert.deepEqual(await fs.readdir(root), ["shared.ts"]);
  } finally {
    fsSync.renameSync = rename;
    await fs.rm(root, { recursive: true, force: true });
  }
});
