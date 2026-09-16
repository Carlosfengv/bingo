/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/EditableChatTitle.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ChatTitleText } from "./ChatTitleText";
import { Button, Input, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Scrolls a long title into view while its title or row is hovered; fades the clipped edge otherwise. */
function HoverMarquee(t0) {
  const $ = (0, import_compiler_runtime.c)(11);
  const {
    title,
    animateTitle,
    active
  } = t0;
  const viewportRef = (0, import_react.useRef)(null);
  const contentRef = (0, import_react.useRef)(null);
  const animationRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== active) {
    t1 = () => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (!active || !viewport || !content) {
        animationRef.current?.cancel();
        animationRef.current = null;
        return;
      }
      const update = () => {
        animationRef.current?.cancel();
        animationRef.current = null;
        const distance = content.scrollWidth - viewport.clientWidth;
        if (distance <= 0) return;
        animationRef.current = content.animate([{
          transform: "translateX(0)"
        }, {
          transform: `translateX(-${distance}px)`
        }], {
          duration: Math.max(1200, distance * 28),
          delay: 250,
          easing: "linear",
          fill: "forwards"
        });
      };
      const observer = new ResizeObserver(update);
      observer.observe(content);
      observer.observe(viewport);
      return () => {
        observer.disconnect();
        animationRef.current?.cancel();
      };
    };
    $[0] = active;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== active || $[3] !== title) {
    t2 = [active, title];
    $[2] = active;
    $[3] = title;
    $[4] = t2;
  } else t2 = $[4];
  (0, import_react.useEffect)(t1, t2);
  let t3;
  if ($[5] !== animateTitle || $[6] !== title) {
    t3 = <span ref={contentRef} className="inline-block min-w-max">{<ChatTitleText title={title} animate={animateTitle} />}</span>;
    $[5] = animateTitle;
    $[6] = title;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== t3 || $[9] !== title) {
    t4 = <span ref={viewportRef} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)]" title={title}>{t3}</span>;
    $[8] = t3;
    $[9] = title;
    $[10] = t4;
  } else t4 = $[10];
  return t4;
}
/** Shared title editing for the chat header and history rows. */
function EditableChatTitle(t0) {
  const $ = (0, import_compiler_runtime.c)(43);
  const { t } = useTranslation("editor");
  const {
    title,
    animate,
    onRename,
    onSelect,
    disabled,
    className,
    marqueeActive
  } = t0;
  const [hovered, setHovered] = (0, import_react.useState)(false);
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)(title);
  const clickTimer = (0, import_react.useRef)(null);
  const finished = (0, import_react.useRef)(false);
  const focusInput = _temp$26;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = null;
    };
    $[0] = t1;
  } else t1 = $[0];
  const cancelClick = t1;
  let t2;
  let t3;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
    t3 = [];
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[3] !== disabled || $[4] !== onRename || $[5] !== title) {
    t4 = () => {
      if (!onRename || disabled) return;
      cancelClick();
      finished.current = false;
      setDraft(title);
      setEditing(true);
    };
    $[3] = disabled;
    $[4] = onRename;
    $[5] = title;
    $[6] = t4;
  } else t4 = $[6];
  const begin = t4;
  let t5;
  if ($[7] !== draft || $[8] !== onRename) {
    t5 = save => {
      if (finished.current) return;
      finished.current = true;
      setEditing(false);
      const value = draft.trim();
      if (save && value) onRename?.(value);
    };
    $[7] = draft;
    $[8] = onRename;
    $[9] = t5;
  } else t5 = $[9];
  const finish = t5;
  if (editing) {
    let t6;
    if ($[10] !== className) {
      t6 = cn$2("min-w-0 flex-1", className);
      $[10] = className;
      $[11] = t6;
    } else t6 = $[11];
    let t7;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
      t7 = event => setDraft(event.target.value);
      $[12] = t7;
    } else t7 = $[12];
    let t8;
    let t9;
    if ($[13] !== finish) {
      t8 = () => finish(true);
      t9 = event_2 => {
        event_2.stopPropagation();
        if (event_2.key === "Enter" && !event_2.nativeEvent.isComposing) {
          event_2.preventDefault();
          finish(true);
        }
        if (event_2.key === "Escape") {
          event_2.preventDefault();
          finish(false);
        }
      };
      $[13] = finish;
      $[14] = t8;
      $[15] = t9;
    } else {
      t8 = $[14];
      t9 = $[15];
    }
    let t10;
    if (true) {
      t10 = <Input size="xs" className={t6} aria-label={t("shell.chatName")} value={draft} maxLength={500} ref={focusInput} onChange={t7} onClick={_temp2$18} onDoubleClick={_temp3$11} onBlur={t8} onKeyDown={t9} />;
      $[16] = draft;
      $[17] = t6;
      $[18] = t8;
      $[19] = t9;
      $[20] = t10;
    } else t10 = $[20];
    return t10;
  }
  let t6;
  let t7;
  if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = () => setHovered(true);
    t7 = () => setHovered(false);
    $[21] = t6;
    $[22] = t7;
  } else {
    t6 = $[21];
    t7 = $[22];
  }
  let t8;
  if ($[23] !== className) {
    t8 = cn$2("h-full min-w-0 flex-1 justify-start overflow-hidden rounded-none p-0 text-left text-ed-chat font-normal text-inherit hover:bg-transparent", className);
    $[23] = className;
    $[24] = t8;
  } else t8 = $[24];
  let t10;
  let t9;
  if ($[25] !== begin) {
    t9 = event_3 => {
      event_3.stopPropagation();
      begin();
    };
    t10 = event_4 => {
      if (event_4.key === "F2") {
        event_4.preventDefault();
        begin();
      }
    };
    $[25] = begin;
    $[26] = t10;
    $[27] = t9;
  } else {
    t10 = $[26];
    t9 = $[27];
  }
  let t11;
  if ($[28] !== onRename || $[29] !== onSelect) {
    t11 = event_5 => {
      if (!onSelect) return;
      cancelClick();
      if (onRename && event_5.detail > 0) clickTimer.current = setTimeout(onSelect, 300);else onSelect();
    };
    $[28] = onRename;
    $[29] = onSelect;
    $[30] = t11;
  } else t11 = $[30];
  const t12 = marqueeActive ?? hovered;
  let t13;
  if ($[31] !== animate || $[32] !== t12 || $[33] !== title) {
    t13 = <HoverMarquee active={t12} title={title} animateTitle={animate} />;
    $[31] = animate;
    $[32] = t12;
    $[33] = title;
    $[34] = t13;
  } else t13 = $[34];
  let t14;
  if ($[35] !== disabled || $[36] !== t10 || $[37] !== t11 || $[38] !== t13 || $[39] !== t8 || $[40] !== t9 || $[41] !== title) {
    t14 = <Button type="button" variant="ghost" size="text" isChildText={false} disabled={disabled} aria-label={title} onMouseEnter={t6} onMouseLeave={t7} className={t8} onDoubleClick={t9} onKeyDown={t10} onClick={t11}>{t13}</Button>;
    $[35] = disabled;
    $[36] = t10;
    $[37] = t11;
    $[38] = t13;
    $[39] = t8;
    $[40] = t9;
    $[41] = title;
    $[42] = t14;
  } else t14 = $[42];
  return t14;
}
function _temp3$11(event_1) {
  return event_1.stopPropagation();
}
function _temp2$18(event_0) {
  return event_0.stopPropagation();
}
function _temp$26(node) {
  node?.focus();
  node?.select();
}

export { EditableChatTitle };
