/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/skills.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as fs_promises from "fs/promises";
import * as path$31 from "path";
import * as url from "url";

/**
* System skills loader.
*
* Bingo ships built-in skills (e.g. `bingo-import-from-project`) as files in
* `packages/compiler/skills/<name>/SKILL.md` (+ optional sibling files). They live
* in code, not the DB — they're versioned with releases, no migrations, no per-org
* duplication. This loader walks that directory and returns each skill as a
* normalized record so the host process (Electron main / cloud API) can serve
* them to the AI through the Bingo MCP `list_skills` / `read_skill` tools.
*
* This file is system (built-in) skills only.
*/
var DEFAULT_SKILLS_ROOT = (0, path$31.join)((0, path$31.dirname)((0, url.fileURLToPath)(require("url").pathToFileURL(__filename).href)), "..", "..", "skills");
/**
* Read all system skills from disk.
*
* Each direct subdirectory of `packages/compiler/skills/` is treated as a skill;
* its `SKILL.md` is required (skipped with a warning if missing), other files are
* read recursively and included verbatim so claude can pick them up as references.
*
* Returns [] if the skills directory doesn't exist (e.g. broken install). Never throws —
* a missing skill file should not prevent claude from starting.
*/
async function loadSystemSkills(skillsRoot = DEFAULT_SKILLS_ROOT) {
  let entries;
  try {
    entries = await (0, fs_promises.readdir)(skillsRoot);
  } catch {
    return [];
  }
  const skills = [];
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const skillDir = (0, path$31.join)(skillsRoot, name);
    let st;
    try {
      st = await (0, fs_promises.stat)(skillDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const files = await collectFiles(skillDir, skillDir);
    if (!files.some(f => f.path === "SKILL.md")) {
      console.warn(`[skills] ${name}/SKILL.md missing — skipping`);
      continue;
    }
    skills.push({
      name,
      files
    });
  }
  return skills;
}
async function collectFiles(root, dir) {
  const out = [];
  let entries;
  try {
    entries = await (0, fs_promises.readdir)(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = (0, path$31.join)(dir, entry);
    let st;
    try {
      st = await (0, fs_promises.stat)(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...(await collectFiles(root, full)));else if (st.isFile()) {
      const content = await (0, fs_promises.readFile)(full, "utf-8");
      out.push({
        path: (0, path$31.relative)(root, full),
        content
      });
    }
  }
  return out;
}

export { loadSystemSkills };
