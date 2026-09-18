import assert from "node:assert/strict";
import test from "node:test";
import { getCascadeBatch } from "./computedStyles";

// Model CSSOM updates independently of URL/stylesheet count changes.
globalThis.window = new EventTarget() as any;
globalThis.HTMLLinkElement = class {} as any;
globalThis.HTMLStyleElement = class {} as any;
const { getClassIndex, getClassesForProperty, subscribeClassIndex } = await import("./classIndex");

test("CSS load invalidates pending classes, suggestions and resolved spacing tokens", () => {
  const link = Object.assign(new HTMLLinkElement(), { href: "https://example.test/project.css" });
  const spacingStyle = { 0: "--spacing", length: 1, getPropertyValue: () => "0.25rem" };
  const sheet = { cssRules: [] as any[] };
  const doc = {
    styleSheets: [sheet], getElementById: () => link,
    documentElement: { classList: { contains: () => false } },
  };
  window.dispatchEvent(new Event("bingo-css-updated"));
  const before = getClassIndex(doc);
  assert.deepEqual(getClassesForProperty(doc, "columnGap", 0), []);
  sheet.cssRules = [
    { selectorText: ":root", style: spacingStyle },
    { selectorText: ".gap-16", style: { cssText: "gap: calc(var(--spacing) * 16);" } },
    { selectorText: ".p-12", style: { cssText: "padding: calc(var(--spacing) * 12);" } },
  ];
  let duringNotification;
  const unsubscribe = subscribeClassIndex(() => { duringNotification = getClassesForProperty(doc, "columnGap", 1); });
  window.dispatchEvent(new Event("bingo-css-updated"));
  unsubscribe();
  const after = getClassIndex(doc);
  assert.notEqual(before, after);
  assert.equal(getClassIndex(doc), after);
  assert.deepEqual(duringNotification, [{ className: "gap-16", value: "64px" }]);
  assert.equal(getClassesForProperty(doc, "paddingTop", 1)[0].value, "48px");
  assert.deepEqual([...getCascadeBatch(["gap-16", "p-12"], after).byClass.keys()], ["gap-16", "p-12"]);

  spacingStyle.getPropertyValue = () => "0.5rem";
  window.dispatchEvent(new Event("bingo-css-updated"));
  assert.equal(getClassesForProperty(doc, "columnGap", 2)[0].value, "128px");
});
