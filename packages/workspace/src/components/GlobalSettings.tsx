/*
 * Global settings.
 *
 * Added on top of the recovered tree. The provider configuration that used to
 * live under a project's AI Chat tab is machine-wide (a credential belongs to
 * the user, not a repository), so it lives here instead: a row at the bottom of
 * the projects sidebar, above Feedback, opening a dialog.
 *
 * Discovers supported local coding agents and saves the preferred installed
 * agent. Credentials and model defaults stay with each agent.
 */
import { useEffect, useState } from "react";
import { useLocalAgents } from "@bingo/editor";
import { useTranslation } from "@bingo/i18n";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SettingsIcon,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Text$4,
} from "@bingo/ui";

const invoke = (channel, args) => window.api.invoke(channel, args);

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text$4 as="span" size="2xs" weight="medium">
        {label}
      </Text$4>
      {children}
      {hint ? (
        <Text$4 as="span" size="2xs" variant="tertiary">
          {hint}
        </Text$4>
      ) : null}
    </label>
  );
}

function ProviderForm() {
  const { t } = useTranslation("settings");
  const { agents, selectedAgent, loading, saving, error, refresh, selectAgent } = useLocalAgents();
  return <div className="flex flex-col gap-3">
    <Text$4 as="div" size="2xs" variant="tertiary">{t("agent.description")}</Text$4>
    <div role="radiogroup" aria-label={t("agent.field")} aria-busy={loading} className="divide-y divide-ed-border">
      {agents.map(entry => <div key={entry.agent} className="flex flex-col gap-2 py-3">
        <label className="flex items-center gap-3">
          <input type="radio" name="coding-agent" value={entry.agent}
            checked={selectedAgent === entry.agent} disabled={loading || saving || error || !entry.installed}
            onChange={() => void selectAgent(entry.agent)} className="accent-current" />
          <span className="min-w-0 flex-1 text-sm">{entry.displayName}</span>
          <Text$4 as="span" size="2xs" variant={!loading && !error && entry.installed ? "success" : "tertiary"}>
            {t(loading ? "agent.detecting" : error ? "agent.unknown" : entry.installed ? "agent.installed" : "agent.notInstalled")}
          </Text$4>
        </label>
        {!loading && !error && !entry.installed && <div className="pl-6">
          <Text$4 as="div" size="2xs" variant="tertiary">{t("agent.installHint")}</Text$4>
          <code className="mt-1 block select-text break-all text-xs text-ed-muted-foreground">{entry.installCommand}</code>
        </div>}
      </div>)}
    </div>
    <Text$4 as="div" size="2xs" variant="tertiary">{t("agent.installedHint")}</Text$4>
    {error && <Text$4 as="div" size="2xs" variant="danger" role="alert">{t("agent.detectError")}</Text$4>}
    <Button size="sm" variant="outline" className="self-start" disabled={loading || saving} onClick={() => void refresh()}>
      {t(loading ? "agent.detecting" : "agent.refresh")}
    </Button>
  </div>;
}

function LocaleForm() {
  const { t } = useTranslation("settings");
  const [preference, setPreference] = useState("system");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let latestRevision = -1;
    const applyState = (state) => {
      if (cancelled || !state || state.revision <= latestRevision) return;
      latestRevision = state.revision;
      setPreference(state.preference);
      setBusy(false);
      setError("");
    };
    const off = window.api.on("bingo:locale-changed", applyState);
    invoke("bingo:locale-get")
      .then(applyState)
      .catch(() => {
        if (!cancelled) {
          setBusy(false);
          setError(t("language.saveError"));
        }
      });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [t]);

  const changePreference = async (nextPreference) => {
    setBusy(true);
    setError("");
    try {
      const state = await invoke("bingo:locale-set", { preference: nextPreference });
      setPreference(state.preference);
    } catch {
      setError(t("language.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return <Field label={t("language.title")} hint={t("language.hint")}>
    <select
      value={preference}
      disabled={busy}
      onChange={(event) => void changePreference(event.target.value)}
      className="h-9 rounded-md border border-ed-border bg-ed-background px-3 text-sm text-ed-foreground disabled:opacity-60"
    >
      <option value="system">{t("language.system")}</option>
      <option value="zh-CN">{t("language.zhCN")}</option>
      <option value="en">{t("language.en")}</option>
    </select>
    {error ? <Text$4 as="span" size="2xs" variant="danger">{error}</Text$4> : null}
  </Field>;
}

/**
 * The sidebar row plus its dialog.
 *
 * `rowClassName` is passed in so this shares the sidebar's row recipe, the same
 * way ProjectsSidebarFeedback does.
 */
function GlobalSettingsRow({ rowClassName }) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className={rowClassName} onClick={() => setOpen(true)}>
            <span className="flex size-5 shrink-0 items-center justify-center">
              <SettingsIcon />
            </span>
            <span>{t("title")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <LocaleForm />
          <div className="h-px bg-ed-divider" />
          <ProviderForm />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { GlobalSettingsRow, LocaleForm, ProviderForm };
