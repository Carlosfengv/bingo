import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { safeJoin } from "./localStore";

test("safeJoin rejects lexical and symbolic-link escapes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-safe-join-"));
  const project = path.join(directory, "project");
  const outside = path.join(directory, "outside");
  await Promise.all([fs.mkdir(project), fs.mkdir(outside)]);
  await fs.symlink(outside, path.join(project, "linked"));
  try {
    assert.throws(() => safeJoin(project, "../outside/secret.txt"), /escapes project root/);
    assert.throws(() => safeJoin(project, "linked/secret.txt"), /symbolic link/);
    assert.equal(safeJoin(project, "src/App.tsx"), path.join(await fs.realpath(project), "src/App.tsx"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
