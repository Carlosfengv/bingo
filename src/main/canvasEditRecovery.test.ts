import assert from "node:assert/strict";
import test from "node:test";

import { applyJsxStringEdit } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { generateCanvasJSXFromNested, generateJSX, hashFullyVisibleElementSubtreesFrom } from "../../packages/compiler/src/codegen/generateJSX";
import { parseJSX } from "../../packages/compiler/src/codegen/parseJSX";
import { storeSubtreeToLegacyNested } from "../../packages/compiler/src/store/legacy";
import { getRootIds } from "../../packages/compiler/src/store/read";

function nestedFromJsx(jsx: string) {
  const store = parseJSX(jsx, {}, {});
  return storeSubtreeToLegacyNested(store, getRootIds(store)[0]);
}

test("attached element serialization matches canonical canvas_read identity attributes", () => {
  const nested = nestedFromJsx('<Button data-element-id="el-button" variant="secondary">Save</Button>');
  const attached = generateCanvasJSXFromNested(nested);
  const read = generateJSX(parseJSX(attached.jsx, {}, {}), 0, {
    includeDataElementId: true,
    iconSyntax: "canvas",
  });

  assert.equal(attached.formatVersion, "canvas-jsx-v1");
  assert.match(attached.jsx, /data-element-id="el-button"/);
  assert.doesNotMatch(attached.jsx, /\sid="el-button"/);
  assert.equal(read, attached.jsx);
});

test("depth-limited attached serialization reports hidden subtree ids", () => {
  const nested = nestedFromJsx('<div data-element-id="el-root"><section data-element-id="el-section"><Button data-element-id="el-hidden">Save</Button></section></div>');
  const result = generateCanvasJSXFromNested(nested, { maxDepth: 1 });
  const store = parseJSX(generateCanvasJSXFromNested(nested).jsx, {}, {});

  assert.equal(result.truncated, true);
  assert.deepEqual(result.stubbedElementIds, ["el-hidden"]);
  assert.match(result.jsx, /bingo:truncated id="el-hidden"/);
  assert.deepEqual([...hashFullyVisibleElementSubtreesFrom(store, "el-root", result.stubbedElementIds).keys()], []);
});

test("read proof keeps complete siblings while excluding a stub and its ancestors", () => {
  const nested = nestedFromJsx('<div data-element-id="el-root"><section data-element-id="el-section"><Button data-element-id="el-hidden">Save</Button></section><p data-element-id="el-visible">Ready</p></div>');
  const store = parseJSX(generateCanvasJSXFromNested(nested).jsx, {}, {});

  assert.deepEqual([...hashFullyVisibleElementSubtreesFrom(store, "el-root", ["el-hidden"]).keys()].sort(), ["el-visible", store.childrenByParent.get("el-visible")[0]].sort());
});

test("canvas_edit explains legacy id versus data-element-id mismatch without committing", () => {
  const current = '<Button data-element-id="el-button" variant="secondary">Save</Button>';
  const result = applyJsxStringEdit(
    current,
    '<Button id="el-button" variant="secondary">Save</Button>',
    '<Button id="el-button" variant="primary">Save</Button>',
    false,
  );

  assert.equal(result.code, "EDIT_MATCH_ID_ATTRIBUTE_MISMATCH");
  assert.equal(result.stage, "match");
  assert.equal(result.commitState, "not_started");
  assert.equal(result.details.elementId, "el-button");
  assert.match(result.details.currentExcerpt, /data-element-id="el-button"/);
  assert.equal(result.content, undefined);
});

test("canvas_edit keeps exact unique replacement semantics", () => {
  const current = '<Button data-element-id="el-button" variant="secondary">Save</Button>';
  const result = applyJsxStringEdit(current, 'variant="secondary"', 'variant="primary"', false);

  assert.equal(result.content, '<Button data-element-id="el-button" variant="primary">Save</Button>');
  assert.equal(result.replacements, 1);
});
