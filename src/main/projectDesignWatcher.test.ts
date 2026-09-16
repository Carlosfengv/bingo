import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createPortableDesign } from "./projectDesignStore";
import { watchPortableDesign } from "./projectDesignWatcher";

test("portable design watcher reports an external page edit and can acknowledge local writes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bingo-design-watch-"));
  await mkdir(path.join(root, ".bingo"), { recursive: true });
  const pageId = "11111111-1111-4111-8111-111111111111";
  createPortableDesign(root, [{ id: pageId, name: "Page", elements: [] }]);

  const events = [];
  const watcher = watchPortableDesign(root, event => events.push(event), { debounceMs: 20, stabilityDelayMs: 15 });
  try {
    const pageFile = path.join(root, ".bingo", "design", "pages", `${pageId}.json`);
    const page = JSON.parse(await import("node:fs/promises").then(fs => fs.readFile(pageFile, "utf8")));
    page.name = "Changed outside";
    await writeFile(pageFile, `${JSON.stringify(page, null, 2)}\n`);
    await new Promise(resolve => setTimeout(resolve, 140));
    assert.equal(events.length, 1);
    assert.equal(events[0].stable, true);

    watcher.acknowledge();
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(events.length, 1);
  } finally {
    watcher.close();
  }
});
