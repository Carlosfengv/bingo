/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useContextMentions.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getContextOptions, readContextToken } from "../utils/chatContextReferences";
import { fetchClaudeConnections } from "./useClaudeContext";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function useContextMentions(inputRef, components, pages, onSelect, onInput, cwd) {
  const $ = (0, import_compiler_runtime.c)(33);
  const id = (0, import_react.useId)();
  const [query, setQuery] = (0, import_react.useState)(null);
  const [index, setIndex] = (0, import_react.useState)(0);
  const [connections, setConnections] = (0, import_react.useState)(null);
  const dismissed = (0, import_react.useRef)(null);
  const open = query !== null;
  let t0;
  let t1;
  if ($[0] !== cwd || $[1] !== open) {
    t0 = () => {
      if (!open) return;
      let cancelled = false;
      fetchClaudeConnections(cwd).then(items => {
        if (!cancelled) setConnections(items);
      });
      return () => {
        cancelled = true;
      };
    };
    t1 = [open, cwd];
    $[0] = cwd;
    $[1] = open;
    $[2] = t0;
    $[3] = t1;
  } else {
    t0 = $[2];
    t1 = $[3];
  }
  (0, import_react.useEffect)(t0, t1);
  let t2;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => setQuery(null);
    $[4] = t2;
  } else t2 = $[4];
  const close = t2;
  let t3;
  if ($[5] !== inputRef || $[6] !== query) {
    t3 = () => {
      const token = readContextToken(inputRef.current);
      if (!token) {
        dismissed.current = null;
        setQuery(null);
        return;
      }
      const next = token.toString().slice(1);
      if (dismissed.current !== null && next.startsWith(dismissed.current)) return;
      dismissed.current = null;
      if (query !== next) setIndex(0);
      setQuery(next);
    };
    $[5] = inputRef;
    $[6] = query;
    $[7] = t3;
  } else t3 = $[7];
  const sync = t3;
  let t4;
  if ($[8] !== components || $[9] !== connections || $[10] !== open || $[11] !== pages || $[12] !== query) {
    t4 = open ? getContextOptions(components, pages, connections ?? [], new Set(), query) : [];
    $[8] = components;
    $[9] = connections;
    $[10] = open;
    $[11] = pages;
    $[12] = query;
    $[13] = t4;
  } else t4 = $[13];
  const options = t4;
  const selectedIndex = Math.min(index, Math.max(0, options.length - 1));
  let t5;
  if ($[14] !== inputRef || $[15] !== onInput || $[16] !== onSelect) {
    t5 = option => {
      const token_0 = readContextToken(inputRef.current);
      if (!token_0) return;
      token_0.deleteContents();
      token_0.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(token_0);
      close();
      onSelect(option);
      onInput();
    };
    $[14] = inputRef;
    $[15] = onInput;
    $[16] = onSelect;
    $[17] = t5;
  } else t5 = $[17];
  const select = t5;
  let t6;
  if ($[18] !== open || $[19] !== options || $[20] !== query || $[21] !== select || $[22] !== selectedIndex) {
    t6 = event => {
      if (!open || event.nativeEvent.isComposing) return false;
      if (event.key === "Escape") {
        event.preventDefault();
        dismissed.current = query;
        close();
        return true;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (options.length) setIndex((selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        return true;
      }
      if (event.key === "Tab" || event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (options[selectedIndex]) select(options[selectedIndex]);
        return true;
      }
      return false;
    };
    $[18] = open;
    $[19] = options;
    $[20] = query;
    $[21] = select;
    $[22] = selectedIndex;
    $[23] = t6;
  } else t6 = $[23];
  const onKeyDown = t6;
  const t7 = connections === null;
  let t8;
  if ($[24] !== id || $[25] !== onKeyDown || $[26] !== open || $[27] !== options || $[28] !== select || $[29] !== selectedIndex || $[30] !== sync || $[31] !== t7) {
    t8 = {
      id,
      open,
      options,
      selectedIndex,
      setIndex,
      select,
      onKeyDown,
      sync,
      close,
      loading: t7
    };
    $[24] = id;
    $[25] = onKeyDown;
    $[26] = open;
    $[27] = options;
    $[28] = select;
    $[29] = selectedIndex;
    $[30] = sync;
    $[31] = t7;
    $[32] = t8;
  } else t8 = $[32];
  return t8;
}

export { useContextMentions };
