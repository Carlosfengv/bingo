import * as React from "react";
import { useTranslation } from "@bingo/i18n";
import { useBackendOptional } from "../../backends/BackendContext";
import { ChatMarkdown } from "./ChatMarkdown";
import { ChatRecoveryNotice } from "./ChatRecoveryBoundary";

export const ChatMessageContext = React.createContext(null);

export function isChatBodyReference(value) {
  return typeof value?.bodyRef?.contentHash === "string" && /^[a-f0-9]{64}$/.test(value.bodyRef.contentHash);
}

/** Stored text can be inline or a paged reference; never stringify the latter. */
export function ChatText({ value }) {
  const context = React.useContext(ChatMessageContext);
  if (typeof value === "string") return <ChatMarkdown>{value}</ChatMarkdown>;
  if (isChatBodyReference(value)) return <PagedChatText key={`${context?.chatId}:${context?.messageId}:${value.bodyRef.contentHash}`} bodyId={value.bodyRef.contentHash} />;
  if (value == null) return null;
  return <ChatRecoveryNotice code="CHAT_TEXT_INVALID" contextId={context?.messageId} onRetry={context?.reload} reload={!!context?.reload} />;
}

function PagedChatText({ bodyId }) {
  const { t } = useTranslation("editor");
  const context = React.useContext(ChatMessageContext);
  const backend = useBackendOptional();
  const [content, setContent] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const pending = React.useRef(false);
  const generation = React.useRef(0);
  React.useEffect(() => { generation.current += 1; return () => { generation.current += 1; }; }, []);
  const load = async () => {
    if (pending.current || offset === null) return;
    pending.current = true;
    const current = generation.current;
    setLoading(true);
    setError(null);
    try {
      if (!backend?.getChatMessageBody || !context) throw new Error(t("chat.contentUnavailable"));
      const page = await backend.getChatMessageBody(context.chatId, context.messageId, { bodyId, offset, limit: 8192 });
      if (current !== generation.current) return;
      if (typeof page?.content !== "string" || (page.nextOffset !== null && (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset))) throw new Error(t("chat.contentLoadFailed"));
      setContent(previous => previous + page.content);
      setOffset(page.nextOffset);
    } catch (error) {
      if (current === generation.current) setError(error);
    } finally {
      pending.current = false;
      if (current === generation.current) setLoading(false);
    }
  };
  return <div className="ed-chat-paged-text" style={{ minWidth: 0, color: "var(--ed-foreground, #dedede)", fontSize: 13, lineHeight: 1.6 }}>
    {content && <div style={{ maxHeight: 280, overflow: "auto", overflowWrap: "anywhere" }}><ChatMarkdown>{content}</ChatMarkdown></div>}
    {!content && <p>{t("chat.contentDeferred")}</p>}
    {error ? <ChatRecoveryNotice code="CHAT_BODY_LOAD_FAILED" error={error} contextId={context?.messageId} onRetry={load} reload /> : offset !== null && <button type="button" disabled={loading} onClick={load}
      style={{ color: "var(--ed-foreground, #dedede)", background: "var(--ed-muted, #333)", border: "1px solid var(--ed-border, #777)", borderRadius: 6, padding: "5px 8px", font: "inherit", cursor: loading ? "wait" : "pointer" }}>
      {t(loading ? "chat.contentLoading" : content ? "chat.contentLoadMore" : "chat.contentExpand")}
    </button>}
  </div>;
}
