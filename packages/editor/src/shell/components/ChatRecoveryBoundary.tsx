import * as React from "react";
import { useTranslation } from "@bingo/i18n";

export function ChatRecoveryNotice({ code, error, contextId, onRetry, onTroubleshoot, reload = false }) {
  const { t } = useTranslation("editor");
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const pending = React.useRef(false);
  const report = [code, contextId, error instanceof Error ? error.message : typeof error === "string" ? error : null].filter(Boolean).join("\n");
  const run = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError(null);
    try { await action(); } catch (error) { setActionError(error instanceof Error ? error.message : String(error)); }
    finally { pending.current = false; setBusy(false); }
  };
  const buttonStyle = { color: "var(--ed-foreground, #dedede)", background: "var(--ed-muted, #333)", border: "1px solid var(--ed-border, #777)", borderRadius: 6, padding: "5px 8px", font: "inherit", cursor: busy ? "wait" : "pointer" };
  return <div role="status" style={{ minWidth: 0, maxWidth: "100%", padding: 12, color: "var(--ed-foreground, #dedede)", background: "var(--ed-background, #242424)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ed-border, #777)", borderRadius: 8, overflowWrap: "anywhere" }}>
    <p>{t("chat.recoveryUnavailable")}</p>
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer" }}>{t("chat.recoveryDetails")}</summary>
      <pre style={{ whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto", fontSize: 12 }}>{report}</pre>
      <button type="button" style={buttonStyle} disabled={busy} onClick={() => run(async () => { await navigator.clipboard.writeText(report); setCopied(true); })}>{t(copied ? "chat.recoveryCopied" : "chat.recoveryCopy")}</button>
    </details>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
      {onRetry && <button type="button" style={buttonStyle} disabled={busy} onClick={() => run(onRetry)}>{t(busy ? "chat.contentLoading" : reload ? "chat.recoveryReload" : "chat.recoveryRetry")}</button>}
      {onTroubleshoot && <button type="button" style={buttonStyle} disabled={busy} onClick={() => run(() => onTroubleshoot(report))}>{t("chat.recoveryInvestigate")}</button>}
    </div>
    {actionError && <p role="alert">{t("chat.contentLoadFailed")} {actionError}</p>}
  </div>;
}

/** Reload saved display data when available. Never replay tools or rewrite history. */
export class ChatRecoveryBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null, resetKey: props.resetKey };
  }
  static getDerivedStateFromError(error) { return { failed: true, error }; }
  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { failed: false, error: null, resetKey: props.resetKey } : null;
  }
  componentDidCatch(error) {
    console.error("[ChatRecoveryBoundary]", this.props.contextId, error);
  }
  render() {
    return this.state.failed ? <><ChatRecoveryNotice code="CHAT_RENDER_FAILED" error={this.state.error}
      contextId={this.props.contextId} reload={!!this.props.onReload} onRetry={async () => {
        await this.props.onReload?.();
        this.setState({ failed: false, error: null });
      }}
      onTroubleshoot={this.props.onTroubleshoot} />{this.props.fallbackContent}</> : this.props.children;
  }
}
