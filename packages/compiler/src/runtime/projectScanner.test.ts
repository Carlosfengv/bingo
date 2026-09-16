import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { scanProject } from "./projectScanner";

test("keeps an explicitly selected project root instead of choosing a nested package", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-scanner-"));
  try {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.mkdir(path.join(root, "apps/marketing/src"), { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "selected-root" }));
    await fs.writeFile(path.join(root, "src/tokens.css"), ":root { --brand: #123456; }");
    await fs.writeFile(path.join(root, "apps/marketing/package.json"), JSON.stringify({
      name: "nested-app",
      dependencies: { react: "^19.0.0", next: "^15.0.0", tailwindcss: "^4.0.0" },
    }));
    await fs.writeFile(path.join(root, "apps/marketing/src/App.tsx"), "export default function App() { return <main />; }");

    const result = await scanProject(root, { explicitRoot: true });

    assert.equal(result.rootPath, root);
    assert.equal(result.projectName, "selected-root");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("preserves CSS variables by theme mode while keeping the legacy default view", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-scanner-theme-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "theme-project" }));
    await fs.writeFile(path.join(root, "tokens.css"), `
      :root { --page-bg: #fff; --text-primary: #111; }
      .dark { --page-bg: #111; --text-primary: #fff; }
      [data-theme="ocean"] { --page-bg: #024; --text-primary: #eff; }
    `);
    const result = await scanProject(root, { explicitRoot: true });
    assert.equal(result.tokens.modes.default["page-bg"], "#fff");
    assert.equal(result.tokens.modes.dark["page-bg"], "#111");
    assert.equal(result.tokens.modes.ocean["page-bg"], "#024");
    assert.equal(result.tokens.semantic["page-bg"], "#fff");
    assert.match(result.tokens.themeRevision, /^theme-v1-/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
