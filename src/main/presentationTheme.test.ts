import assert from "node:assert/strict";
import test from "node:test";

import { themeSelectionQueryValue } from "./presentationServer";

test("passes an explicit inherited theme selection into presentation URLs", () => {
  assert.equal(themeSelectionQueryValue({ kind: "theme", themeId: "ocean" }), "ocean");
  assert.equal(themeSelectionQueryValue({ kind: "system" }), "system");
  assert.equal(themeSelectionQueryValue({ kind: "theme", themeId: "" }), null);
  assert.equal(themeSelectionQueryValue(null), null);
});
