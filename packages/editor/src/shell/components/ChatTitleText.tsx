/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatTitleText.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { CHAT_TITLE_ANIMATION, getTitleAnimationFrame } from "../utils/chatTitleAnimation";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Shuffle only incoming AI titles; opening a chat or editing its name stays instant. */
function ChatTitleText(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const {
    title,
    animate: t1
  } = t0;
  const animate = t1 === void 0 ? false : t1;
  const containerRef = (0, import_react.useRef)(null);
  const textRef = (0, import_react.useRef)(null);
  const previousTitle = (0, import_react.useRef)(title);
  const seed = (0, import_react.useRef)(937);
  let t2;
  let t3;
  if ($[0] !== animate || $[1] !== title) {
    t2 = () => {
      const fromTitle = previousTitle.current;
      const changed = fromTitle !== title;
      previousTitle.current = title;
      const node = textRef.current;
      const container = containerRef.current;
      if (!node || !container) return;
      node.textContent = title;
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (!changed || !animate || motion.matches) return;
      const settings = {
        ...CHAT_TITLE_ANIMATION,
        from: fromTitle,
        to: title
      };
      const runSeed = seed.current = seed.current + 1;
      const toWidth = container.getBoundingClientRect().width;
      node.textContent = fromTitle;
      const fromWidth = container.getBoundingClientRect().width;
      const started = performance.now();
      let frame = 0;
      const finish = () => {
        cancelAnimationFrame(frame);
        node.textContent = title;
        container.style.removeProperty("width");
        delete node.dataset.shuffling;
      };
      const tick = now => {
        const progress = Math.min(1, (now - started) / settings.duration);
        const growth = Math.min(1, progress / (1 - settings.settle / 100));
        container.style.width = `${fromWidth + (toWidth - fromWidth) * growth}px`;
        node.textContent = getTitleAnimationFrame(settings, progress, runSeed);
        if (progress >= 1) {
          finish();
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      node.dataset.shuffling = "true";
      tick(started);
      motion.addEventListener("change", finish);
      return () => {
        cancelAnimationFrame(frame);
        node.textContent = title;
        container.style.removeProperty("width");
        delete node.dataset.shuffling;
        motion.removeEventListener("change", finish);
      };
    };
    t3 = [title, animate];
    $[0] = animate;
    $[1] = title;
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  (0, import_react.useLayoutEffect)(t2, t3);
  let t4;
  if ($[4] !== title) {
    t4 = <span aria-hidden={true} ref={textRef}>{title}</span>;
    $[4] = title;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== t4 || $[7] !== title) {
    t5 = <span ref={containerRef} className="inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom" aria-label={title}>{t4}</span>;
    $[6] = t4;
    $[7] = title;
    $[8] = t5;
  } else t5 = $[8];
  return t5;
}

export { ChatTitleText };
