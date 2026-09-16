import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  configureProjectAccess,
  getProjectAccessContext,
  getProjectAllowedPaths,
  getProjectExtraPaths,
  hasProjectAccessRecord,
  grantProjectPath,
  setProjectAccessMode,
  setProjectAllowedPaths,
  subscribeProjectAccessChanges,
} from "./projectAccess";

async function fixture(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-access-"));
  const project = path.join(directory, "project");
  const extra = path.join(directory, "shared");
  const userData = path.join(directory, "user-data");
  await Promise.all([fs.mkdir(project), fs.mkdir(extra), fs.mkdir(userData)]);
  configureProjectAccess({ userDataRoot: userData, resolveProjectRoot: id => id === "local-project" ? project : null });
  try {
    await run({ project, extra, userData });
  } finally {
    configureProjectAccess();
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("a registered local project is the default AI directory without extra setup", async () => {
  await fixture(async ({ project }) => {
    assert.deepEqual(getProjectAllowedPaths("local-project"), [await fs.realpath(project)]);
    assert.deepEqual(getProjectExtraPaths("local-project"), []);
    assert.deepEqual(getProjectAllowedPaths("cloud-project"), []);
  });
});

test("extra folders persist in app data and never duplicate the project root", async () => {
  await fixture(async ({ project, extra, userData }) => {
    assert.equal(hasProjectAccessRecord("local-project"), false);
    setProjectAllowedPaths("local-project", [project, extra, extra, path.join(project, "missing")]);
    assert.equal(hasProjectAccessRecord("local-project"), true);
    assert.deepEqual(getProjectExtraPaths("local-project"), [await fs.realpath(extra)]);
    configureProjectAccess({ userDataRoot: userData, resolveProjectRoot: id => id === "local-project" ? project : null });
    assert.deepEqual(getProjectAllowedPaths("local-project"), [await fs.realpath(project), await fs.realpath(extra)]);
  });
});

test("grant and access modes preserve explicit extra folders", async () => {
  await fixture(async ({ project, extra }) => {
    assert.equal(grantProjectPath("local-project", extra), true);
    assert.equal(grantProjectPath("local-project", path.join(project, "missing")), false);
    assert.deepEqual(setProjectAccessMode("local-project", "disabled").allowedPaths, []);
    const restored = setProjectAccessMode("local-project", "edit");
    assert.deepEqual(restored.allowedPaths, [await fs.realpath(project), await fs.realpath(extra)]);
  });
});

test("unregistered project ids cannot authorize an arbitrary existing directory", async () => {
  await fixture(async ({ project }) => {
    assert.deepEqual(getProjectAccessContext(project), { projectRoot: null, mode: "disabled", extraRoots: [], allowedPaths: [] });
    assert.deepEqual(setProjectAllowedPaths(project, [project]), []);
  });
});

test("access changes publish previous and next state for active runtime revocation", async () => {
  await fixture(async ({ project, extra }) => {
    const events = [];
    const unsubscribe = subscribeProjectAccessChanges(event => events.push(event));
    try {
      setProjectAllowedPaths("local-project", [extra]);
      setProjectAllowedPaths("local-project", []);
      setProjectAccessMode("local-project", "read-only");
    } finally {
      unsubscribe();
    }
    assert.equal(events.length, 3);
    assert.equal(events[1].previous.extraRoots.length, 1);
    assert.equal(events[1].next.extraRoots.length, 0);
    assert.equal(events[2].next.mode, "read-only");
  });
});

test("a damaged existing access record fails closed", async () => {
  await fixture(async ({ project, userData }) => {
    const key = crypto.createHash("sha256").update(await fs.realpath(project)).digest("hex").slice(0, 32);
    const file = path.join(userData, "local-project-data", key, "project-access.json");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{not-json", "utf8");

    const context = getProjectAccessContext("local-project");
    assert.equal(context.mode, "disabled");
    assert.equal(context.integrity, "invalid");
    assert.deepEqual(context.allowedPaths, []);
  });
});
