import assert from "node:assert/strict";
import test from "node:test";
import postcss from "postcss";
import { editorCssBoundary } from "../../tools/editor-css-boundary";

test("editor CSS keeps document tokens on the scope root and namespaces global registrations", async () => {
  const input = `@layer base {html, :host {font-family:var(--font-sans)} * {box-sizing:border-box}}
    :root {--font-sans:Inter;--ed-background:white}
    html.editor-dark {--ed-background:black}
    .editor-dark .icon {filter:invert(1)}
    .flex {display:flex;transform:translateX(var(--tw-translate-x))}
    @property --tw-translate-x {syntax:"*";inherits:false;initial-value:0}`;
  const result = await postcss([editorCssBoundary()]).process(input, { from: "/app/src/renderer/src/index.css" });
  const nodes = result.root.nodes;
  assert.equal(nodes[0].toString(), "@layer bingo-project-baseline");
  assert.equal(nodes[1].type, "atrule");
  assert.equal((nodes[1] as postcss.AtRule).name, "scope");
  assert.equal((nodes[1] as postcss.AtRule).params, "(:root) to ([data-canvas-content], [data-drag-overlay])");
  assert.match(result.css, /:scope \{--font-sans:Inter/);
  assert.match(result.css, /:scope.editor-dark \{--ed-background:black/);
  assert.match(result.css, /:scope.editor-dark \.icon/);
  assert.match(result.css, /var\(--ed-tw-translate-x\)/);
  assert.match(result.css, /@property --ed-tw-translate-x/);
  assert.doesNotMatch(result.css, /--tw-/);
});

test("project CSS is left unchanged, including its root, layers and custom property contracts", async () => {
  const input = ":root {--tw-translate-x:9px} @layer base {html {font-size:20px}} .flex {display:grid}";
  const result = await postcss([editorCssBoundary()]).process(input, { from: "/project/src/index.css" });
  assert.equal(result.css, input);
});
