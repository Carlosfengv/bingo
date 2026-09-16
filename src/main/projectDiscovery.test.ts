import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { discoverProjectCandidates } from "./projectDiscovery";

async function fixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-discovery-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof contents === "string" ? contents : JSON.stringify(contents, null, 2));
  }
  return root;
}

async function withFixture(files, run) {
  const root = await fixture(files);
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("opens a plain eligible React project without inventing a workspace", async () => {
  await withFixture({
    "package.json": { name: "plain-app", dependencies: { react: "^19.0.0", vite: "^7.0.0" } },
    "src/App.tsx": "export default function App() { return <main>Hello</main>; }",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "plain" });
    assert.equal(result.status, "complete");
    assert.equal(result.workspaceRoot, undefined);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].relativePath, ".");
    assert.equal(result.candidates[0].compatibility, "eligible");
    assert.equal(result.candidates[0].canOpen, true);
  });
});

test("discovers pnpm applications and component packages", async () => {
  await withFixture({
    "package.json": { name: "workspace", private: true },
    "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "apps/web/package.json": { name: "web", dependencies: { react: "^19.0.0", next: "^16.0.0" } },
    "apps/web/app/page.tsx": "export default function Page() { return <div>Web</div>; }",
    "packages/ui/package.json": { name: "@acme/ui", peerDependencies: { react: "^19.0.0" } },
    "packages/ui/src/Button.tsx": "import React from 'react'; export const Button = () => <button />;",
    "packages/math/package.json": { name: "@acme/math" },
    "packages/math/src/index.ts": "export const add = (a, b) => a + b;",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "pnpm" });
    assert.equal(result.status, "complete");
    assert.equal(result.workspaceRoot, await fs.realpath(root));
    assert.deepEqual(result.candidates.map((item) => item.relativePath).sort(), ["apps/web", "packages/ui"]);
    assert.equal(result.candidates.find((item) => item.relativePath === "apps/web")?.kind, "application");
    assert.equal(result.candidates.find((item) => item.relativePath === "packages/ui")?.kind, "component-library");
  });
});

test("supports package.json workspace objects and keeps style warnings actionable", async () => {
  await withFixture({
    "package.json": { name: "workspace", private: true, workspaces: { packages: ["packages/*"] } },
    "packages/forms/package.json": { name: "forms", peerDependencies: { react: "^19.0.0" } },
    "packages/forms/src/Form.tsx": "export function Form() { return <form />; }",
    "packages/forms/src/Form.module.scss": ".form { color: red; }",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "npm-workspaces" });
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].compatibility, "needs_attention");
    assert.equal(result.candidates[0].canOpen, true);
    assert.equal(result.candidates[0].diagnostics[0].code, "partial_style_support");
  });
});

test("honors deep workspace globs and exclusion patterns", async () => {
  await withFixture({
    "package.json": { name: "workspace", private: true },
    "pnpm-workspace.yaml": "packages:\n  - 'products/**'\n  - '!products/legacy/**'\n",
    "products/cloud/regions/us/console/package.json": { name: "console", dependencies: { react: "^19.0.0", vite: "^7.0.0" } },
    "products/cloud/regions/us/console/src/App.tsx": "export const App = () => <main />;",
    "products/legacy/admin/package.json": { name: "legacy", dependencies: { react: "^19.0.0", vite: "^7.0.0" } },
    "products/legacy/admin/src/App.tsx": "export const App = () => <main />;",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "deep-workspace" });
    assert.deepEqual(result.candidates.map((item) => item.relativePath), ["products/cloud/regions/us/console"]);
  });
});

test("uses package.json workspaces as a recoverable fallback when pnpm YAML is invalid", async () => {
  await withFixture({
    "package.json": { name: "workspace", private: true, workspaces: ["apps/*"] },
    "pnpm-workspace.yaml": "catalog:\n  react: 19.0.0\n",
    "apps/web/package.json": { name: "web", dependencies: { react: "^19.0.0", vite: "^7.0.0" } },
    "apps/web/src/App.tsx": "export const App = () => <main />;",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "invalid-pnpm" });
    assert.equal(result.status, "partial");
    assert.deepEqual(result.candidates.map((item) => item.relativePath), ["apps/web"]);
    assert.equal(result.diagnostics[0].code, "invalid_pnpm_workspace");
  });
});

test("shows native Astro projects as unsupported instead of silently opening them", async () => {
  await withFixture({
    "package.json": { name: "astro-site", dependencies: { astro: "^5.0.0" } },
    "src/Card.astro": "<article>Card</article>",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "astro" });
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].framework, "astro");
    assert.equal(result.candidates[0].compatibility, "unsupported");
    assert.equal(result.candidates[0].canOpen, false);
  });
});

test("falls back to a bounded container scan when the selected directory is not a package", async () => {
  await withFixture({
    "apps/admin/package.json": { name: "admin", dependencies: { react: "^19.0.0", vite: "^7.0.0" } },
    "apps/admin/src/App.jsx": "export const App = () => <div>Admin</div>;",
  }, async (root) => {
    const result = await discoverProjectCandidates(root, { requestId: "fallback" });
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].relativePath, "apps/admin");
    assert.equal(result.workspaceRoot, await fs.realpath(root));
  });
});

test("honors cancellation before filesystem discovery begins", async () => {
  await withFixture({
    "package.json": { name: "cancelled", dependencies: { react: "^19.0.0" } },
    "src/App.tsx": "export const App = () => <div />;",
  }, async (root) => {
    const controller = new AbortController();
    controller.abort();
    const result = await discoverProjectCandidates(root, { requestId: "cancelled", signal: controller.signal });
    assert.equal(result.status, "cancelled");
    assert.equal(result.candidates.length, 0);
  });
});
