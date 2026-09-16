/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ArchivedChatsPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getChatDeletionQueue } from "../utils/chatDeletion";
import { useTranslation } from "@bingo/i18n";
import { ChatListRow } from "./ChatListRow";
import { IconBtn } from "./panels/styles/primitives";
import { ArrowCounterClockwiseIcon, Button, CaretLeftIcon, ScrollArea, TrashIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

function ArchivedChatsPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(38);
  const { t } = useTranslation("editor");
  const {
    backend,
    onRestore,
    onBack
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      status: "loading"
    };
    $[0] = t1;
  } else t1 = $[0];
  const [state, setState] = (0, import_react.useState)(t1);
  const [reload, setReload] = (0, import_react.useState)(0);
  const [viewing, setViewing] = (0, import_react.useState)(null);
  const [pending, setPending] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const deletions = getChatDeletionQueue(backend);
  const hiddenIds = (0, import_react.useSyncExternalStore)(deletions.subscribe, deletions.getSnapshot, deletions.getSnapshot);
  const visibleChats = state.status === "ready" ? state.chats.filter(chat => !hiddenIds.has(chat.id)) : [];
  let t2;
  if (true) {
    t2 = () => {
      let cancelled = false;
      (backend?.listChats?.({
        includeArchived: true
      }) ?? Promise.reject(new Error(t("archive.unavailable")))).then(chats => {
        if (!cancelled) setState({
          status: "ready",
          chats: chats.filter(_temp$24).sort(_temp2$16)
        });
      }).catch(reason => {
        if (!cancelled) setState({
          status: "error",
          message: reason instanceof Error ? reason.message : t("archive.loadError")
        });
      });
      return () => {
        cancelled = true;
      };
    };
    $[1] = backend;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if (true) {
    t3 = [backend, reload, t];
    $[3] = backend;
    $[4] = reload;
    $[5] = t3;
  } else t3 = $[5];
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = id => {
      setState(previous => previous.status === "ready" ? {
        ...previous,
        chats: previous.chats.filter(chat_1 => chat_1.id !== id)
      } : previous);
      setViewing(previous_0 => previous_0?.id === id ? null : previous_0);
    };
    $[6] = t4;
  } else t4 = $[6];
  const removeFromList = t4;
  let t5;
  if (true) {
    t5 = async chat_2 => {
      setPending(chat_2.id);
      setError(null);
      try {
        await onRestore(chat_2.id);
        removeFromList(chat_2.id);
        toast.success(t("archive.restored"));
      } catch (t6) {
        const reason_0 = t6;
        setError(reason_0 instanceof Error ? reason_0.message : t("archive.restoreError"));
      }
      setPending(null);
    };
    $[7] = onRestore;
    $[8] = t5;
  } else t5 = $[8];
  const restore = t5;
  let t6;
  if (true) {
    t6 = async chat_3 => {
      if (chat_3.messages) {
        setViewing(chat_3);
        return;
      }
      if (!backend?.getChat) {
        setError(t("archive.chatLoadError"));
        return;
      }
      setPending(chat_3.id);
      setError(null);
      try {
        const detail = await backend.getChat(chat_3.id, {
          includeArchived: true
        });
        if (detail) setViewing({
          ...chat_3,
          ...detail
        });else setError(t("archive.chatLoadError"));
      } catch (t7) {
        const reason_1 = t7;
        setError(reason_1 instanceof Error ? reason_1.message : t("archive.chatLoadError"));
      }
      setPending(null);
    };
    $[9] = backend;
    $[10] = t6;
  } else t6 = $[10];
  const view = t6;
  const permanentlyDelete = chat_4 => {
    const deletion = deletions.begin(chat_4.id);
    if (!deletion) return;
    setError(null);
    const commit = () => {
      deletion.commit().catch(() => toast.error(t("archive.deleteError")));
    };
    toast.success(t("archive.deleted"), {
      description: chat_4.title || t("archive.untitled"),
      duration: 5e3,
      action: {
        label: t("archive.undo"),
        onClick: deletion.undo
      },
      onAutoClose: commit,
      onDismiss: commit
    });
  };
  const t7 = t("archive.title");
  const t8 = "flex h-full min-h-0 flex-col text-ed-chat";
  const t9 = viewing ? t("archive.backToArchive") : t("archive.backToChats");
  const t10 = t9;
  let t11;
  if ($[11] !== onBack || $[12] !== viewing) {
    t11 = () => viewing ? setViewing(null) : onBack();
    $[11] = onBack;
    $[12] = viewing;
    $[13] = t11;
  } else t11 = $[13];
  let t12;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <CaretLeftIcon />;
    $[14] = t12;
  } else t12 = $[14];
  let t13;
  if ($[15] !== t10 || $[16] !== t11 || $[17] !== t9) {
    t13 = <IconBtn label={t9} tooltip={t10} onClick={t11}>{t12}</IconBtn>;
    $[15] = t10;
    $[16] = t11;
    $[17] = t9;
    $[18] = t13;
  } else t13 = $[18];
  const t14 = viewing?.title || (viewing ? t("archive.untitled") : t("archive.title"));
  let t15;
  if ($[19] !== t14) {
    t15 = <span className="min-w-0 flex-1 truncate font-normal text-ed-foreground-secondary">{t14}</span>;
    $[19] = t14;
    $[20] = t15;
  } else t15 = $[20];
  let t16;
  if (true) {
    t16 = viewing && <IconBtn label={t("archive.restore")} disabled={pending !== null} onClick={() => void restore(viewing)}>{<ArrowCounterClockwiseIcon />}</IconBtn>;
    $[21] = pending;
    $[22] = restore;
    $[23] = viewing;
    $[24] = t16;
  } else t16 = $[24];
  let t17;
  if ($[25] !== t13 || $[26] !== t15 || $[27] !== t16) {
    t17 = <div className="flex h-10 shrink-0 items-center gap-1.5 px-3">{t13}{t15}{t16}</div>;
    $[25] = t13;
    $[26] = t15;
    $[27] = t16;
    $[28] = t17;
  } else t17 = $[28];
  let t18;
  if (true) {
    t18 = viewing && <p className="shrink-0 px-3 pb-3 text-ed-muted-foreground">{t("archive.restoreHint")}</p>;
    $[29] = viewing;
    $[30] = t18;
  } else t18 = $[30];
  let t19;
  if ($[31] !== error) {
    t19 = error && <p role="alert" className="px-3 pb-3 text-ed-chat text-ed-destructive">{error}</p>;
    $[31] = error;
    $[32] = t19;
  } else t19 = $[32];
  const renderMessage = (message, index) => <div key={message.id ?? index} className="space-y-1">{<div className="text-ed-muted-foreground">{message.role === "user" ? t("archive.you") : t("archive.agent")}</div>}{message.inlineRefs?.length > 0 && <div className="text-ed-muted-foreground">{message.inlineRefs.map(_temp4$10).join(", ")}</div>}{<div className="whitespace-pre-wrap break-words text-ed-foreground">{message.content || (message.role === "assistant" ? t("archive.completedActions") : "")}</div>}</div>;
  const t20 = viewing ? <>{<ScrollArea className="min-h-0 flex-1" viewportClassName="px-3 pb-3">{<div className="space-y-4 text-ed-chat">{viewing.messages?.length ? viewing.messages.map(renderMessage) : <p className="text-ed-muted-foreground">{t("archive.noMessages")}</p>}</div>}</ScrollArea>}</> : state.status === "loading" ? <p role="status" className="px-3 text-ed-chat text-ed-muted-foreground">{t("archive.loading")}</p> : state.status === "error" ? <div className="space-y-2 px-3">{<p role="alert" className="text-ed-chat">{state.message}</p>}{<Button size="xs" variant="secondary" onClick={() => {
      setState({
        status: "loading"
      });
      setReload(_temp6$5);
    }}>{t("common:actions.retry")}</Button>}</div> : visibleChats.length === 0 ? <p className="py-6 text-center text-ed-chat text-ed-muted-foreground">{t("archive.empty")}</p> : <ScrollArea className="min-h-0 flex-1" viewportClassName="pb-3">{<div className="flex w-full flex-col gap-1 py-2">{visibleChats.map(chat_5 => <ChatListRow key={chat_5.id} title={chat_5.title || t("archive.untitled")} disabled={pending !== null} onSelect={() => void view(chat_5)} actions={[{
        key: "restore",
        icon: <ArrowCounterClockwiseIcon />,
        label: t("archive.restoreNamed", { name: chat_5.title || t("archive.untitled") }),
        tooltip: t("archive.restore"),
        disabled: pending !== null,
        onClick: () => void restore(chat_5)
      }, {
        key: "delete",
        icon: <TrashIcon />,
        label: t("archive.deleteNamed", { name: chat_5.title || t("archive.untitled") }),
        tooltip: t("archive.deletePermanently"),
        disabled: pending !== null || !backend?.deleteChat,
        onClick: () => permanentlyDelete(chat_5)
      }]} />)}</div>}</ScrollArea>;
  let t21;
  if ($[33] !== t17 || $[34] !== t18 || $[35] !== t19 || $[36] !== t20) {
    t21 = <section aria-label={t7} className={t8}>{t17}{t18}{t19}{t20}</section>;
    $[33] = t17;
    $[34] = t18;
    $[35] = t19;
    $[36] = t20;
    $[37] = t21;
  } else t21 = $[37];
  return t21;
}
/** Keep chats mounted while browsing the archive so drafts and running responses survive. */
function _temp6$5(value) {
  return value + 1;
}
function _temp4$10(ref) {
  return ref.displayName ?? ref.name;
}
function _temp2$16(a, b) {
  return (b.archivedAt ?? "").localeCompare(a.archivedAt ?? "");
}
function _temp$24(chat_0) {
  return chat_0.archivedAt;
}
function ChatArchiveView(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  let children;
  let onBack;
  let open;
  let props;
  if ($[0] !== t0) {
    ({
      open,
      onBack,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = onBack;
    $[3] = open;
    $[4] = props;
  } else {
    children = $[1];
    onBack = $[2];
    open = $[3];
    props = $[4];
  }
  const t1 = open ? "hidden" : "h-full min-h-0";
  let t2;
  if ($[5] !== children || $[6] !== t1) {
    t2 = <div className={t1}>{children}</div>;
    $[5] = children;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  let t3;
  if ($[8] !== onBack || $[9] !== open || $[10] !== props) {
    t3 = open && <ArchivedChatsPanel {...props} onBack={onBack} />;
    $[8] = onBack;
    $[9] = open;
    $[10] = props;
    $[11] = t3;
  } else t3 = $[11];
  let t4;
  if ($[12] !== t2 || $[13] !== t3) {
    t4 = <div className="h-full min-h-0">{t2}{t3}</div>;
    $[12] = t2;
    $[13] = t3;
    $[14] = t4;
  } else t4 = $[14];
  return t4;
}

export { ChatArchiveView };
