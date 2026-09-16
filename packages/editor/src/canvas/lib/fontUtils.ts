/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/fontUtils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Apply fonts to the document.
*
* - Google fonts → inject <link> to Google Fonts CDN + CSS variable bindings
* - Local fonts → generate @font-face rules + CSS variable bindings
* - Sets font-family on canvas elements
*
* @param fonts - Parsed font config from parseFontsFromLayout()
* @param assetResolver - How to resolve local font paths. Either:
*   - A string prefix: final URL = `${prefix}/app/${fontPath}`  (Electron)
*   - A function: final URL = resolver(`app/${fontPath}`)  (Cloud — for query-param APIs)
*/
function applyFonts(fonts, assetResolver) {
  let primaryFontFamily = null;
  if (fonts.local.length > 0) {
    const fontFaceRules = [];
    const cssVarBindings = [];
    for (const localFont of fonts.local) {
      if (!primaryFontFamily) primaryFontFamily = localFont.name;
      cssVarBindings.push(`  ${localFont.variable}: "${localFont.name}";`);
      for (const file of localFont.files) {
        const fontPath = file.path.replace("./", "");
        const relativePath = `app/${fontPath}`;
        const fontUrl = typeof assetResolver === "function" ? assetResolver(relativePath) : assetResolver ? `${assetResolver}/${relativePath}` : `/${relativePath}`;
        const ext = fontPath.split(".").pop();
        const format = ext === "otf" ? "opentype" : ext === "ttf" ? "truetype" : ext === "woff2" ? "woff2" : "woff";
        fontFaceRules.push(`@font-face { font-family: "${localFont.name}"; src: url("${fontUrl}") format("${format}"); font-weight: ${file.weight}; font-style: ${file.style}; font-display: swap; }`);
      }
    }
    if (fontFaceRules.length > 0) {
      const varBlock = cssVarBindings.length > 0 ? `\n[data-element-id], .bingo-canvas {\n${cssVarBindings.join("\n")}\n}` : "";
      injectStyle("bingo-project-local-fonts", fontFaceRules.join("\n") + varBlock);
    }
  }
  if (fonts.google.length > 0) {
    injectLink("bingo-project-fonts", "https://fonts.googleapis.com/css2?" + fonts.google.map(f => `family=${f.name.replace(/_/g, "+")}:wght@200;300;400;500;600;700;800;900`).join("&") + "&display=swap");
    const cssVarRules = [];
    for (const f of fonts.google) if (f.variable) {
      const displayName = f.name.replace(/_/g, " ");
      cssVarRules.push(`  ${f.variable}: "${displayName}";`);
    }
    if (cssVarRules.length > 0) injectStyle("bingo-project-font-vars", `:root, [data-element-id], .bingo-canvas {\n${cssVarRules.join("\n")}\n}`);
    if (!primaryFontFamily) primaryFontFamily = fonts.google.map(f => `"${f.name.replace(/_/g, " ")}"`).join(", ");
  }
  if (primaryFontFamily) injectStyle("bingo-project-font-style", `@layer base { :where([data-canvas-root-id], .bingo-canvas) { font-family: ${primaryFontFamily.includes(",") ? `${primaryFontFamily}, sans-serif` : `"${primaryFontFamily}", sans-serif`}; } }`);
}
/**
* Remove all font-related style/link elements injected by applyFonts.
*/
function cleanupFonts() {
  for (const id of ["bingo-project-local-fonts", "bingo-project-fonts", "bingo-project-font-vars", "bingo-project-font-style"]) document.getElementById(id)?.remove();
}
function injectStyle(id, content) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = content;
}
function injectLink(id, href) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("link");
    el.id = id;
    el.rel = "stylesheet";
    document.head.appendChild(el);
  }
  el.href = href;
}

export { applyFonts, cleanupFonts };
