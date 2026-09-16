/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/styles/text.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { resolveSolidPaint } from "./paint";

function figmaTextContent(node) {
  const textData = node.textData;
  return applyFigmaLineBreaks(node, textData?.characters ?? "");
}
function applyFigmaLineBreaks(node, text) {
  const baselines = node.derivedTextData?.baselines;
  if (!baselines || baselines.length < 2) return text;
  let result = text;
  const breaks = baselines.slice(1).map(line => line.firstCharacter).filter(index => typeof index === "number" && index > 0 && index < text.length).sort((a, b) => b - a);
  for (const index of breaks) result = `${result.slice(0, index).trimEnd()}\n${result.slice(index).trimStart()}`;
  return result;
}
function mapTextStyles(node, nodeId, ctx) {
  const styles = {};
  const textData = node.textData;
  const derived = node.derivedTextData;
  const style = textData?.style;
  const fontSize = style?.fontSize ?? node.fontSize;
  if (fontSize) styles.fontSize = fontSize;
  const fontName = node.fontName;
  const fontFamily = style?.fontFamily ?? fontName?.family;
  if (fontFamily) styles.fontFamily = `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const fontWeight = style?.fontWeight ?? fontWeightFromStyleName(fontName?.style) ?? fontWeightFromMeta(fontName, derived?.fontMetaData);
  if (fontWeight) styles.fontWeight = fontWeight;
  const solidFill = (style?.fillPaints ?? node.fillPaints)?.find(p => p.type === "SOLID" && p.visible !== false);
  const color = resolveSolidPaint(solidFill, nodeId, ctx);
  if (color) styles.color = color;
  const letterSpacing = node.letterSpacing;
  if (letterSpacing?.value !== void 0) {
    if (letterSpacing.units === "PIXELS") styles.letterSpacing = `${letterSpacing.value}px`;else if (letterSpacing.units === "PERCENT") styles.letterSpacing = `${letterSpacing.value}%`;
  }
  const baselineLineHeight = node.derivedTextData?.baselines?.find(line => typeof line.lineHeight === "number" && line.lineHeight > 0)?.lineHeight;
  if (baselineLineHeight !== void 0) styles.lineHeight = `${baselineLineHeight}px`;else {
    const lineHeight = node.lineHeight;
    if (lineHeight?.value !== void 0) {
      if (lineHeight.units === "PERCENT") styles.lineHeight = lineHeight.value / 100;else if (lineHeight.units === "PIXELS") styles.lineHeight = `${lineHeight.value}px`;
    }
  }
  const textAlignHorizontal = node.textAlignHorizontal;
  if (textAlignHorizontal) {
    const mapped = {
      LEFT: "left",
      CENTER: "center",
      RIGHT: "right",
      JUSTIFIED: "justify"
    }[textAlignHorizontal];
    if (mapped) styles.textAlign = mapped;
  }
  const text = figmaTextContent(node);
  const textAutoResize = node.textAutoResize;
  if (text.includes("\n")) {
    styles.whiteSpace = "pre";
    if ((textAutoResize === "HEIGHT" || textAutoResize === "WIDTH_AND_HEIGHT") && node.size?.x) styles.display = "block";
  } else if (textAutoResize === "WIDTH_AND_HEIGHT") styles.whiteSpace = "nowrap";else if (textAutoResize === "HEIGHT" && node.size?.x) styles.display = "block";
  return styles;
}
/** Figma `size` on TEXT is the measured bounds, not always a layout constraint. */
function applyTextAutoResize(node, styles) {
  const mode = node.textAutoResize;
  if (mode === "WIDTH_AND_HEIGHT") {
    delete styles.width;
    delete styles.height;
  } else if (mode === "HEIGHT") {
    if (!figmaTextContent(node).includes("\n")) delete styles.height;
  } else if (mode === "WIDTH") delete styles.width;
}
function fontWeightFromMeta(fontName, meta) {
  if (!meta?.length) return void 0;
  if (fontName?.family || fontName?.style) {
    const match = meta.find(entry => (!fontName.style || entry.key?.style === fontName.style) && (!fontName.family || entry.key?.family === fontName.family));
    if (match?.fontWeight !== void 0) return match.fontWeight;
  }
  return meta[0]?.fontWeight;
}
function fontWeightFromStyleName(style) {
  if (!style) return void 0;
  const s = style.toLowerCase();
  if (s.includes("thin")) return 100;
  if (s.includes("extralight") || s.includes("ultralight")) return 200;
  if (s.includes("light")) return 300;
  if (s.includes("regular") || s === "normal") return 400;
  if (s.includes("medium")) return 500;
  if (s.includes("semibold") || s.includes("demibold")) return 600;
  if (s.includes("bold")) return 700;
  if (s.includes("extrabold") || s.includes("ultra")) return 800;
  if (s.includes("black") || s.includes("heavy")) return 900;
}

export { applyTextAutoResize, figmaTextContent, mapTextStyles };
