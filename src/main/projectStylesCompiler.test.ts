import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compileProjectStyles } from "./projectStylesCompiler";

async function fixture(files, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-styles-"));
  try {
    for (const [name, contents] of Object.entries({ "package.json": "{}", ...files })) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), contents);
    }
    await run(root);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}

test("CSS follows source entry imports, preserves order, and ignores unrelated styles", async () => {
  await fixture({
    "src/App.tsx": "import './index.css'; export const App = () => <div />;",
    "src/index.css": '@import "./base.css"; .card { color: blue; }',
    "src/base.css": ".card { color: red; }",
    "unused.css": ".card { color: green; }",
  }, async root => {
    const result = await compileProjectStyles({ root, sourceFiles: [path.join(root, "src/App.tsx")], cssFiles: [path.join(root, "unused.css")] });
    assert.doesNotMatch(result.css, /@import|green/);
    assert.ok(result.css.indexOf("red") < result.css.indexOf("blue"));
    assert.ok(result.dependencies.includes(path.join(root, "src/base.css")));
  });
});

test("local assets become resolvable URLs and participate in cache invalidation", async () => {
  await fixture({ "index.css": '.card { background: url("./icon.svg"); }', "icon.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>' }, async root => {
    const result = await compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] });
    assert.match(result.css, /data:image\/svg\+xml/);
    assert.ok(result.dependencies.includes(path.join(root, "icon.svg")));
  });
});

test("missing import fails at compile time instead of shipping a broken stylesheet", async () => {
  await fixture({ "index.css": '@import "./missing.css";' }, async root => {
    await assert.rejects(compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] }), /missing\.css/);
  });
});

test("raw Tailwind directives cannot masquerade as compiled CSS when dependencies are absent", async () => {
  await fixture({ "index.css": '@import "tailwindcss"; @theme { --color-brand: red; }' }, async root => {
    await assert.rejects(compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] }), /Tailwind compiler/);
  });
});

test("plain projects retain the remote-resource policy", async () => {
  await fixture({ "index.css": '@import "https://example.com/track.css"; .card { background: url("https://example.com/pixel.png"); }' }, async root => {
    const result = await compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] });
    assert.doesNotMatch(result.css, /example\.com/);
  });
});
