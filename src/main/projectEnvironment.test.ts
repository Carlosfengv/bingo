import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectProjectEnvironment, prepareProjectEnvironment } from "./projectEnvironment";

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-environment-"));
  try { await run(root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}

test("does not install when project dependencies are already available", async () => {
  await fixture(async root => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
    assert.equal(inspectProjectEnvironment(root).status, "ready");
    const result = await prepareProjectEnvironment(root, { isAllowedRoot: () => false });
    assert.equal(result.success, true);
  });
});

test("uses the existing lockfile and never proposes a production build", async () => {
  await fixture(async root => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    await fs.writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const result = inspectProjectEnvironment(root);
    assert.equal(result.status, "needs-install");
    assert.deepEqual(result.installPlan.args, ["install", "--frozen-lockfile"]);
    assert.equal(result.productionBuildRequired, false);
  });
});

test("requires explicit access when a monorepo install runs above the selected project", async () => {
  await fixture(async root => {
    const project = path.join(root, "apps/web");
    await fs.mkdir(project, { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ private: true, workspaces: ["apps/*"] }));
    await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
    await fs.writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await fs.writeFile(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    const inspection = inspectProjectEnvironment(project);
    assert.equal(inspection.workspaceRoot, await fs.realpath(root));
    await assert.rejects(() => prepareProjectEnvironment(project, { isAllowedRoot: () => false }), error => error?.code === "OUTSIDE_PROJECT_ROOT");
  });
});

test("the displayed workspace can be authorized for preparation without granting general folder access", async () => {
  await fixture(async root => {
    const project = path.join(root, "apps/web");
    await fs.mkdir(project, { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ workspaces: { packages: ["apps/*"] } }));
    await fs.writeFile(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    let installs = 0;
    const runInstall = async plan => {
      installs++;
      assert.equal(plan.cwd, await fs.realpath(root));
      await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
      return "installed";
    };
    await assert.rejects(prepareProjectEnvironment(project, { confirmedWorkspaceRoot: project, isAllowedRoot: () => false, runInstall }), error => error.code === "OUTSIDE_PROJECT_ROOT");
    assert.equal(installs, 0);
    const result = await prepareProjectEnvironment(project, { confirmedWorkspaceRoot: root, isAllowedRoot: () => false, runInstall });
    assert.equal(installs, 1);
    assert.equal(result.inspection.status, "ready");
  });
});

test("opening a child checks build dependencies declared at its workspace root", async () => {
  await fixture(async root => {
    const project = path.join(root, "apps/web");
    await fs.mkdir(project, { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ workspaces: ["apps/*"], devDependencies: { tailwindcss: "4.0.0" } }));
    await fs.writeFile(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
    assert.deepEqual(inspectProjectEnvironment(project).missingDependencies, ["tailwindcss"]);
    await fs.mkdir(path.join(root, "node_modules/tailwindcss"), { recursive: true });
    assert.equal(inspectProjectEnvironment(project).status, "ready");
  });
});

test("concurrent preparations share installation and recheck dependencies afterwards", async () => {
  await fixture(async root => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    let calls = 0;
    let finish;
    const gate = new Promise(resolve => { finish = resolve; });
    const runInstall = async () => {
      calls += 1;
      await gate;
      await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
      return "installed";
    };
    const first = prepareProjectEnvironment(root, { runInstall });
    const second = prepareProjectEnvironment(root, { runInstall });
    finish();
    const results = await Promise.all([first, second]);
    assert.equal(calls, 1);
    assert.ok(results.every(result => result.success && result.inspection.status === "ready"));
  });
});

test("a failed preparation can retry and a successful command with missing packages still fails", async () => {
  await fixture(async root => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    await assert.rejects(prepareProjectEnvironment(root, { runInstall: async () => { throw new Error("offline"); } }), /offline/);
    await assert.rejects(prepareProjectEnvironment(root, { runInstall: async () => "done" }), error => error.code === "DEPENDENCIES_MISSING");
    const result = await prepareProjectEnvironment(root, { runInstall: async () => {
      await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
      return "installed";
    } });
    assert.equal(result.success, true);
  });
});

test("preparation waits for setup scripts even when dependency folders already exist", async () => {
  await fixture(async root => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1.0.0" } }));
    let foldersCreated;
    const foldersReady = new Promise(resolve => { foldersCreated = resolve; });
    let finishScripts;
    const scripts = new Promise(resolve => { finishScripts = resolve; });
    const first = prepareProjectEnvironment(root, { runInstall: async () => {
      await fs.mkdir(path.join(root, "node_modules/react"), { recursive: true });
      foldersCreated();
      await scripts;
      return "done";
    } });
    await foldersReady;
    let completed = false;
    const second = prepareProjectEnvironment(root).then(result => { completed = true; return result; });
    await Promise.resolve();
    assert.equal(completed, false);
    finishScripts();
    const results = await Promise.all([first, second]);
    assert.ok(results.every(result => result.success));
  });
});
