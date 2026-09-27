import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isDesignStyleSource } from "./projectDesignStyles";
import { captureProjectBuildFingerprint, inspectProjectBuildFingerprint, validateProjectBuildFingerprint } from "./projectBuildFingerprint";

test("only current page writes are design stylesheet changes", () => {
  assert.equal(isDesignStyleSource(".bingo/design/pages/page.json"), true);
  assert.equal(isDesignStyleSource(".bingo\\design\\pages\\page.json"), true);
  for (const file of [".bingo/design/chats/chat.json", ".bingo/design/manifest.json", ".bingo/design/pages/.page.json.tmp", ".bingo/design/canvases/page.versions/1.json"]) {
    assert.equal(isDesignStyleSource(file), false);
  }
});

test("cached builds detect page creation, edits and deletion while the app is closed", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-design-css-"));
  const capture = () => captureProjectBuildFingerprint(root, { workspaceRoot: root });
  try {
    const empty = await capture();
    const page = path.join(root, ".bingo/design/pages/page.json");
    await fs.mkdir(path.dirname(page), { recursive: true });
    await fs.writeFile(page, '{"className":"gap-16"}');
    assert.equal(await validateProjectBuildFingerprint(root, empty), false);
    const created = await capture();
    assert.equal(await validateProjectBuildFingerprint(root, created), true);
    await fs.writeFile(page, '{"className":"gap-24"}');
    assert.equal(await validateProjectBuildFingerprint(root, created), false);
    const edited = await capture();
    await fs.unlink(page);
    assert.equal(await validateProjectBuildFingerprint(root, edited), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("cached builds detect an installed dependency symlink changing targets", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-dependency-link-"));
  try {
    const modules = path.join(root, "node_modules/@example");
    await fs.mkdir(modules, { recursive: true });
    await fs.symlink("../first-version", path.join(modules, "library"));
    const fingerprint = await captureProjectBuildFingerprint(root, { workspaceRoot: root });
    await fs.unlink(path.join(modules, "library"));
    await fs.symlink("../second-version", path.join(modules, "library"));
    const inspection = await inspectProjectBuildFingerprint(root, fingerprint);
    assert.equal(inspection.valid, false);
    assert.equal(inspection.incremental, false);
    assert.equal(inspection.reason, "directory_changed");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
