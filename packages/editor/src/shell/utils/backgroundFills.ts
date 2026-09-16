/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/backgroundFills.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { parseFill, splitTopLevel$1 } from "./fillValue";

/**
* Background fill model — a Figma-style ordered list of fills serialized to CSS
* background layers. The list is top-most-first: fill[0] paints on top.
*
* CSS mapping:
*  - Every fill becomes a `background-image` layer (a solid is faked as
*    `linear-gradient(c, c)` so it can stack), EXCEPT a bottom-most solid, which
*    is emitted as `background-color` (the base that sits behind everything).
*  - `background-size` / `-position` / `-repeat` are parallel comma-lists, one
*    entry per layer, so each layer (image or tiled gradient) keeps its own
*    sizing. They're only emitted when a layer needs them (keeps simple output
*    clean).
*
* A linked Tailwind `bg-*` token is classified by its *resolved* CSS (see
* {@link classifyBgClass}) so custom/arbitrary tokens route to the right kind.
*/
var EMPTY_URL = /^url\((['"]?)\1\)$/;
/** A pending image row with no address yet — never written to CSS. */
var isEmptyImage = f => f.kind === "image" && (!f.value.trim() || EMPTY_URL.test(f.value.trim()));
var fakeSolidLayer = c => `linear-gradient(${c}, ${c})`;
/** A `linear-gradient(c, c)` (all stops one color) is really a solid → its color. */
function unfakeSolid(raw) {
  const f = parseFill(raw);
  if (f.kind === "gradient" && f.stops.length >= 2) {
    const first = f.stops[0].color;
    if (f.stops.every(s => s.color === first)) return first;
  }
  return null;
}
function layerToFill(raw) {
  const solid = unfakeSolid(raw);
  if (solid) return {
    kind: "solid",
    value: solid
  };
  const f = parseFill(raw);
  if (f.kind === "image") return {
    kind: "image",
    value: raw
  };
  if (f.kind === "gradient") return {
    kind: "gradient",
    value: raw
  };
  return {
    kind: "solid",
    value: raw
  };
}
function parseFills(css) {
  const rawLayers = [css.backgroundImage, css.background].filter(Boolean).flatMap(s => splitTopLevel$1(s)).map(s => s.trim()).filter(s => s && s !== "none");
  const sizes = css.backgroundSize ? splitTopLevel$1(css.backgroundSize) : [];
  const positions = css.backgroundPosition ? splitTopLevel$1(css.backgroundPosition) : [];
  const repeats = css.backgroundRepeat ? splitTopLevel$1(css.backgroundRepeat) : [];
  const blends = css.backgroundBlendMode ? splitTopLevel$1(css.backgroundBlendMode) : [];
  const at = (arr, i) => arr.length ? arr[i % arr.length].trim() : void 0;
  const fills = rawLayers.map((raw, i) => {
    const fill = layerToFill(raw);
    fill.size = at(sizes, i);
    fill.position = at(positions, i);
    fill.repeat = at(repeats, i);
    const blend = at(blends, i);
    fill.blend = blend && blend !== "normal" ? blend : void 0;
    return fill;
  });
  if (css.backgroundColor) fills.push({
    kind: "solid",
    value: css.backgroundColor
  });
  return fills;
}
function serializeFills(fills) {
  const cleared = {
    backgroundColor: void 0,
    backgroundImage: void 0,
    backgroundSize: void 0,
    backgroundPosition: void 0,
    backgroundRepeat: void 0,
    backgroundBlendMode: void 0,
    background: void 0
  };
  const real = fills.filter(f => !isEmptyImage(f));
  if (real.length === 0) return cleared;
  const bottom = real[real.length - 1];
  const baseIsSolid = bottom.kind === "solid";
  const layers = baseIsSolid ? real.slice(0, -1) : real;
  const hasImage = layers.some(f => f.kind === "image");
  const anyExplicit = layers.some(f => f.size || f.position || f.repeat);
  const anyBlend = layers.some(f => f.blend && f.blend !== "normal");
  const emitConfig = hasImage || anyExplicit;
  const isImg = f => f.kind === "image";
  const layerCss = f => f.kind === "solid" ? fakeSolidLayer(f.value) : f.value;
  return {
    ...cleared,
    backgroundColor: baseIsSolid && !bottom.token ? bottom.value : void 0,
    backgroundImage: layers.length ? layers.map(layerCss).join(", ") : void 0,
    backgroundSize: emitConfig ? layers.map(f => f.size ?? (isImg(f) ? "cover" : "auto")).join(", ") : void 0,
    backgroundPosition: emitConfig ? layers.map(f => f.position ?? (isImg(f) ? "center" : "0% 0%")).join(", ") : void 0,
    backgroundRepeat: emitConfig ? layers.map(f => f.repeat ?? (isImg(f) ? "no-repeat" : "repeat")).join(", ") : void 0,
    backgroundBlendMode: anyBlend ? layers.map(f => f.blend ?? "normal").join(", ") : void 0
  };
}

export { isEmptyImage, parseFills, serializeFills };
