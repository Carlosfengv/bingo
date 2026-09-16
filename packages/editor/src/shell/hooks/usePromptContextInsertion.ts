/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/usePromptContextInsertion.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Wait for the last chat to load and become visible before inserting canvas context. */
function usePromptContextInsertion(t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const {
    loading,
    visible,
    chatCount,
    activeChatId,
    panelRef,
    reveal,
    createChat
  } = t0;
  const pending = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== chatCount || $[1] !== createChat || $[2] !== loading || $[3] !== panelRef || $[4] !== visible) {
    t1 = () => {
      if (pending.current === null || loading || !visible) return;
      if (chatCount === 0) {
        createChat();
        return;
      }
      if (!panelRef.current) return;
      const elementIds = pending.current;
      pending.current = null;
      panelRef.current.addSelectedElements(elementIds);
    };
    $[0] = chatCount;
    $[1] = createChat;
    $[2] = loading;
    $[3] = panelRef;
    $[4] = visible;
    $[5] = t1;
  } else t1 = $[5];
  let t2;
  if ($[6] !== activeChatId || $[7] !== chatCount || $[8] !== createChat || $[9] !== loading || $[10] !== panelRef || $[11] !== visible) {
    t2 = [loading, visible, chatCount, activeChatId, panelRef, createChat];
    $[6] = activeChatId;
    $[7] = chatCount;
    $[8] = createChat;
    $[9] = loading;
    $[10] = panelRef;
    $[11] = visible;
    $[12] = t2;
  } else t2 = $[12];
  (0, import_react.useLayoutEffect)(t1, t2);
  let t3;
  if ($[13] !== chatCount || $[14] !== createChat || $[15] !== loading || $[16] !== panelRef || $[17] !== reveal || $[18] !== visible) {
    t3 = elementIds_0 => {
      if (!loading && visible && chatCount > 0 && panelRef.current) {
        panelRef.current.addSelectedElements([...(pending.current ?? []), ...elementIds_0]);
        pending.current = null;
        return;
      }
      pending.current = [...(pending.current ?? []), ...elementIds_0];
      reveal();
      if (!loading && chatCount === 0) createChat();
    };
    $[13] = chatCount;
    $[14] = createChat;
    $[15] = loading;
    $[16] = panelRef;
    $[17] = reveal;
    $[18] = visible;
    $[19] = t3;
  } else t3 = $[19];
  return t3;
}

export { usePromptContextInsertion };
