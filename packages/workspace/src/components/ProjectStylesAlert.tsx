import { useTranslation } from "@bingo/i18n";
import * as React from "react";

export function ProjectStylesAlert({ error, inline = false }) {
  const { t } = useTranslation("workspace");

  return <details
    role="alert"
    style={inline ? { maxHeight: 160 } : { top: 12, left: 12, right: 12, maxHeight: 160 }}
    className={`${inline ? "" : "absolute z-30 "}overflow-auto rounded-lg border border-ed-border bg-ed-background p-3 text-ed-foreground shadow-lg`}
  >
    <summary className="cursor-pointer text-sm font-medium text-ed-warning-foreground">
      {t("editor.stylesUnavailable")}
    </summary>
    <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-ed-muted-foreground [overflow-wrap:anywhere]">{error}</pre>
  </details>;
}
