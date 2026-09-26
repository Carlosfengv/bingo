import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { compileProjectStyles } from "./projectStylesCompiler";

const requireTest = createRequire(import.meta.url);

async function installFixtureTailwind(root) {
  await fs.mkdir(path.join(root, "node_modules/@tailwindcss"), { recursive: true });
  await fs.symlink(path.resolve(path.dirname(requireTest.resolve("@tailwindcss/postcss")), ".."), path.join(root, "node_modules/@tailwindcss/postcss"), "dir");
  await fs.symlink(path.dirname(requireTest.resolve("tailwindcss/package.json")), path.join(root, "node_modules/tailwindcss"), "dir");
}

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

test("root-relative CSS assets resolve from public without dropping canvas utilities", async () => {
  await fixture({
    "app/globals.css": '@import "tailwindcss" source(none); @theme { --color-fg-default: #123456; } @font-face { font-family: Test; src: url("/fonts/Test.ttf") format("truetype"); }',
    "public/fonts/Test.ttf": "fixture-font-bytes",
    ".bingo/design/pages/page.json": '{"className":"text-fg-default"}',
  }, async root => {
    await installFixtureTailwind(root);
    const result = await compileProjectStyles({ root, cssFiles: [path.join(root, "app/globals.css")] });
    assert.match(result.css, /data:font\/ttf/);
    assert.match(result.css, /\.text-fg-default\s*\{/);
    assert.ok(result.dependencies.includes(path.join(root, "public/fonts/Test.ttf")));
  });
});

test("root-relative CSS assets cannot follow public symlinks outside the project", async () => {
  await fixture({ "index.css": '.card { background: url("/outside.svg"); }' }, async root => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-styles-outside-"));
    try {
      await fs.writeFile(path.join(outside, "outside.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
      await fs.mkdir(path.join(root, "public"));
      await fs.symlink(path.join(outside, "outside.svg"), path.join(root, "public/outside.svg"));
      await assert.rejects(compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] }), /outside the project/);
    } finally { await fs.rm(outside, { recursive: true, force: true }); }
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

test("canvas-only spacing compiles with source(none), including new pages and token edits", async () => {
  const originalCss = '@import "tailwindcss" source(none); @theme { --spacing: 0.5rem; }';
  await fixture({
    "index.css": originalCss,
    ".gitignore": ".bingo/\n",
    ".bingo/design/pages/first.json": JSON.stringify({ elements: [{ props: { className: "flex gap-16 p-12" } }] }),
    ".bingo/design/chats/chat.json": '{"text":"p-99"}',
    ".bingo/design/canvases/old.versions/1.json": '{"className":"gap-99"}',
  }, async root => {
    await installFixtureTailwind(root);
    const compile = () => compileProjectStyles({ root, cssFiles: [path.join(root, "index.css")] });
    const first = await compile();
    assert.match(first.css, /\.gap-16\s*\{/);
    assert.match(first.css, /\.p-12\s*\{/);
    assert.match(first.css, /--spacing:\s*0.5rem/);
    assert.doesNotMatch(first.css, /\.(?:p|gap)-99\s*\{/);
    assert.ok(first.dependencies.includes(path.join(root, ".bingo/design/pages/first.json")));
    assert.equal(await fs.readFile(path.join(root, "index.css"), "utf8"), originalCss);

    await fs.writeFile(path.join(root, ".bingo/design/pages/second.json"), '{"className":"gap-23 p-17"}');
    const second = await compile();
    assert.match(second.css, /\.gap-23\s*\{/);
    assert.match(second.css, /\.p-17\s*\{/);
    await fs.writeFile(path.join(root, "index.css"), originalCss.replace("0.5rem", "0.75rem"));
    assert.match((await compile()).css, /--spacing:\s*0.75rem/);
  });
});
