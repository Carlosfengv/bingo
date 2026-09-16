import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const nodeModules = path.join(here, "node_modules");

// The recovered sources live in ../packages, outside this package's root, so
// Node's upward node_modules walk from the importer never reaches the deps
// installed here. Point every dependency at its installed directory explicitly.
const deps = Object.keys(
  JSON.parse(fs.readFileSync(path.join(here, "package.json"), "utf8")).dependencies || {}
);
const depAliases = Object.fromEntries(
  deps
    .filter((d) => fs.existsSync(path.join(nodeModules, d)))
    .map((d) => [d, path.join(nodeModules, d)])
);
const phosphorIconAliases = Object.fromEntries(
  ["CaretDown", "CaretRight", "CaretUp", "Check", "Circle"].map((icon) => [
    `@phosphor-icons/react/dist/icons/${icon}`,
    path.join(nodeModules, `@phosphor-icons/react/dist/csr/${icon}.es.js`),
  ])
);

const pkg = (p) => path.resolve(here, "../packages", p, "src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@bingo/ui": pkg("ui"),
      "@bingo/editor": pkg("editor"),
      "@bingo/i18n": path.resolve(here, "../packages/i18n/src/index.browser.ts"),
      // The theme runtime demo only needs the browser-safe theme resolver. Pointing
      // at the full compiler barrel also pulls Node/Babel code into this small Vite
      // harness and makes `process` leak into the browser bundle.
      "@bingo/compiler": path.resolve(here, "../packages/compiler/src/runtime/theme.ts"),
      "@bingo/workspace": pkg("workspace"),
      ...phosphorIconAliases,
      ...depAliases,
    },
  },
  // The recovered packages are siblings of this root, so allow serving them.
  server: { port: 5273, fs: { allow: [here, path.resolve(here, "..")] } },
});
