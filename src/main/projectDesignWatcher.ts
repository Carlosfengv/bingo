import fs from "node:fs";
import path from "node:path";

import { portableDesignRevision } from "./projectDesignStore";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function watchPortableDesign(root, onChange, options = {}) {
  const projectRoot = fs.realpathSync(root);
  const debounceMs = options.debounceMs ?? 100;
  const stabilityDelayMs = options.stabilityDelayMs ?? 75;
  let lastRevision = portableDesignRevision(projectRoot);
  let timer = null;
  let closed = false;

  const readStableRevision = async () => {
    let first = portableDesignRevision(projectRoot);
    await wait(stabilityDelayMs);
    let second = portableDesignRevision(projectRoot);
    if (first !== second) {
      await wait(stabilityDelayMs);
      first = second;
      second = portableDesignRevision(projectRoot);
    }
    return { revision: second, stable: first === second };
  };

  const publish = async () => {
    timer = null;
    if (closed) return;
    const next = await readStableRevision();
    if (closed || next.revision === lastRevision) return;
    const previousRevision = lastRevision;
    lastRevision = next.revision;
    onChange({ ...next, previousRevision });
  };

  const schedule = () => {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(() => void publish(), debounceMs);
  };

  const watcher = fs.watch(projectRoot, { recursive: true }, (_event, filename) => {
    if (!filename) { options.onFileChange?.(""); return schedule(); }
    const normalized = String(filename).split(path.sep).join("/");
    options.onFileChange?.(normalized, _event);
    if (normalized === ".bingo" || normalized.startsWith(".bingo/design")) schedule();
  });
  watcher.on("error", error => options.onError?.(error));

  return {
    acknowledge() {
      lastRevision = portableDesignRevision(projectRoot);
    },
    close() {
      closed = true;
      clearTimeout(timer);
      watcher.close();
    },
  };
}

export { watchPortableDesign };
