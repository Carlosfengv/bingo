import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  APP_PREFERENCES_FILENAME,
  readAppPreferences,
  writeAppPreferences,
} from "./appPreferences";

test("app preferences default to the system language", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-preferences-"));
  assert.deepEqual(readAppPreferences(root), { localePreference: "system", warning: null });
});

test("app preferences persist a supported language", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-preferences-"));
  writeAppPreferences(root, "zh-CN");
  assert.deepEqual(readAppPreferences(root), { localePreference: "zh-CN", warning: null });
  const saved = JSON.parse(fs.readFileSync(path.join(root, APP_PREFERENCES_FILENAME), "utf8"));
  assert.equal(saved.schemaVersion, 1);
});

test("invalid preferences fall back without overwriting the file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-preferences-"));
  const file = path.join(root, APP_PREFERENCES_FILENAME);
  fs.writeFileSync(file, "not json", "utf8");
  const result = readAppPreferences(root);
  assert.equal(result.localePreference, "system");
  assert.match(result.warning ?? "", /Could not read preferences/);
  assert.equal(fs.readFileSync(file, "utf8"), "not json");
});
