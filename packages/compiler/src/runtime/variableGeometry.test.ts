import assert from "node:assert/strict";
import { test } from "node:test";
import { cssVariablesAffectOnlyPaint, type VariableStyleUsage } from "./variableGeometry";

const changed = new Set(["color"]);
const usage = (declarations: VariableStyleUsage["declarations"], conditions: string[] = []): VariableStyleUsage => ({ complete: true, declarations, conditions });
test("CSS source colors are safe only through paint consumers, including aliases and fallbacks", () => {
  const chain = [{ property: "--a", value: "var( --color)" }, { property: "--b", value: "var(--a)" }];
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([...chain, { property: "backgroundColor", value: "var(--b)" }])), true);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([...chain, { property: "width", value: "var(--b)" }])), false);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([{ property: "padding", value: "var(--absent, var(--color))" }])), false);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([{ property: "font-size", value: "var(--unrelated)" }])), true);
});
test("cycles terminate and unknown sheets, escaped identifiers and style queries fall back", () => {
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([{ property: "--a", value: "var(--b, var(--color))" }, { property: "--b", value: "var(--a)" }])), true);
  assert.equal(cssVariablesAffectOnlyPaint(changed, { ...usage([]), complete: false }), false);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([{ property: "width", value: "var(--co\\6cor)" }])), false);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([], ["@container style(--color: red)"])), false);
  assert.equal(cssVariablesAffectOnlyPaint(changed, usage([], ['div[style*="red"]'])), false);
});
