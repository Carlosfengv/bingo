import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  clearProjectBuildCache,
  configureProjectBuildCache,
  getProjectBuildCache,
  setProjectBuildCache,
} from "./projectBuildCache";

function projectKey(root) {
  return crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
}

function fixtureSnapshot() {
  const code = Buffer.from("export const Card = () => null;").toString("base64");
  const css = Buffer.from(".card { color: red; }").toString("base64");
  return {
    modules: [{ path: "src/Card.tsx", codeUrl: `data:text/javascript;base64,${code}`, cssImports: [] }],
    componentIndex: { Card: { path: "src/Card.tsx", exportName: "Card" } },
    cssUrl: `data:text/css;base64,${css}`,
    dependencyFiles: [],
    buildInputFiles: [],
    cssFiles: [],
    workspaceRoot: "/workspace",
    complete: true,
    buildFailures: [],
  };
}

function fixtureFingerprint() {
  return {
    version: 1,
    workspaceRoot: "/workspace",
    trackedFiles: [],
    trackedDirectories: [],
    digest: "fixture-snapshot",
  };
}

test("persists a complete build and restores it after the memory cache is cleared", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-build-cache-"));
  const projectRoot = path.join(userDataRoot, "project");
  await fs.mkdir(projectRoot);
  configureProjectBuildCache(userDataRoot);
  try {
    const snapshot = fixtureSnapshot();
    await setProjectBuildCache(projectRoot, snapshot, fixtureFingerprint());
    await clearProjectBuildCache();

    const restored = await getProjectBuildCache(projectRoot);
    assert.ok(restored);
    assert.equal(restored.source, "disk");
    assert.deepEqual(restored.snapshot.componentIndex, snapshot.componentIndex);
    assert.equal(restored.snapshot.modules[0].codeUrl, snapshot.modules[0].codeUrl);
    assert.equal(restored.snapshot.cssUrl, snapshot.cssUrl);
  } finally {
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});

test("rejects a disk snapshot when a cached module is corrupted", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-build-cache-"));
  const projectRoot = path.join(userDataRoot, "project");
  await fs.mkdir(projectRoot);
  configureProjectBuildCache(userDataRoot);
  try {
    await setProjectBuildCache(projectRoot, fixtureSnapshot(), fixtureFingerprint());
    await clearProjectBuildCache();
    const modulesDirectory = path.join(
      userDataRoot,
      "build-cache/v1",
      projectKey(projectRoot),
      "snapshots/fixture-snapshot/modules",
    );
    const [moduleFile] = await fs.readdir(modulesDirectory);
    await fs.writeFile(path.join(modulesDirectory, moduleFile), "corrupt");

    assert.equal(await getProjectBuildCache(projectRoot), null);
  } finally {
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});
