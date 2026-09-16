/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatConversations.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Mount chats on first open, then retain their drafts and active responses. */
function ChatConversations(t0) {
  const $ = (0, import_compiler_runtime.c)(13);
  const {
    chats,
    activeChatId,
    renderChat
  } = t0;
  let t1;
  if ($[0] !== activeChatId) {
    t1 = () => new Set(activeChatId ? [activeChatId] : []);
    $[0] = activeChatId;
    $[1] = t1;
  } else t1 = $[1];
  const [openedIds, setOpenedIds] = (0, import_react.useState)(t1);
  if (activeChatId && !openedIds.has(activeChatId)) setOpenedIds(new Set(openedIds).add(activeChatId));
  let t2;
  if ($[2] !== activeChatId || $[3] !== chats || $[4] !== openedIds || $[5] !== renderChat) {
    let t3;
    if ($[7] !== activeChatId || $[8] !== openedIds) {
      t3 = chat => chat.id === activeChatId || openedIds.has(chat.id);
      $[7] = activeChatId;
      $[8] = openedIds;
      $[9] = t3;
    } else t3 = $[9];
    let t4;
    if ($[10] !== activeChatId || $[11] !== renderChat) {
      t4 = chat_0 => <div key={chat_0.id} data-chat-id={chat_0.id} hidden={chat_0.id !== activeChatId} className={chat_0.id === activeChatId ? "h-full min-h-0" : "hidden h-full min-h-0"}>{renderChat(chat_0, chat_0.id === activeChatId)}</div>;
      $[10] = activeChatId;
      $[11] = renderChat;
      $[12] = t4;
    } else t4 = $[12];
    t2 = chats.filter(t3).map(t4);
    $[2] = activeChatId;
    $[3] = chats;
    $[4] = openedIds;
    $[5] = renderChat;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}

export { ChatConversations };
