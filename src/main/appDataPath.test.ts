import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { bingoUserDataPath, resolvedUserDataPath } from "./appDataPath";

test("Bingo uses its own production Electron data directory", () => {
  assert.equal(bingoUserDataPath("/Application Support", false), path.join("/Application Support", "Bingo"));
});

test("Bingo uses its own development Electron data directory", () => {
  assert.equal(bingoUserDataPath("/Application Support", true), path.join("/Application Support", "Bingo", "dev"));
});

test("an explicit Electron user-data directory remains isolated", () => {
  assert.equal(resolvedUserDataPath("/Application Support", false, "/tmp/bingo-e2e"), path.resolve("/tmp/bingo-e2e"));
});
