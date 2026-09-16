import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { prototypeThemePreferencePath, readPrototypeThemePreference, writePrototypeThemePreference } from "./prototypeThemePreferences";

test("keeps prototype theme preference in the project and round-trips system", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-theme-pref-"));
  const project = path.join(base, "project");
  const userData = path.join(base, "user-data");
  await fs.mkdir(project);
  try {
    assert.equal(readPrototypeThemePreference(project, userData), null);
    const written = writePrototypeThemePreference(project, userData, { kind: "system" });
    assert.deepEqual(written.selection, { kind: "system" });
    assert.deepEqual(readPrototypeThemePreference(project, userData).selection, { kind: "system" });
    await assert.rejects(fs.stat(userData), { code: "ENOENT" });
    assert.ok(prototypeThemePreferencePath(project, userData).includes(path.join(".bingo", "design")));
    assert.match(prototypeThemePreferencePath(project, userData), /prototype-theme-preferences\.json$/);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test("rejects invalid selections without creating preference data", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-theme-pref-invalid-"));
  const project = path.join(base, "project");
  const userData = path.join(base, "user-data");
  await fs.mkdir(project);
  try {
    assert.throws(() => writePrototypeThemePreference(project, userData, {}), error => error?.code === "THEME_SELECTION_INVALID");
    await assert.rejects(fs.stat(userData), { code: "ENOENT" });
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});
