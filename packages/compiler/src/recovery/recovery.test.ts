import assert from "node:assert/strict";
import test from "node:test";

import { generateJSX } from "../codegen/generateJSX";
import { parseJSX } from "../codegen/parseJSX";
import { getById, getChildren$2, getRootIds } from "../store/read";
import { JSX_RECOVERY_RULES } from "./jsxRegistry";
import { parseCanvasJsx } from "./parseCanvasJsx";

const libraries = {};
const components = {};

test("adjacent canvas roots recover once without adding a layout element", () => {
  const result = parseCanvasJsx("<div data-kind=\"first\" />\n<span data-kind=\"second\" />", libraries, components, undefined, {
    operation: "canvas_insert",
    forceNewIds: true
  });
  const roots = getRootIds(result.store);

  assert.equal(result.recovery.status, "recovered");
  assert.equal(result.recovery.attempts.length, 1);
  assert.equal(result.recovery.attempts[0].ruleId, "jsx.wrap-adjacent-roots");
  assert.deepEqual(roots.map(id => getById(result.store, id)?.tag), ["div", "span"]);
  assert.deepEqual(roots.map(id => getById(result.store, id)?.props?.["data-kind"]), ["first", "second"]);
});

test("normal single roots and existing fragments do not run recovery", () => {
  const single = parseCanvasJsx("<div />", libraries, components, undefined, { operation: "canvas_add" });
  const fragment = parseCanvasJsx("<><div /><span /></>", libraries, components, undefined, { operation: "canvas_add" });

  assert.equal(single.recovery.status, "unchanged");
  assert.equal(fragment.recovery.status, "unchanged");
  assert.equal(getRootIds(fragment.store).length, 2);
});

test("nested shorthand fragments preserve descendants at root and child positions", () => {
  const rootFragment = parseJSX("<><><div data-depth={2} /></><span /></>", libraries, components);
  assert.deepEqual(getRootIds(rootFragment).map(id => getById(rootFragment, id)?.tag), ["div", "span"]);

  const childFragment = parseJSX("<section><><span>one</span><svg><><linearGradient /></></svg></></section>", libraries, components);
  const section = getRootIds(childFragment)[0];
  const childIds = getChildren$2(childFragment, section);
  assert.deepEqual(childIds.map(id => getById(childFragment, id)?.tag), ["span", "svg"]);
  const svgId = childIds[1];
  assert.equal(getById(childFragment, getChildren$2(childFragment, svgId)[0])?.tag, "linearGradient");
});

test("update and edit reject multiple roots instead of keeping the first", () => {
  for (const operation of ["canvas_update", "canvas_edit"] as const) {
    assert.throws(
      () => parseCanvasJsx("<><div /><span /></>", libraries, components, undefined, { operation }),
      (error: any) => error.code === "CANVAS_ROOT_COUNT_MISMATCH"
        && error.recovery?.status === "failed"
        && error.recovery?.stage === "validate"
    );
  }
});

test("recovery can be disabled globally or by rule id", () => {
  const input = "<div />\n<span />";
  assert.throws(
    () => parseCanvasJsx(input, libraries, components, undefined, { operation: "canvas_insert", recoveryEnabled: false }),
    (error: any) => error.reasonCode === "UnwrappedAdjacentJSXElements" && error.recovery?.attempts.length === 0
  );
  assert.throws(
    () => parseCanvasJsx(input, libraries, components, undefined, {
      operation: "canvas_insert",
      disabledRuleIds: ["jsx.wrap-adjacent-roots"]
    }),
    (error: any) => error.reasonCode === "UnwrappedAdjacentJSXElements" && error.recovery?.attempts.length === 0
  );
});

test("a recovery candidate with another syntax error fails without a partial store", () => {
  assert.throws(
    () => parseCanvasJsx("<div />\n<span>", libraries, components, undefined, { operation: "canvas_add" }),
    (error: any) => error.recovery?.status === "failed"
      && error.recovery?.attempts.length === 1
      && error.recovery.attempts[0].outcome === "failed"
  );
});

test("recovery refuses dynamic content that the canvas converter would drop", () => {
  assert.throws(
    () => parseCanvasJsx("<div />\n<span>{visible && <b>value</b>}</span>", libraries, components, undefined, { operation: "canvas_insert" }),
    (error: any) => error.code === "UNSUPPORTED_JSX_CONTENT"
      && error.recovery?.status === "failed"
      && error.recovery?.initialError?.reasonCode === "UnwrappedAdjacentJSXElements"
      && error.recovery?.candidateError?.location?.line === 2
  );
});

test("multi-root generated JSX round-trips through the recovery entry", () => {
  const original = parseCanvasJsx("<><div title=\"one\">A</div><span title=\"two\">B</span></>", libraries, components, undefined, {
    operation: "canvas_add"
  }).store;
  const generated = generateJSX(original);
  const reparsed = parseCanvasJsx(generated, libraries, components, undefined, { operation: "canvas_add" });

  assert.equal(reparsed.recovery.status, "recovered");
  assert.deepEqual(
    getRootIds(reparsed.store).map(id => ({ tag: getById(reparsed.store, id)?.tag, title: getById(reparsed.store, id)?.props?.title })),
    [{ tag: "div", title: "one" }, { tag: "span", title: "two" }]
  );
});

test("recovery rejects dynamic attributes and spreads instead of discarding them", () => {
  for (const input of [
    '<section />\n<section title={title} />',
    '<section />\n<section {...props} />',
    '<section />\n<section style={{ color: theme.color }} />',
    '<section />\n<Component options={["static", dynamic]} />',
  ]) {
    assert.throws(() => parseCanvasJsx(input, libraries, components, undefined, { operation: "canvas_add" }),
      (error: any) => error.code === "UNSUPPORTED_JSX_CONTENT" && error.recovery?.status === "failed");
  }
});

test("recovery registry has stable unique ids", () => {
  assert.deepEqual(JSX_RECOVERY_RULES.map(rule => `${rule.id}@${rule.version}`), ["jsx.wrap-adjacent-roots@1"]);
  assert.equal(new Set(JSX_RECOVERY_RULES.map(rule => rule.id)).size, JSX_RECOVERY_RULES.length);
});

test("a broken or no-op injected rule is bounded to one attempt", () => {
  const input = "<div />\n<span />";
  assert.throws(
    () => parseCanvasJsx(input, libraries, components, undefined, {
      operation: "canvas_insert",
      rules: [{
        id: "test.throw",
        version: 1,
        matches: () => true,
        propose: () => { throw new Error("broken rule"); }
      }]
    }),
    (error: any) => error.recovery?.attempts.length === 1
      && error.recovery.attempts[0].ruleId === "test.throw"
      && error.recovery.attempts[0].outcome === "failed"
  );
  assert.throws(
    () => parseCanvasJsx(input, libraries, components, undefined, {
      operation: "canvas_insert",
      rules: [{
        id: "test.noop",
        version: 1,
        matches: () => true,
        propose: context => ({ candidate: context.input, summary: "noop" })
      }]
    }),
    (error: any) => error.recovery?.attempts.length === 1
      && error.recovery.attempts[0].outcome === "skipped"
  );
});
