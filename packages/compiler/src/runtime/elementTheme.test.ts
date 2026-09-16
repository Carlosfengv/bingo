import assert from "node:assert/strict";
import test from "node:test";

import { generateJSX } from "../codegen/generateJSX";
import { parseJSX } from "../codegen/parseJSX";
import { ensureV2 } from "../store/ensureV2";
import { getRootIds } from "../store/read";
import { toWire } from "../store/wire";
import { applyElementThemeBinding, validateElementThemeBindings, validateElementThemeMetadata } from "./elementTheme";

const library = {
  version: 1,
  collections: [{ id: "colors", defaultModeId: "light", modes: [{ id: "light" }, { id: "dark" }] }],
  requiredTokenIds: ["page-bg"],
  tokens: [{
    id: "page-bg",
    collectionId: "colors",
    type: "color",
    cssName: "page-bg",
    valuesByMode: {
      light: { kind: "literal", value: "#fff" },
      dark: { kind: "literal", value: "#111" }
    }
  }],
  assets: []
};

test("applies a style binding and preserves metadata through canvas persistence", () => {
  const element = applyElementThemeBinding(
    { id: "root", type: "html", tag: "main", styles: { padding: "1rem" } },
    { target: "style", property: "backgroundColor", tokenId: "page-bg" },
    library
  );
  assert.equal(element.styles.backgroundColor, "var(--page-bg)");
  const restored = ensureV2(toWire(ensureV2([element])));
  assert.deepEqual(restored.byId.get("root").theme, element.theme);
  assert.deepEqual(validateElementThemeBindings(restored, library), []);
});

test("keeps the CSS variable expression in source while editor metadata stays out of DOM props", () => {
  const element = applyElementThemeBinding(
    { id: "root", type: "html", tag: "main" },
    { target: "style", property: "backgroundColor", tokenId: "page-bg" },
    library
  );
  const jsx = generateJSX(ensureV2([element]), 0, { includeDataElementId: true });
  assert.match(jsx, /var\(--page-bg\)/);
  assert.doesNotMatch(jsx, /theme=/);
  const parsed = parseJSX(jsx, {}, {});
  const parsedRoot = parsed.byId.get(getRootIds(parsed)[0]);
  assert.equal(parsedRoot.styles.backgroundColor, "var(--page-bg)");
});

test("reports stale values, unknown local modes and malformed metadata", () => {
  const store = ensureV2([{
    id: "root",
    type: "html",
    tag: "main",
    styles: { backgroundColor: "#fff" },
    theme: {
      version: 1,
      bindings: [{ target: "style", property: "backgroundColor", tokenId: "page-bg" }],
      localCollectionModes: { colors: "missing" }
    }
  }]);
  const diagnostics = validateElementThemeBindings(store, library);
  assert.ok(diagnostics.some(item => item.code === "THEME_BINDING_VALUE_MISMATCH"));
  assert.ok(diagnostics.some(item => item.code === "THEME_LOCAL_MODE_UNKNOWN"));
  assert.throws(() => validateElementThemeMetadata({ version: 2 }), error => error?.code === "THEME_BINDING_INVALID");
});
