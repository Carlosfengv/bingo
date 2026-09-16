/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/svg.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Render an SVG element as `<div dangerouslySetInnerHTML={{ __html }}>`.
* Preserves `color` + `fill` so `currentColor` chains resolve without the
* source stylesheet.
*/
function captureSvg(el, ctx) {
  const svgStyles = ctx.svgWrapperStyles ? {
    ...ctx.svgWrapperStyles
  } : {};
  if (!svgStyles.color && ctx.parentCS) {
    const c = ctx.parentCS.getPropertyValue("color");
    if (c && c !== "rgb(0, 0, 0)") svgStyles.color = c;
  }
  const computedFill = window.getComputedStyle(el).fill;
  let html = el.outerHTML;
  if (computedFill && computedFill !== "rgb(0, 0, 0)") html = html.replace(/^(<svg[^>]*?)(\s*\/?>)/, (_m, open, close) => {
    if (/\bstyle\s*=\s*"/.test(open)) return open.replace(/style\s*=\s*"/, `style="fill: ${computedFill}; `) + close;
    return `${open} style="fill: ${computedFill};"${close}`;
  });
  const node = {
    id: ctx.makeId(),
    type: "html",
    tag: "div",
    props: {
      dangerouslySetInnerHTML: {
        __html: html
      }
    },
    styles: Object.keys(svgStyles).length > 0 ? svgStyles : void 0
  };
  if (ctx.iconName) {
    const w = parseFloat(String(svgStyles.width ?? "")) || void 0;
    node.capturedIcon = {
      iconName: ctx.iconName,
      ...(w ? {
        size: Math.round(w)
      } : {})
    };
  }
  return node;
}

export { captureSvg };
