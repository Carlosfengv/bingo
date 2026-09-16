#!/usr/bin/env node
// Parse every reconstructed file and report syntax errors.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const req = createRequire(import.meta.url);
const parser = req("/Users/carlos/Downloads/new111/tools/node_modules/@babel/parser");
const index = JSON.parse(fs.readFileSync(path.join(HERE, "modules.json"), "utf8"));
let ok = 0, bad = [];
for (const m of index.modules) {
  const f = path.join(ROOT, m.output);
  const code = fs.readFileSync(f, "utf8");
  try {
    parser.parse(code, { sourceType: "module", plugins: ["jsx", "typescript"] });
    ok++;
  } catch (e) {
    bad.push([m.output, e.message.split("\n")[0]]);
  }
}
console.log(`parsed cleanly: ${ok}/${index.modules.length}`);
for (const [f, msg] of bad.slice(0, 25)) console.log(`  FAIL ${f}\n       ${msg}`);
if (bad.length) console.log(`  ... ${bad.length} total failures`);
