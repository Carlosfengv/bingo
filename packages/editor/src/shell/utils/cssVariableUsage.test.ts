import assert from "node:assert/strict";
import { test } from "node:test";
import { readCssVariableUsage } from "../../canvas/utils/cssVariableUsage";
import { cssVariablesAffectOnlyPaint } from "../../../../compiler/src/runtime/variableGeometry";

globalThis.CSSRule = { IMPORT_RULE: 3 } as typeof CSSRule;
function rule(property: string, value: string): any {
  return { type: 1, property, value,
    get cssText() { return `.fixture { ${this.property}: ${this.value} }`; },
    get style() { return Object.assign([this.property], { getPropertyValue: () => this.value }); },
  };
}
const documentFor = (sheet: any): Document => ({ styleSheets: [sheet], adoptedStyleSheets: [], querySelector: () => null }) as unknown as Document;
test("CSS safety notices in-place rule edits and insertions despite unchanged sheet identity", () => {
  const entry = rule("color", "var(--accent)");
  const sheet = { cssRules: [entry] }, doc = documentFor(sheet), changed = new Set(["accent"]);
  assert.equal(cssVariablesAffectOnlyPaint(changed, readCssVariableUsage(doc)), true);
  const cached = readCssVariableUsage(doc).declarations[0];
  assert.equal(readCssVariableUsage(doc).declarations[0], cached);
  entry.property = "width";
  assert.equal(cssVariablesAffectOnlyPaint(changed, readCssVariableUsage(doc)), false);
  entry.property = "color";
  sheet.cssRules.push(rule("padding", "var(--accent)"));
  assert.equal(cssVariablesAffectOnlyPaint(changed, readCssVariableUsage(doc)), false);
  sheet.cssRules.pop();
  assert.equal(cssVariablesAffectOnlyPaint(changed, readCssVariableUsage(doc)), true);
});
test("imports revalidate independently, recover after loading, and fail safely on access errors", () => {
  const imported = { cssRules: [rule("color", "var(--accent)")] };
  const entry: any = { type: 3, cssText: '@import "theme.css";', styleSheet: null };
  const doc = documentFor({ cssRules: [entry] });
  assert.equal(readCssVariableUsage(doc).complete, false);
  entry.styleSheet = imported;
  assert.equal(readCssVariableUsage(doc).complete, true);
  imported.cssRules[0].property = "height";
  assert.equal(cssVariablesAffectOnlyPaint(new Set(["accent"]), readCssVariableUsage(doc)), false);
  entry.styleSheet = { get cssRules() { throw new Error("SecurityError"); } };
  assert.equal(readCssVariableUsage(doc).complete, false);
});

test("cross-root anchor positioning requires conservative layout invalidation", () => {
  for (const [property, value] of [["anchor-name", "--anchor"], ["left", "anchor(--anchor right)"]]) {
    assert.equal(readCssVariableUsage(documentFor({ cssRules: [rule(property, value)] })).complete, false);
  }
});
