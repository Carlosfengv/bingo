import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseCompositionFile } from "../packages/compiler/src/codegen/extractCompositionElement";
import { parseCompositionJsx } from "../packages/compiler/src/codegen/parseComposition";
import { lintCanvasDesign } from "../packages/compiler/src/codegen/canvasDesignLint";
import { extractComponentPropMetadata } from "../src/main/componentPropMetadata";

const project = path.resolve(process.argv[2]);
const componentPath = "components/ui/badge.tsx";
const props = extractComponentPropMetadata(fs.readFileSync(path.join(project, componentPath), "utf8")).Badge;
const catalog = {Badge: {path:componentPath, exportName:"Badge", props}};
const source = fs.readFileSync(path.join(project, "components/ui/badge.compositions.tsx"), "utf8");
const parsed = parseCompositionFile(source);
const examples = [...parsed.jsxByExport].map(([name, jsx]) => {
  assert.equal(lintCanvasDesign(jsx, catalog).some(issue => issue.severity === "error"), false, name);
  const first = parseCompositionJsx(jsx, {}, catalog);
  const second = parseCompositionJsx(jsx, {}, catalog);
  const nodes = [...first.byId.values()];
  const badge = nodes.find(node => node.type === "component" && node.componentName === "Badge");
  assert.ok(badge, `${name} must preserve a real Badge instance`);
  assert.ok(!second.byId.has(badge.id), `${name} must mint fresh instance ids on each drop`);
  return {name, variant:badge.props?.variant ?? "default", nodes:nodes.length};
});
for (const variant of ["default", "success", "warning"]) assert.ok(examples.some(example => example.variant === variant), `Missing ${variant} example`);
console.log(JSON.stringify({passed:true, examples}));
