/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/lib/projectRootStore.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Persistent cache of project-root paths the user picked manually when
* auto-detection (capture pipeline Tier 1+2) failed. Keyed by
* (projectId, dev-server origin) so a fresh project starts with a blank
* slate instead of inheriting mappings from every other project the user
* has ever opened.
*
* Fallback layer only — never used unless auto-detection bailed and the
* user explicitly chose a folder via the "Select project root" dialog.
*/
var PREFIX$1 = "bingo.projectRoot.";
var LEGACY_MIGRATION_FLAG = "bingo.projectRoot.__legacyMigrated";
function originOf(sourceUrl) {
  try {
    return new URL(sourceUrl).origin;
  } catch {
    return null;
  }
}
function keyFor$1(projectId, origin) {
  return `${PREFIX$1}${projectId}.${origin}`;
}
/**
* One-time wipe of pre-migration globals. The previous shape was
* `bingo.projectRoot.<origin>` (no project scoping), which caused
* every project to inherit every save-to-code mapping the user had
* ever made. Drop them so the new per-project store starts clean.
*
* Idempotent — guarded by a flag so we only sweep once per install.
*/
function migrateLegacyKeysOnce() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LEGACY_MIGRATION_FLAG)) return;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX$1) || key === LEGACY_MIGRATION_FLAG) continue;
      const suffix = key.slice(22);
      if (/^https?:\/\//.test(suffix)) toRemove.push(key);
    }
    for (const k of toRemove) localStorage.removeItem(k);
    localStorage.setItem(LEGACY_MIGRATION_FLAG, "1");
  } catch {}
}
function getRememberedRoot(projectId, sourceUrl) {
  if (typeof window === "undefined") return null;
  migrateLegacyKeysOnce();
  const origin = originOf(sourceUrl);
  if (!origin) return null;
  try {
    return localStorage.getItem(keyFor$1(projectId, origin));
  } catch {
    return null;
  }
}
function setRememberedRoot(projectId, sourceUrl, path) {
  if (typeof window === "undefined") return;
  migrateLegacyKeysOnce();
  const origin = originOf(sourceUrl);
  if (!origin) return;
  try {
    localStorage.setItem(keyFor$1(projectId, origin), path);
  } catch {}
}

export { getRememberedRoot, setRememberedRoot };
