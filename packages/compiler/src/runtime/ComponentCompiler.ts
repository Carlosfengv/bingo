/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/ComponentCompiler.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { initBingoRuntime } from "./runtime";

var ComponentCompiler = class {
  constructor(config = {}) {
    this.runtimeInitialized = false;
    this.projectRoot = null;
    this.config = config;
  }
  getProjectRoot() {
    return this.projectRoot;
  }
  /** Set up window.React / window.ReactDOM for the import map. */
  async initRuntime() {
    if (this.runtimeInitialized) return;
    initBingoRuntime();
    this.runtimeInitialized = true;
  }
  setProjectRoot(root) {
    if (this.projectRoot !== root) {
      this.projectRoot = root;
      window.__BINGO_PROJECT_PATH__ = root;
      this.runtimeInitialized = false;
      document.querySelectorAll("style[data-bingo-component-css]").forEach(el => el.remove());
      initBingoRuntime();
      this.runtimeInitialized = true;
      this.config.onProjectRootChanged?.(root);
    }
  }
};
/** Recover the bare display name from a (possibly qualified) component key. */
function componentDisplayName(key) {
  const i = key.indexOf("::");
  return i === -1 ? key : key.slice(0, i);
}

export { ComponentCompiler, componentDisplayName };
