import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { createPortableDesign, savePortableAsset, savePortablePage } from "./projectDesignStore";
import { inspectProjectPortability } from "./projectPortability";

const run = promisify(execFile);

test("portability inspection separates portable files from Git sync state", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-portability-"));
  const id = "11111111-1111-4111-8111-111111111111";
  try {
    createPortableDesign(root, [{ id, name: "Page", elements: [] }]);
    const asset = savePortableAsset(root, { filename: "image.png", dataBase64: Buffer.from("image").toString("base64") });
    savePortablePage(root, { id, name: "Page", elements: { schemaVersion: 2, byId: { image: { id: "image", props: { src: asset.url } } }, childrenByParent: { ROOT: ["image"] } } });
    await run("git", ["init", "-q"], { cwd: root });
    let result = await inspectProjectPortability(root);
    assert.equal(result.status, "files-portable");
    assert.equal(result.git.status, "untracked");
    await run("git", ["add", ".bingo/design"], { cwd: root });
    await run("git", ["-c", "user.name=Bingo Test", "-c", "user.email=test@localhost", "commit", "-qm", "design"], { cwd: root });
    result = await inspectProjectPortability(root);
    assert.equal(result.git.status, "tracked-clean");
    assert.equal(result.git.remoteSync, "not-verified");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("portability inspection reports missing assets and machine-local paths", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-portability-missing-"));
  const id = "11111111-1111-4111-8111-111111111111";
  try {
    createPortableDesign(root, [{ id, name: "Page", elements: {
      schemaVersion: 2,
      byId: { image: { id: "image", props: { src: `bingo-asset:${"a".repeat(64)}.png`, fallback: "file:///Users/example/image.png" } } },
      childrenByParent: { ROOT: ["image"] },
    } }]);
    const result = await inspectProjectPortability(root);
    assert.equal(result.status, "needs-content");
    assert.equal(result.missingAssets.length, 1);
    assert.deepEqual(result.localPaths, ["file:///Users/example/image.png"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
