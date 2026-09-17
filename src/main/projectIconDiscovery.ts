import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isLikelyIconLibraryPackage, normalizeIconLibrarySpecifier } from "@bingo/compiler";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const SKIP_DIRECTORIES = new Set([
  "node_modules", ".git", ".bingo", ".next", "dist", "build", "out", "coverage",
]);
const MAX_SOURCE_FILES = 2_000;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function packageNameFor(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function normalizeCandidate(specifier, { fromManifest = false } = {}) {
  if (typeof specifier !== "string" || !specifier) return null;
  if (specifier === "react-icons" && fromManifest) return null;
  if (specifier.startsWith("react-icons/")) return specifier;
  if (specifier.startsWith("@mui/icons-material/")) return "@mui/icons-material";
  const normalized = normalizeIconLibrarySpecifier(specifier);
  return isLikelyIconLibraryPackage(normalized) ? normalized : null;
}

function manifestCandidates(pkg) {
  const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const output = new Set();
  for (const field of fields) {
    for (const name of Object.keys(pkg?.[field] || {})) {
      const candidate = normalizeCandidate(name, { fromManifest: true });
      if (candidate) output.add(candidate);
    }
  }
  return output;
}

function sourceFiles(root) {
  const files = [];
  const queue = [root];
  while (queue.length > 0 && files.length < MAX_SOURCE_FILES) {
    const directory = queue.shift();
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      if (files.length >= MAX_SOURCE_FILES) break;
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) queue.push(path.join(directory, entry.name));
        continue;
      }
      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(path.join(directory, entry.name));
      }
    }
  }
  return { files, partial: queue.length > 0 };
}

function importCandidates(root) {
  const { files, partial: fileLimitReached } = sourceFiles(root);
  const output = new Set();
  let bytes = 0;
  let partial = fileLimitReached;
  for (const file of files) {
    let content;
    try {
      const stat = fs.statSync(file);
      if (bytes + stat.size > MAX_SOURCE_BYTES) { partial = true; break; }
      bytes += stat.size;
      content = fs.readFileSync(file, "utf8");
    } catch { continue; }
    const patterns = [
      /(?:import|export)\s+(?:type\s+)?[^;'"]*?\s+from\s+["']([^"']+)["']/g,
      /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    ];
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        const statement = match[0].trim();
        if (/^(?:import|export)\s+type\b/.test(statement)) continue;
        const named = statement.match(/^(?:import|export)\s*\{([\s\S]*?)\}\s*from\b/);
        if (named) {
          const specifiers = named[1].split(",").map(value => value.trim()).filter(Boolean);
          if (specifiers.length > 0 && specifiers.every(value => /^type\b/.test(value))) continue;
        }
        const candidate = normalizeCandidate(match[1]);
        if (candidate) output.add(candidate);
      }
    }
  }
  return { candidates: output, partial, filesScanned: files.length, bytesScanned: bytes };
}

function readPackage(root) {
  const file = path.join(root, "package.json");
  let text;
  try { text = fs.readFileSync(file, "utf8"); }
  catch (error) {
    if (error?.code === "ENOENT") return { pkg: {}, text: "", error: null };
    return { pkg: {}, text: "", error: String(error?.message || error) };
  }
  try { return { pkg: JSON.parse(text), text, error: null }; }
  catch (error) { return { pkg: {}, text, error: `package.json is invalid: ${error.message}` }; }
}

function discoverProjectIconLibraries(root, settings = {}) {
  root = path.resolve(root);
  const packageResult = readPackage(root);
  const fromManifest = manifestCandidates(packageResult.pkg);
  const imports = importCandidates(root);
  const automatic = [...new Set([...fromManifest, ...imports.candidates])].sort();
  const manual = Array.isArray(settings.iconLibraries)
    ? settings.iconLibraries.filter(value => typeof value === "string" && value.trim()).map(value => value.trim())
    : [];
  const policy = settings.iconLibraryPolicy?.mode === "manual"
    ? { mode: "manual", disabledLibraries: [] }
    : {
        mode: "auto",
        disabledLibraries: Array.isArray(settings.iconLibraryPolicy?.disabledLibraries)
          ? settings.iconLibraryPolicy.disabledLibraries.filter(value => typeof value === "string")
          : [],
      };
  const enabled = policy.mode === "manual"
    ? [...new Set(manual)]
    : [...new Set([...automatic, ...manual])].filter(library => !policy.disabledLibraries.includes(library));
  const revision = crypto.createHash("sha256").update(JSON.stringify({ automatic, manual, policy, packageText: packageResult.text })).digest("hex");
  const manifestSet = new Set(fromManifest);
  const importSet = imports.candidates;
  return {
    projectId: root,
    revision,
    partial: imports.partial,
    error: packageResult.error,
    policy,
    automatic,
    enabled,
    filesScanned: imports.filesScanned,
    bytesScanned: imports.bytesScanned,
    libraries: [...new Set([...automatic, ...manual])].sort().map(specifier => ({
      specifier,
      packageName: packageNameFor(specifier),
      sources: [
        ...(manifestSet.has(specifier) ? ["manifest"] : []),
        ...(importSet.has(specifier) ? ["source-import"] : []),
        ...(manual.includes(specifier) ? ["manual"] : []),
      ],
      enabled: enabled.includes(specifier),
      status: enabled.includes(specifier) ? "discovered" : "disabled",
    })),
  };
}

export { discoverProjectIconLibraries, normalizeCandidate as normalizeIconLibraryCandidate };
