/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useChatScroll.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var BOTTOM_THRESHOLD = 12;
/** Follow rendered content growth, while letting the reader scroll back freely. */
function useChatScroll() {
  const $ = (0, import_compiler_runtime.c)(6);
  const viewportRef = (0, import_react.useRef)(null);
  const contentRef = (0, import_react.useRef)(null);
  const following = (0, import_react.useRef)(true);
  const lastScrollTop = (0, import_react.useRef)(0);
  const animationFrame = (0, import_react.useRef)(null);
  const [atBottom, setAtBottom] = (0, import_react.useState)(true);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
    $[0] = t0;
  } else t0 = $[0];
  const cancelAnimation = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = t2 => {
      const behavior = t2 === void 0 ? "instant" : t2;
      cancelAnimation();
      following.current = true;
      const viewport = viewportRef.current;
      if (viewport?.clientHeight) {
        if (behavior === "smooth" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const startTop = viewport.scrollTop;
          const started = performance.now();
          const tick = now => {
            const progress = Math.min(1, (now - started) / 280);
            const bottom = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            viewport.scrollTop = startTop + (bottom - startTop) * (1 - (1 - progress) ** 3);
            lastScrollTop.current = viewport.scrollTop;
            animationFrame.current = progress < 1 ? requestAnimationFrame(tick) : null;
          };
          animationFrame.current = requestAnimationFrame(tick);
        } else {
          viewport.scrollTop = viewport.scrollHeight;
          lastScrollTop.current = viewport.scrollTop;
        }
      }
      setAtBottom(true);
    };
    $[1] = t1;
  } else t1 = $[1];
  const scrollToBottom = t1;
  let t2;
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      const viewport_0 = viewportRef.current;
      const content = contentRef.current;
      if (!viewport_0 || !content) return;
      let frame = 0;
      let hidden = !viewport_0.clientHeight;
      const isAtBottom = () => viewport_0.scrollHeight - viewport_0.scrollTop - viewport_0.clientHeight <= BOTTOM_THRESHOLD;
      const followContent = () => {
        frame = 0;
        if (!viewport_0.clientHeight) {
          hidden = true;
          return;
        }
        if (animationFrame.current !== null) return;
        if (following.current) scrollToBottom();else {
          if (hidden) viewport_0.scrollTop = lastScrollTop.current;
          const bottom_0 = isAtBottom();
          following.current = bottom_0;
          setAtBottom(bottom_0);
        }
        hidden = false;
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(followContent);
      };
      const onScroll = () => {
        if (!viewport_0.clientHeight) return;
        if (animationFrame.current !== null) return;
        const bottom_1 = isAtBottom();
        if (bottom_1) following.current = true;else if (viewport_0.scrollTop < lastScrollTop.current - 1) following.current = false;
        lastScrollTop.current = viewport_0.scrollTop;
        setAtBottom(bottom_1);
        if (following.current && !bottom_1) schedule();
      };
      const onWheel = event => {
        if (event.deltaY >= 0 || event.shiftKey || event.ctrlKey) return;
        const nested = event.target instanceof Element ? event.target.closest("[data-slot=\"scroll-area-viewport\"]") : null;
        if (nested && nested !== viewport_0 && nested.scrollTop > 0) return;
        interruptAnimation();
        following.current = false;
      };
      const interruptAnimation = () => {
        if (animationFrame.current === null) return;
        cancelAnimation();
        following.current = isAtBottom();
        setAtBottom(following.current);
      };
      followContent();
      const observer = new ResizeObserver(schedule);
      observer.observe(content);
      observer.observe(viewport_0);
      viewport_0.addEventListener("scroll", onScroll, {
        passive: true
      });
      viewport_0.addEventListener("wheel", onWheel, {
        passive: true
      });
      viewport_0.addEventListener("pointerdown", interruptAnimation, {
        passive: true
      });
      viewport_0.addEventListener("keydown", interruptAnimation);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        cancelAnimation();
        viewport_0.removeEventListener("scroll", onScroll);
        viewport_0.removeEventListener("wheel", onWheel);
        viewport_0.removeEventListener("pointerdown", interruptAnimation);
        viewport_0.removeEventListener("keydown", interruptAnimation);
      };
    };
    t3 = [scrollToBottom, cancelAnimation];
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  (0, import_react.useLayoutEffect)(t2, t3);
  let t4;
  if ($[4] !== atBottom) {
    t4 = {
      viewportRef,
      contentRef,
      atBottom,
      scrollToBottom
    };
    $[4] = atBottom;
    $[5] = t4;
  } else t4 = $[5];
  return t4;
}

export { useChatScroll };
