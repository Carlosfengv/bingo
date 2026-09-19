import path from "node:path";
import postcss from "postcss";
import type { ChildNode } from "postcss";

type TokenDeclaration = {
  name: string;
  value: string;
  file: string;
  line: number;
  scope: string[];
  theme: boolean;
};

const ENTRY_PATHS = ["app/globals.css", "src/app/globals.css", "styles/globals.css", "src/styles/globals.css", "src/index.css", "src/styles.css", "globals.css", "index.css", "styles.css"];
const MAX_FILES = 64;
const MAX_DECLARATIONS = 250;

/** Suggestions require an actual @theme declaration, not just a familiar name. */
function utilityHint(token: TokenDeclaration) {
  if (!token.theme) return "";
  if (token.value === "initial" || token.name.includes("*")) return "namespace reset; not a usable value";
  const namespaces: [string, (name: string) => string][] = [
    ["--color-", name => `bg-${name}, text-${name}, border-${name}`],
    ["--font-weight-", name => `font-${name}`],
    ["--font-", name => `font-${name}`],
    ["--text-", name => `text-${name}`],
    ["--radius-", name => `rounded-${name}`],
    ["--spacing-", name => `p-${name}, gap-${name}`],
    ["--shadow-", name => `shadow-${name}`],
    ["--leading-", name => `leading-${name}`],
    ["--tracking-", name => `tracking-${name}`],
    ["--breakpoint-", name => `${name}: responsive variant`],
  ];
  // Companion properties such as --text-sm--line-height do not create classes.
  if (token.name.slice(2).includes("--")) return "companion theme property; no standalone utility";
  if (token.name === "--spacing") return "numeric spacing scale (p-4, gap-6, etc.)";
  for (const [prefix, format] of namespaces) {
    if (token.name.startsWith(prefix)) return `@theme utility candidates: ${format(token.name.slice(prefix.length))}`;
  }
  return "CSS variable; check its source usage";
}

function importSpecifier(params: string) {
  const match = params.match(/^\s*(?:url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)|"([^"]+)"|'([^']+)')\s*(.*)$/i);
  if (!match) return null;
  return { target: match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5], conditions: match[6].trim() };
}

/** Read only project metadata paths; never execute configs or fetch remote CSS. */
export async function collectProjectTheme(filePaths: string[], readFile: (file: string) => Promise<string | null>) {
  const paths = new Set(filePaths);
  const candidates = filePaths.filter(file => file.endsWith(".css") && !file.endsWith(".module.css")).sort();
  const entry = ENTRY_PATHS.find(file => paths.has(file))
    ?? candidates.find(file => /(?:global|index)/i.test(path.posix.basename(file)))
    ?? (candidates.length === 1 ? candidates[0] : null);
  const declarations: TokenDeclaration[] = [];
  const warnings: string[] = [];
  const files = new Set<string>();
  const cache = new Map<string, ReturnType<typeof postcss.parse> | null>();
  const configs = filePaths.filter(file => /(?:^|\/)tailwind\.config\.(?:js|cjs|mjs|ts)$/.test(file));
  if (!entry) return { entry, declarations, warnings: [candidates.length ? `CSS entry is ambiguous. Inspect source imports: ${candidates.slice(0, 10).join(", ")}` : "No CSS entry was discovered. This does not establish that the project has no design system."], files: [], configs };

  let visits = 0;
  async function visit(file: string, scope: string[], ancestors: string[]) {
    if (ancestors.includes(file)) { warnings.push(`CSS import cycle: ${[...ancestors, file].join(" → ")}`); return; }
    if (++visits > MAX_FILES || declarations.length >= MAX_DECLARATIONS) {
      warnings.push("Theme summary limit reached; read the remaining source files before concluding a token is absent.");
      return;
    }
    if (!cache.has(file)) {
      try {
        const css = await readFile(file);
        if (css === null) throw new Error("file unavailable");
        cache.set(file, postcss.parse(css, { from: file }));
        files.add(file);
      } catch (error) {
        cache.set(file, null);
        warnings.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const root = cache.get(file);
    if (!root) return;
    async function walk(nodes: ChildNode[], context: string[], inTheme = false) {
      for (const node of nodes) {
        if (node.type === "atrule" && node.name === "import") {
          const imported = importSpecifier(node.params);
          if (!imported) { warnings.push(`${file}: cannot inspect @import ${node.params}`); continue; }
          if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(imported.target)) {
            warnings.push(`${file}: remote CSS not inspected (${imported.target})`);
            continue;
          }
          const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), imported.target));
          const resolved = [target, `${target}.css`, `${target}/index.css`].find(candidate => paths.has(candidate));
          if (imported.target.startsWith("/") || target === ".." || target.startsWith("../")) {
            warnings.push(`${file}: import outside project not inspected (${imported.target})`);
          } else if (resolved) {
            await visit(resolved, imported.conditions ? [...context, `@import ${imported.conditions}`] : context, [...ancestors, file]);
          } else if (/^tailwindcss(?:\/|$)/.test(imported.target)) {
            warnings.push(`${file}: Tailwind package defaults are not enumerated; this is not a complete utility catalog.`);
          } else if (!imported.target.startsWith(".")) {
            warnings.push(`${file}: package CSS ${imported.target} is not inspected by this source summary. This is NOT a compilation failure; preserve the import unless the compiler reports an actual resolution error.`);
          } else {
            warnings.push(`${file}: unresolved CSS import ${imported.target}; inspect its package or missing file.`);
          }
        } else if (node.type === "atrule" && ["config", "plugin"].includes(node.name)) {
          warnings.push(`${file}: @${node.name} ${node.params} was not evaluated; inspect source configuration for additional utilities.`);
        } else if (node.type === "decl" && node.prop.startsWith("--")) {
          if (declarations.length < MAX_DECLARATIONS) declarations.push({
            name: node.prop, value: node.value + (node.important ? " !important" : ""),
            file, line: node.source?.start?.line ?? 1, scope: context, theme: inTheme,
          });
          else warnings.push("Token declarations truncated; inspect the source for remaining tokens.");
        } else if (node.type === "rule") {
          await walk(node.nodes, [...context, node.selector], inTheme);
        } else if (node.type === "atrule" && node.nodes) {
          await walk(node.nodes, [...context, `@${node.name}${node.params ? ` ${node.params}` : ""}`], inTheme || node.name === "theme");
        }
      }
    }
    await walk(root.nodes, scope);
  }
  await visit(entry, [], []);
  return { entry, declarations, warnings: [...new Set(warnings)], files: [...files], configs };
}

export function formatProjectThemeSummary(theme: Awaited<ReturnType<typeof collectProjectTheme>>) {
  const lines = [
    `## Project Theme${theme.entry ? ` (from ${theme.entry})` : " (discovery incomplete)"}`,
    "Source declarations, NOT computed styles or proof that a utility compiled. Preserve scopes and aliases; do not collapse light/dark values.",
    "Use component variants first, then source semantic tokens for surfaces/text/status, then source scales. Outside @theme use the source's class/binding (including any hsl/rgb wrapper); no utility is inferred.",
    "Entry selected by conventional filename; inspect actual source imports if this is not the active stylesheet. Coverage is limited to its local import graph.",
    `Inspected CSS: ${theme.files.join(", ") || "none"}`,
  ];
  if (theme.configs.length) lines.push(`Tailwind configs (not evaluated): ${theme.configs.join(", ")}. Read these for v3 mappings; CSS variables alone do not establish bg-primary, etc.`);
  // Put uncertainty before declarations so bounded agent contexts retain it.
  if (theme.warnings.length) lines.push("Coverage notes:", ...theme.warnings.map(warning => `  ${warning}`));
  let bytes = Buffer.byteLength(lines.join("\n"));
  let shown = 0;
  for (const token of theme.declarations) {
    const hint = utilityHint(token);
    const line = `  ${token.file}:${token.line} [${token.scope.join(" → ") || "top level"}] ${token.name}: ${token.value}${hint ? `\n    ${hint}` : ""}`;
    bytes += Buffer.byteLength(line) + 1;
    if (bytes > 16_000) break;
    lines.push(line);
    shown++;
  }
  if (shown < theme.declarations.length) lines.splice(2, 0, `Declarations shown: ${shown}/${theme.declarations.length} (summary truncated). Read the source files for omitted values; absence here does not mean a token is missing.`);
  if (!theme.declarations.length) lines.push("No custom properties found in inspected CSS. Check source classes, imports and configuration; do not treat this as permission to invent a parallel theme.");
  return lines.join("\n");
}
