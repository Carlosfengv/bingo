import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { discoverProjectIconLibraries } from "./projectIconDiscovery";

async function fixture(files, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-icons-"));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const file = path.join(root, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, typeof content === "string" ? content : JSON.stringify(content));
    }
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("discovers manifest and source-subpath icon libraries without writing files", async () => {
  await fixture({
    "package.json": { dependencies: { "@ant-design/icons": "1", "react-icons": "1", react: "1" } },
    "src/App.tsx": `import { HomeOutlined } from "@ant-design/icons";\nimport { FaBeer } from "react-icons/fa";`,
  }, async root => {
    const before = await fs.readdir(root);
    const result = discoverProjectIconLibraries(root, {
      iconLibraries: [],
      iconLibraryPolicy: { mode: "auto", disabledLibraries: [] },
    });
    assert.deepEqual(result.enabled, ["@ant-design/icons", "react-icons/fa"]);
    assert.equal(result.libraries.find(item => item.specifier === "@ant-design/icons")?.sources.includes("manifest"), true);
    assert.equal(result.libraries.find(item => item.specifier === "react-icons/fa")?.sources.includes("source-import"), true);
    assert.deepEqual(await fs.readdir(root), before);
  });
});

test("legacy manual mode preserves an explicit empty selection", async () => {
  await fixture({ "package.json": { dependencies: { "lucide-react": "1" } } }, async root => {
    const result = discoverProjectIconLibraries(root, {
      iconLibraries: [],
      iconLibraryPolicy: { mode: "manual", disabledLibraries: [] },
    });
    assert.deepEqual(result.automatic, ["lucide-react"]);
    assert.deepEqual(result.enabled, []);
  });
});

test("auto mode combines manual entries and honors disabled libraries", async () => {
  await fixture({
    "package.json": { dependencies: { "lucide-react": "1", "@heroicons/react": "1" } },
    "src/icons.ts": [
      `import type { Icon } from "@tabler/icons-react";`,
      `export type { IconProps } from "@fortawesome/free-solid-svg-icons";`,
      `export { type IconType } from "@iconify/react";`,
    ].join("\n"),
  }, async root => {
    const result = discoverProjectIconLibraries(root, {
      iconLibraries: ["react-icons/fi"],
      iconLibraryPolicy: { mode: "auto", disabledLibraries: ["lucide-react"] },
    });
    assert.deepEqual(result.automatic, ["@heroicons/react/24/outline", "lucide-react"]);
    assert.deepEqual(result.enabled, ["@heroicons/react/24/outline", "react-icons/fi"]);
  });
});
