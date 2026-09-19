import assert from "node:assert/strict";
import test from "node:test";
import { createComputedStyleCache } from "./computedStyleCache";

test("switching selections reuses each element's snapshot without publishing unrelated values", () => {
  const cache = createComputedStyleCache();
  cache.publish("a", { width: "100px", color: "red" });
  const a = cache.get("a");
  assert.deepEqual(cache.get("b"), {});
  cache.publish("b", { width: "200px", color: "blue" });
  assert.equal(cache.get("a"), a);
  assert.equal(cache.publish("a", { width: "100px", color: "red" }), false);
  assert.equal(cache.get("a"), a);
  assert.equal(cache.publish("a", { width: "150px" }), true);
  assert.deepEqual(cache.get("a"), { width: "150px" });
  assert.deepEqual(cache.get("b"), { width: "200px", color: "blue" });
});

test("computed snapshots stay bounded while updates retain other selected elements", () => {
  const cache = createComputedStyleCache(2);
  cache.publish("a", { color: "red" }); cache.publish("b", { color: "blue" });
  cache.publish("a", { color: "pink" });
  assert.equal(cache.get("b").color, "blue");
  cache.publish("c", { color: "green" });
  assert.deepEqual(cache.get("a"), {});
  assert.equal(cache.get("b").color, "blue");
  assert.deepEqual(cache.get(null), {});
});
