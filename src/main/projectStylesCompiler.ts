import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parse } from "@babel/parser";
import { build } from "esbuild";

function importedStyles(sourceFiles) {
  const entries = new Set();
  for (const file of sourceFiles) {
    let ast;
    try { ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "unambiguous", plugins: ["jsx", "typescript"], errorRecovery: true }); }
    catch { continue; }
    for (const statement of ast.program.body) {
      if (statement.type !== "ImportDeclaration" && statement.type !== "ExportNamedDeclaration" && statement.type !== "ExportAllDeclaration") continue;
      const specifier = statement.source?.value;
      if (typeof specifier !== "string" || !specifier.endsWith(".css")) continue;
      if (specifier.startsWith(".")) entries.add(path.resolve(path.dirname(file), specifier));
      else {
        try { entries.add(createRequire(file).resolve(specifier)); }
        catch { /* The fallback build below preserves unresolved import errors. */ }
      }
    }
  }
  return [...entries];
}

function standaloneStyles(files) {
  const imported = new Set();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of text.matchAll(/@import\s+(?:url\(\s*)?["'](\.[^"']+)["']/g)) {
      imported.add(path.resolve(path.dirname(file), match[1]));
    }
  }
  const roots = files.filter(file => !imported.has(file));
  return roots.length ? roots : files;
}

/** Compile styles with the project's own Tailwind adapter, then resolve assets
 * with esbuild. Never send raw build directives or relative imports to data: URLs.
 */
export async function compileProjectStyles({ root, workspaceRoot = root, sourceFiles = [], cssFiles = [] }) {
  const imported = importedStyles(sourceFiles);
  const entries = imported.length ? imported : standaloneStyles(cssFiles);
  if (!entries.length) return { css: "", dependencies: [] };
  const dependencies = new Set(entries);
  const requireProject = createRequire(path.join(root, "package.json"));
  let processTailwind;
  try {
    const adapterPath = requireProject.resolve("@tailwindcss/postcss");
    const adapter = requireProject("@tailwindcss/postcss");
    const postcss = createRequire(adapterPath)("postcss");
    dependencies.add(adapterPath);
    processTailwind = async (css, from) => {
      const result = await postcss([adapter({ base: root, optimize: false })]).process(css, { from });
      for (const message of result.messages) if (message.type === "dependency" && message.file) dependencies.add(path.resolve(message.file));
      return result.css;
    };
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
  }
  const result = await build({
    stdin: { contents: entries.map(file => `@import ${JSON.stringify(file.replace(/\\/g, "/"))};`).join("\n"), loader: "css", resolveDir: root },
    absWorkingDir: workspaceRoot, bundle: true, write: false, metafile: true,
    outfile: path.join(root, ".bingo-preview.css"), logLevel: "silent",
    loader: Object.fromEntries([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".woff", ".woff2", ".ttf", ".otf"].map(ext => [ext, "dataurl"])),
    plugins: [{ name: "project-styles", setup(builder) {
      builder.onLoad({ filter: /\.css$/ }, async ({ path: file }) => {
        dependencies.add(file);
        let contents = fs.readFileSync(file, "utf8");
        if (processTailwind) contents = await processTailwind(contents, file);
        else if (/@(?:tailwind|theme|apply|plugin|source|custom-variant)\b|@import\s+["']tailwindcss/.test(contents)) {
          throw new Error(`Stylesheet ${file} needs the project's Tailwind compiler (@tailwindcss/postcss). Prepare the project dependencies first.`);
        }
        return { contents, loader: "css", resolveDir: path.dirname(file) };
      });
    } }],
  });
  for (const file of Object.keys(result.metafile.inputs)) if (file !== "<stdin>") dependencies.add(path.resolve(workspaceRoot, file));
  const css = result.outputFiles.find(file => file.path.endsWith(".css"))?.text || "";
  // Preserve the existing remote-resource policy, including Google Fonts.
  return { css: css
    .replace(/@import\s+(?:url\()?\s*["']?https?:\/\/[^;]+;?/gi, rule => /https:\/\/fonts\.googleapis\.com\//i.test(rule) ? rule : "")
    .replace(/url\(\s*["']?https?:\/\/[^)]+\)/gi, value => /https:\/\/fonts\.gstatic\.com\//i.test(value) ? value : "url()"),
    dependencies: [...dependencies] };
}
