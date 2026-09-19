import assert from "node:assert/strict";
import test from "node:test";
import { findComponentCandidates } from "../codegen/componentSemantics";
import { lintCanvasDesign } from "../codegen/canvasDesignLint";
import { parseCanvasJsx } from "./parseCanvasJsx";
import { getById } from "../store/read";

const catalog = {
  Button: { path: "ui/button.tsx", props: { variant: { type: '"default" | "outline" | undefined' } } },
  StatusPill: { path: "ui/status-pill.tsx", props: { tone: { type: '"neutral" | "attention"' } } },
  TextField: { path: "ui/text-field.tsx" },
  Card: { path: "ui/card.tsx" },
};

test("discovery finds source synonyms and keeps direct matches first", () => {
  assert.deepEqual(findComponentCandidates(catalog, "badge").map(([name]) => name), ["StatusPill"]);
  assert.deepEqual(findComponentCandidates(catalog, "输入框").map(([name]) => name), ["TextField"]);
  assert.deepEqual(findComponentCandidates({ StatusPill: catalog.StatusPill, Badge: { path: "ui/badge.tsx" } }, "badge").map(([name]) => name), ["Badge", "StatusPill"]);
  assert.deepEqual(findComponentCandidates(catalog, "does-not-exist"), []);
});

test("real components and native layout/text pass and retain component identity", () => {
  const jsx = '<div className="flex gap-4"><Card data-element-id="card"><span className="text-muted-foreground">Status</span><StatusPill data-element-id="status" tone="attention" /><Button variant="outline" className="w-full" /></Card></div>';
  assert.deepEqual(lintCanvasDesign(jsx, catalog), []);
  const { store } = parseCanvasJsx(jsx, {}, catalog, undefined, { operation: "canvas_add" });
  assert.equal(getById(store, "card")?.type, "component");
  assert.equal(getById(store, "status")?.componentName, "StatusPill");
});

test("an unsupported literal variant is an error, but unknown/open APIs are not guessed", () => {
  assert.equal(lintCanvasDesign('<Button variant="secondary" />', catalog)[0].severity, "error");
  assert.deepEqual(lintCanvasDesign('<Button variant="outline" />', catalog), []);
  assert.deepEqual(lintCanvasDesign('<Missing variant="anything" />', catalog), []);
  assert.deepEqual(lintCanvasDesign('<Button variant="custom" />', { Button: { props: { variant: { type: '"default" | string' } } } }), []);
  assert.deepEqual(lintCanvasDesign('<Button variant="custom" />', { Button: { props: { variant: { type: "VariantProps<typeof styles>" } } } }), []);
});

test("appearance overrides and token-bypassing literals produce actionable warnings", () => {
  const issues = lintCanvasDesign('<Card className="w-full hover:bg-red-500 rounded-lg" style={{ borderRadius: "12px" }}><div className="bg-white p-[13px]" style={{ color: "#333", gap: 17, width: 800 }} /></Card>', catalog);
  assert.ok(issues.some(issue => issue.code === "COMPONENT_APPEARANCE_OVERRIDE"));
  assert.ok(issues.some(issue => issue.code === "PRIMITIVE_DESIGN_VALUE"));
  assert.ok(issues.some(issue => issue.property === "style.color"));
  assert.ok(issues.some(issue => issue.property === "style.gap"));
  assert.ok(issues.every(issue => issue.severity === "warning" && issue.property !== "style.width"));
});

test("layout classes and actual token references are not literal-style warnings", () => {
  assert.deepEqual(lintCanvasDesign('<div className="bg-surface text-muted-foreground p-4 gap-6 text-[length:var(--label)]" style={{ color: "hsl(var(--foreground))", gap: "var(--gutter)", margin: 0 }}><Card className="w-full text-left flex-1" /></div>', catalog), []);
});

test("semantic substitutes are suggestions, not blanket div/span bans", () => {
  const issues = lintCanvasDesign('<div><span className="inline-flex rounded-full bg-status px-2">Ready</span><div role="button">Save</div><div data-slot="card" /></div>', catalog);
  const suggestions = issues.filter(issue => issue.code === "POSSIBLE_COMPONENT_SUBSTITUTE");
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions[0].message.includes("StatusPill"));
  assert.ok(suggestions.every(issue => issue.severity === "warning"));
  assert.deepEqual(lintCanvasDesign('<div className="flex"><span>Label</span></div>', catalog), []);
  assert.ok(lintCanvasDesign('<input type="email" />', { TextField: catalog.TextField })[0].message.includes("TextField"));
  assert.deepEqual(lintCanvasDesign('<input type="checkbox" />', { TextField: catalog.TextField }), []);
});

test("editing copy does not re-report legacy styles or invalid variants", () => {
  const before = '<div data-element-id="root" style={{ color: "red" }}><Button data-element-id="button" variant="old">Before</Button></div>';
  assert.deepEqual(lintCanvasDesign(before.replace("Before", "After"), catalog, before), []);
  assert.equal(lintCanvasDesign(before.replace('variant="old"', 'variant="bad"'), catalog, before)[0].severity, "error");
  assert.equal(lintCanvasDesign(before.replace('color: "red"', 'color: "blue"'), catalog, before)[0].property, "style.color");
});

test("moving a violation onto another identified element is a new issue", () => {
  const before = '<div><Button data-element-id="a" variant="bad" /><Button data-element-id="b" /></div>';
  const after = '<div><Button data-element-id="a" /><Button data-element-id="b" variant="bad" /></div>';
  assert.equal(lintCanvasDesign(after, catalog, before)[0].elementId, "b");
});

test("syntax errors stay with the parser and text examples are never evaluated as JSX", () => {
  assert.deepEqual(lintCanvasDesign('<div>{"<Button variant=bad />"}</div>', catalog), []);
  assert.deepEqual(lintCanvasDesign('<Button variant="bad"', catalog), []);
  assert.equal(lintCanvasDesign('<Button variant="outline" /><StatusPill tone="invalid" />', catalog)[0].element, "StatusPill");
});
