import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { systemSkillsPath } from "./systemSkillsPath";

test("development skills resolve from the Electron application root", () => {
  const expected = path.join("/workspace/luna", "packages", "compiler", "skills");
  assert.equal(systemSkillsPath({
    packaged: false,
    resourcesPath: "/ignored/resources",
    appPath: "/workspace/luna/tools",
    exists: candidate => candidate === expected,
  }), expected);
});

test("packaged skills resolve from copied application resources", () => {
  assert.equal(systemSkillsPath({
    packaged: true,
    resourcesPath: "/Applications/Bingo.app/Contents/Resources",
    appPath: "/ignored/app",
  }), path.join("/Applications/Bingo.app/Contents/Resources", "system-skills"));
});
