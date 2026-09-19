import * as React from "react";
import { useTranslation } from "@bingo/i18n";
import { ProjectActivityProvider } from "@bingo/editor";

/** The editor adds its pending saves to this synchronous collection event. */
export function ProjectTabLifecycle({ children }) {
  const { t } = useTranslation("app");
  const [preparing, setPreparing] = React.useState(false);
  React.useEffect(() => {
    const offClose = window.api.on("project-tabs:prepare-close", async ({ requestId }) => {
      setPreparing(true);
      try {
        const pending: Promise<unknown>[] = [];
        window.dispatchEvent(new CustomEvent("bingo:prepare-project-close", { detail: { pending } }));
        await Promise.all(pending);
        window.api.send("project-tabs:prepared", { requestId, ok: true });
      } catch (error) {
        window.api.send("project-tabs:prepared", { requestId, ok: false, error: String(error?.message || error) });
      }
    });
    const offResume = window.api.on("project-tabs:resume", () => setPreparing(false));
    window.api.send("project-tabs:status", { ready: true });
    return () => { offClose(); offResume(); };
  }, []);
  return <ProjectActivityProvider><div className="project-tab-editor">
    <div className="project-tab-editor-content" inert={preparing || undefined}>{children}</div>
    {preparing && <div className="project-tab-saving" role="status">{t("tabs.saving")}</div>}
  </div></ProjectActivityProvider>;
}
