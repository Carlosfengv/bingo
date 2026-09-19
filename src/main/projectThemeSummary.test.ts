import assert from "node:assert/strict";
import test from "node:test";
import { collectProjectTheme, formatProjectThemeSummary } from "./projectThemeSummary";

async function inspect(files: Record<string, string>) {
  return collectProjectTheme(Object.keys(files), async file => files[file] ?? null);
}

test("theme discovery follows local imports and preserves aliases, custom names and mode scopes", async () => {
  const result = await inspect({
    "app/globals.css": '@import "./tokens.css"; @theme inline { --color-surface: var(--surface); }',
    "app/tokens.css": ':root { --surface: white; --font-size-label: 12px; --acme-gutter: 20px; } .dark { --surface: black; }',
  });
  assert.deepEqual(result.files, ["app/globals.css", "app/tokens.css"]);
  assert.deepEqual(result.declarations.filter(token => token.name === "--surface").map(token => [token.value, token.scope]), [["white", [":root"]], ["black", [".dark"]]]);
  assert.ok(result.declarations.some(token => token.name === "--acme-gutter"));
  assert.equal(result.declarations.at(-1)?.value, "var(--surface)");
  assert.equal(result.declarations.at(-1)?.theme, true);
});

test("only actual @theme namespace declarations suggest utilities", async () => {
  const result = await inspect({ "index.css": ':root { --color-fake: red; --primary: 0 0% 100%; } @theme { --color-real: blue; --text-sm--line-height: 1.5; }' });
  const summary = formatProjectThemeSummary(result);
  assert.match(summary, /bg-real/);
  assert.doesNotMatch(summary, /bg-fake|bg-primary|text-sm--line-height \(font/);
  assert.match(summary, /companion theme property/);
  assert.match(summary, /hsl\/rgb wrapper/);
});

test("comments, quoted semicolons and media overrides are parsed as CSS", async () => {
  const result = await inspect({ "index.css": '/* --fake: red; */ :root { --content: "a;b"; --surface: white; } @media (prefers-color-scheme: dark) { :root { --surface: black; } }' });
  assert.equal(result.declarations.length, 3);
  assert.equal(result.declarations[0].value, '"a;b"');
  assert.deepEqual(result.declarations[2].scope, ["@media (prefers-color-scheme: dark)", ":root"]);
});

test("repeated imports preserve their conditions without rereading files", async () => {
  const files = { "index.css": '@import url("./tokens.css") layer(base); @import "./tokens.css" screen;', "tokens.css": ':root { --brand: red; }' };
  const reads: string[] = [];
  const result = await collectProjectTheme(Object.keys(files), async file => { reads.push(file); return files[file]; });
  assert.deepEqual(reads, ["index.css", "tokens.css"]);
  assert.deepEqual(result.declarations.map(token => token.scope[0]), ["@import layer(base)", "@import screen"]);
});

test("cycles, missing CSS and package defaults are reported without claiming no theme", async () => {
  const result = await inspect({
    "index.css": '@import "./tokens.css"; @import "./missing.css"; @import "tailwindcss";',
    "tokens.css": '@import "./index.css"; :root { --custom: blue; }',
  });
  assert.equal(result.declarations[0].name, "--custom");
  assert.ok(result.warnings.some(warning => warning.includes("cycle")));
  assert.ok(result.warnings.some(warning => warning.includes("missing.css")));
  assert.ok(result.warnings.some(warning => warning.includes("package defaults")));
});

test("v3 config is identified without executing it or inventing a mapping", async () => {
  const result = await inspect({ "index.css": '@tailwind base; :root { --primary: red; }', "tailwind.config.ts": "throw new Error('do not run')" });
  assert.deepEqual(result.configs, ["tailwind.config.ts"]);
  assert.match(formatProjectThemeSummary(result), /not evaluated/);
  assert.equal(result.declarations[0].theme, false);
});

test("ambiguous entries, malformed CSS and excessive graphs remain explicit discovery gaps", async () => {
  assert.equal((await inspect({ "a.css": "", "b.css": "" })).entry, null);
  assert.ok((await inspect({ "index.css": ":root { --bad:" })).warnings.length);
  const files = { "index.css": '@import "./0.css";' };
  for (let i = 0; i < 80; i++) files[`${i}.css`] = `@import "./${i + 1}.css"; :root { --token-${i}: red; }`;
  const result = await inspect(files);
  assert.ok(result.files.length <= 64);
  assert.ok(result.warnings.some(warning => warning.includes("limit")));
});

test("large theme summaries retain coverage warnings before bounded declarations", async () => {
  const tokens = Array.from({ length: 230 }, (_, i) => `--color-tone-${i}: oklch(0.7 0.1 ${i});`).join(" ");
  const result = await inspect({ "index.css": `@import "./missing.css"; @theme { ${tokens} }` });
  const text = formatProjectThemeSummary(result);
  assert.ok(Buffer.byteLength(text) < 16_300);
  assert.ok(text.indexOf("summary truncated") < text.indexOf("--color-tone-0"));
  assert.ok(text.indexOf("missing.css") < text.indexOf("--color-tone-0"));
});
