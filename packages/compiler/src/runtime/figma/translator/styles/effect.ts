/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/styles/effect.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { rgbaToCss } from "../../utils/color";

function mapEffectStyles(node, nodeId, ctx) {
  const styles = {};
  const effects = node.effects;
  if (effects && effects.length > 0) {
    const shadows = [];
    const filters = [];
    const backdropFilters = [];
    let hasElevatedDropShadow = false;
    for (const effect of effects) {
      if (effect.visible === false) continue;
      if (effect.type === "DROP_SHADOW") {
        const x = effect.offset?.x ?? 0;
        const y = effect.offset?.y ?? 0;
        const r = effect.radius ?? 0;
        const spread = effect.spread ?? 0;
        const color = rgbaToCss(effect.color) ?? "rgba(0,0,0,0.25)";
        shadows.push(`${x}px ${y}px ${r}px ${spread}px ${color}`);
        if (r > 1 || Math.abs(x) > 1 || Math.abs(y) > 1) hasElevatedDropShadow = true;
      } else if (effect.type === "INNER_SHADOW") {
        const x = effect.offset?.x ?? 0;
        const y = effect.offset?.y ?? 0;
        const r = effect.radius ?? 0;
        const spread = effect.spread ?? 0;
        const color = rgbaToCss(effect.color) ?? "rgba(0,0,0,0.25)";
        shadows.push(`inset ${x}px ${y}px ${r}px ${spread}px ${color}`);
      } else if (effect.type === "BACKGROUND_BLUR") backdropFilters.push(`blur(${effect.radius ?? 0}px)`);else if (effect.type === "FOREGROUND_BLUR" || effect.type === "LAYER_BLUR") filters.push(`blur(${effect.radius ?? 0}px)`);
    }
    if (shadows.length > 0) styles.boxShadow = shadows.join(", ");
    if (filters.length > 0) styles.filter = filters.join(" ");
    if (backdropFilters.length > 0) {
      const backdrop = backdropFilters.join(" ");
      styles.backdropFilter = backdrop;
      styles.WebkitBackdropFilter = backdrop;
    }
    if (hasElevatedDropShadow) styles.zIndex = 1;
  }
  const styleIdForEffect = node.styleIdForEffect;
  if (styleIdForEffect?.assetRef?.key && (!effects || effects.length === 0)) ctx.warnings.push({
    code: "EFFECT_STYLE_REF",
    nodeId,
    styleId: styleIdForEffect.assetRef.key
  });
  return styles;
}

export { mapEffectStyles };
