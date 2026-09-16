/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/RippleLoader.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** The Bingo mark rendered as a halftone ripple-interference loader. */
function RippleLoader(t0) {
  const $ = (0, import_compiler_runtime.c)(27);
  const {
    size: t1,
    duration: t2,
    grid: t3,
    variant: t4,
    className
  } = t0;
  const size = t1 === void 0 ? 40 : t1;
  const duration = t2 === void 0 ? 2 : t2;
  const grid = t3 === void 0 ? 15 : t3;
  const simple = (t4 === void 0 ? "default" : t4) === "simple";
  const [time, setTime] = import_react.useState(0);
  let t5;
  let t6;
  if ($[0] !== duration) {
    t5 = () => {
      let frame = 0;
      const start = performance.now();
      const tick = now => {
        setTime((now - start) / 1e3 / duration % 1);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    };
    t6 = [duration];
    $[0] = duration;
    $[1] = t5;
    $[2] = t6;
  } else {
    t5 = $[1];
    t6 = $[2];
  }
  import_react.useEffect(t5, t6);
  const cell = 100 / grid;
  const maxRadius = cell * .46;
  const minRadius = cell * .08;
  let t7;
  if ($[3] !== simple || $[4] !== time) {
    t7 = (dx, dy) => {
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wave = .5 + .5 * Math.cos((distance / .42 - time) * Math.PI * 2);
      return Math.pow(wave, simple ? 5 : 3) * Math.max(0, 1 - distance * .45);
    };
    $[3] = simple;
    $[4] = time;
    $[5] = t7;
  } else t7 = $[5];
  const ringsAt = t7;
  let dots;
  if ($[6] !== cell || $[7] !== grid || $[8] !== maxRadius || $[9] !== minRadius || $[10] !== ringsAt || $[11] !== simple) {
    dots = [];
    for (let row = 0; row < grid; row++) for (let column = 0; column < grid; column++) {
      const centerX = cell * (column + .5);
      const centerY = cell * (row + .5);
      const x = (centerX - 50) / 50;
      const y = (centerY - 50) / 50;
      if (x * x + y * y > .9) continue;
      const top = ringsAt(x, y + .62);
      const bottom = ringsAt(x, y - .62);
      let value = simple ? Math.max(top, bottom) : top + bottom + top * bottom * 1.5;
      value = Math.min(1, value);
      if (simple && value < .2) continue;
      const radius = minRadius + (maxRadius - minRadius) * value;
      const opacity = simple ? .3 + .7 * value : .14 + .86 * value;
      dots.push(<circle key={`${row}-${column}`} cx={centerX} cy={centerY} r={radius} opacity={opacity} />);
    }
    $[6] = cell;
    $[7] = grid;
    $[8] = maxRadius;
    $[9] = minRadius;
    $[10] = ringsAt;
    $[11] = simple;
    $[12] = dots;
  } else dots = $[12];
  const rimCount = Math.round(grid * 2.2);
  let rim;
  if ($[13] !== maxRadius || $[14] !== rimCount || $[15] !== time) {
    rim = [];
    for (let index = 0; index < rimCount; index++) {
      const angle = index / rimCount * Math.PI * 2;
      const x_0 = 50 + Math.cos(angle) * (50 - maxRadius);
      const y_0 = 50 + Math.sin(angle) * (50 - maxRadius);
      const shimmer = .5 + .5 * Math.sin((index / rimCount - time) * Math.PI * 4);
      rim.push(<circle key={`rim-${index}`} cx={x_0} cy={y_0} r={maxRadius * (.88 + .12 * shimmer)} opacity={.85 + .15 * shimmer} />);
    }
    $[13] = maxRadius;
    $[14] = rimCount;
    $[15] = time;
    $[16] = rim;
  } else rim = $[16];
  let t8;
  if ($[17] !== size) {
    t8 = {
      width: size,
      height: size,
      display: "inline-block",
      lineHeight: 0
    };
    $[17] = size;
    $[18] = t8;
  } else t8 = $[18];
  let t9;
  if ($[19] !== dots || $[20] !== rim || $[21] !== size) {
    t9 = <svg viewBox="0 0 100 100" width={size} height={size} fill="currentColor" aria-hidden="true">{rim}{dots}</svg>;
    $[19] = dots;
    $[20] = rim;
    $[21] = size;
    $[22] = t9;
  } else t9 = $[22];
  let t10;
  if ($[23] !== className || $[24] !== t8 || $[25] !== t9) {
    t10 = <span className={className} style={t8}>{t9}</span>;
    $[23] = className;
    $[24] = t8;
    $[25] = t9;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}

export { RippleLoader };
