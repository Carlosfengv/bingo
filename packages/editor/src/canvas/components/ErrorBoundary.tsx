/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/ErrorBoundary.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";

function LocalizedElementError({ elementName, errorMessage, onFixWithAI }) {
  const { t } = useTranslation("editor");
  const displayMessage = errorMessage || t("elementError.unknown");
  const shortMessage = displayMessage.length > 100 ? displayMessage.substring(0, 100) + "..." : displayMessage;
  return <div style={{
    padding: "8px 12px",
    border: "1px solid #fca5a5",
    borderRadius: "4px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
    }}>{<div style={{
      flex: 1,
      minWidth: 0
    }}>{<span style={{
        fontWeight: 600
      }}>{elementName || t("elementError.component")}</span>} {t("elementError.crashed")} {<span style={{
        fontFamily: "monospace",
        opacity: .8
      }}>{shortMessage}</span>}</div>}{onFixWithAI && elementName && <button onClick={() => onFixWithAI(elementName, displayMessage)} style={{
      background: "#991b1b",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "11px",
      cursor: "pointer",
      whiteSpace: "nowrap"
    }}>{t("elementError.fixWithAssistant")}</button>}</div>;
}

var ElementErrorBoundary = class extends import_react.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      resetKey: props.resetKey
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return {
      hasError: false,
      error: null,
      resetKey: props.resetKey
    };
    return null;
  }
  componentDidCatch(error, errorInfo) {
    let serializedProps = "[unserializable]";
    try {
      serializedProps = JSON.stringify(this.props.elementProps ?? null);
    } catch {}
    console.error(`[ElementErrorBoundary] Error in element ${this.props.elementName || this.props.elementId}:`, error, `props=${serializedProps}`, {
      componentStack: errorInfo.componentStack,
      props: this.props.elementProps
    });
    this.props.onError?.(error, errorInfo);
    if (this.props.elementName) this.props.onCrash?.(this.props.elementName);
  }
  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message;
      if (this.props.fallback) return <>{this.props.fallback}</>;
      if (this.props.silent || this.props.elementId?.startsWith("el-draw-")) return null;
      return <LocalizedElementError elementName={this.props.elementName} errorMessage={errorMessage} onFixWithAI={this.props.onFixWithAI} />;
    }
    return this.props.children;
  }
};

export { ElementErrorBoundary };
