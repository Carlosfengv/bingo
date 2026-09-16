import { emitScopedThemeCss, resolveThemeSelection, resolveThemeTokens, validateThemeManifest } from "@bingo/compiler";
import { i18next } from "@bingo/i18n";
import { PortalContainerProvider } from "../../../../ui/src/contexts/PortalContainerContext";
import * as React from "react";

const THEME_SESSION_EVENT = "bingo:prototype-theme-selection";

function themeSessionKey(projectPath, sessionKey) {
  return `${String(projectPath || "")}:${String(sessionKey || "default")}`;
}

function readThemeSessionSelection(projectPath, sessionKey) {
  if (typeof window === "undefined") return null;
  return window["__bingoPrototypeThemeSessions"]?.get(themeSessionKey(projectPath, sessionKey)) ?? null;
}

function publishThemeSessionSelection(projectPath, sessionKey, selection) {
  if (typeof window === "undefined") return;
  const sessions = window["__bingoPrototypeThemeSessions"] ?? new Map();
  sessions.set(themeSessionKey(projectPath, sessionKey), selection);
  window["__bingoPrototypeThemeSessions"] = sessions;
  window.dispatchEvent(new CustomEvent(THEME_SESSION_EVENT, { detail: { projectPath, sessionKey, selection } }));
}

function currentProjectPath(explicitPath) {
  if (explicitPath) return explicitPath;
  if (typeof window === "undefined") return null;
  if (window["__bingoProjectPath"]) return window["__bingoProjectPath"];
  try { return new URL(window.location.href).searchParams.get("project"); } catch { return null; }
}

function invokeStore(op, root, args = {}) {
  const projectPath = currentProjectPath(root);
  if (!projectPath || !window.api?.invoke) return Promise.resolve(null);
  return window.api.invoke("bingo:store", { op, root: projectPath, ...args });
}

function urlThemeSelection() {
  try {
    const value = new URL(window.location.href).searchParams.get("theme");
    return value ? (value === "system" ? { kind: "system" } : { kind: "theme", themeId: value }) : null;
  } catch {
    return null;
  }
}

function updateUrlTheme(selection) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("theme", selection.kind === "system" ? "system" : selection.themeId);
    window.history.replaceState(window.history.state, "", url);
  } catch {}
}

function themeSourceMatchesEvent(manifest, event, projectPath) {
  if (!manifest || !event || String(event.projectId) !== String(projectPath)) return false;
  if (manifest.source?.kind !== "tokens") return false;
  const source = String(manifest.source.file || "").replace(/\\/g, "/").replace(/^\.\//, "");
  const changed = String(event.filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  return !!source && (changed === source || changed.endsWith(`/${source}`));
}

function useProjectPrototypeTheme(projectPath, options = {}) {
  const resolvedProjectPath = currentProjectPath(projectPath);
  const sessionKey = options.sessionKey ?? "default";
  const [manifest, setManifest] = React.useState(null);
  const [remembered, setRemembered] = React.useState(null);
  const [selection, setSelectionState] = React.useState(null);
  const [prefersDark, setPrefersDark] = React.useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true);
  const [status, setStatus] = React.useState("loading");
  const [themeCss, setThemeCss] = React.useState("");
  const [themeAvailability, setThemeAvailability] = React.useState({});
  const [settingsRevision, setSettingsRevision] = React.useState(0);

  React.useEffect(() => {
    if (!resolvedProjectPath || !window.api?.on) return;
    return window.api.on("settings_changed", event => {
      if (String(event?.projectId) !== String(resolvedProjectPath)) return;
      if (event?.key === "prototypeTheme" || event?.key === "configuration") setSettingsRevision(value => value + 1);
    });
  }, [resolvedProjectPath]);

  React.useEffect(() => {
    if (!resolvedProjectPath || !manifest || !window.api?.on) return;
    return window.api.on("file_changed", event => {
      if (themeSourceMatchesEvent(manifest, event, resolvedProjectPath)) setSettingsRevision(value => value + 1);
    });
  }, [manifest, resolvedProjectPath]);

  React.useEffect(() => {
    if (!resolvedProjectPath || typeof window === "undefined") return;
    const handleSelection = event => {
      const detail = event.detail;
      if (String(detail?.projectPath) !== String(resolvedProjectPath) || String(detail?.sessionKey) !== String(sessionKey) || !manifest) return;
      const nextResult = resolveThemeSelection(manifest, { urlSelection: detail.selection, prefersDark });
      if (!themeAvailability[nextResult.resolvedThemeId]?.ready) return;
      if (nextResult.selection.kind === "system" && Object.values(manifest.systemMapping || {}).some(themeId => !themeAvailability[themeId]?.ready)) return;
      setSelectionState(nextResult.selection);
      setRemembered(nextResult.selection);
      if (options.syncUrl) updateUrlTheme(nextResult.selection);
    };
    window.addEventListener(THEME_SESSION_EVENT, handleSelection);
    return () => window.removeEventListener(THEME_SESSION_EVENT, handleSelection);
  }, [manifest, options.syncUrl, prefersDark, resolvedProjectPath, sessionKey, themeAvailability]);

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    Promise.all([
      invokeStore("read-settings", resolvedProjectPath),
      invokeStore("read-prototype-theme-preference", resolvedProjectPath)
    ]).then(async ([settings, preference]) => {
      if (!active) return;
      if (!settings?.prototypeTheme) {
        setManifest(null);
        setThemeCss("");
        setThemeAvailability({});
        setSelectionState(null);
        setStatus("ready");
        return;
      }
      try {
        const nextManifest = validateThemeManifest(settings.prototypeTheme);
        let nextThemeCss = "";
        let nextAvailability = Object.fromEntries(nextManifest.themes.map(theme => [theme.id, { ready: true, diagnostics: [] }]));
        if (nextManifest.source.kind === "tokens") {
          const rawLibrary = await invokeStore("read-file", resolvedProjectPath, { rel: nextManifest.source.file });
          if (!active) return;
          if (typeof rawLibrary !== "string") throw new Error(`Theme token file was not found: ${nextManifest.source.file}`);
          const library = JSON.parse(rawLibrary);
          nextAvailability = Object.fromEntries(nextManifest.themes.map(theme => {
            const result = resolveThemeTokens(nextManifest, library, theme.id);
            return [theme.id, { ready: result.ready, diagnostics: result.diagnostics }];
          }));
          if (!nextAvailability[nextManifest.defaultThemeId]?.ready) {
            throw new Error(`Default theme is incomplete: ${nextManifest.defaultThemeId}`);
          }
          nextThemeCss = emitScopedThemeCss(nextManifest, library);
        }
        let nextSelection = resolveThemeSelection(nextManifest, {
          urlSelection: options.syncUrl ? urlThemeSelection() : null,
          inheritedSelection: options.initialSelection ?? readThemeSessionSelection(resolvedProjectPath, sessionKey),
          rememberedSelection: preference?.selection,
          prefersDark
        });
        const systemReady = !nextManifest.systemMapping || Object.values(nextManifest.systemMapping).every(themeId => nextAvailability[themeId]?.ready);
        if (!nextAvailability[nextSelection.resolvedThemeId]?.ready || (nextSelection.selection.kind === "system" && !systemReady)) {
          nextSelection = resolveThemeSelection(nextManifest, { urlSelection: nextManifest.defaultThemeId, prefersDark });
        }
        if (nextSelection.invalidUrlSelection && options.syncUrl) {
          console.warn("[PrototypeTheme] Unknown URL theme; using the project default.");
          updateUrlTheme(nextSelection.selection);
        }
        setManifest(nextManifest);
        setThemeCss(nextThemeCss);
        setThemeAvailability(nextAvailability);
        setRemembered(preference?.selection ?? null);
        setSelectionState(nextSelection.selection);
        publishThemeSessionSelection(resolvedProjectPath, sessionKey, nextSelection.selection);
        setStatus("ready");
      } catch (error) {
        console.warn("[PrototypeTheme] Invalid theme manifest:", error);
        setManifest(null);
        setThemeCss("");
        setThemeAvailability({});
        setSelectionState(null);
        setStatus("failed");
      }
    }).catch(error => {
      if (!active) return;
      console.warn("[PrototypeTheme] Failed to load theme settings:", error);
      setStatus("failed");
    });
    return () => { active = false; };
  }, [resolvedProjectPath, settingsRevision]);

  React.useEffect(() => {
    if (selection?.kind !== "system" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = event => setPrefersDark(event.matches);
    setPrefersDark(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [selection?.kind]);

  const resolved = React.useMemo(() => manifest && selection ? resolveThemeSelection(manifest, {
    urlSelection: selection,
    rememberedSelection: remembered,
    prefersDark
  }) : null, [manifest, selection, remembered, prefersDark]);

  const setSelection = React.useCallback((next, changeOptions = {}) => {
    if (!manifest) return false;
    const nextResult = resolveThemeSelection(manifest, { urlSelection: next, prefersDark });
    const requested = typeof next === "string" ? next : next?.kind === "system" ? "system" : next?.themeId;
    const accepted = nextResult.selection.kind === "system" ? requested === "system" : nextResult.selection.themeId === requested;
    if (!accepted) return false;
    if (!themeAvailability[nextResult.resolvedThemeId]?.ready) return false;
    if (nextResult.selection.kind === "system" && Object.values(manifest.systemMapping || {}).some(themeId => !themeAvailability[themeId]?.ready)) return false;
    setSelectionState(nextResult.selection);
    publishThemeSessionSelection(resolvedProjectPath, sessionKey, nextResult.selection);
    if (options.syncUrl) updateUrlTheme(nextResult.selection);
    if (changeOptions.persist !== false) {
      setRemembered(nextResult.selection);
      void invokeStore("write-prototype-theme-preference", resolvedProjectPath, { selection: nextResult.selection }).catch(error => {
        console.warn("[PrototypeTheme] Theme changed, but the preference could not be saved:", error);
      });
    }
    return true;
  }, [manifest, options.syncUrl, prefersDark, resolvedProjectPath, sessionKey, themeAvailability]);

  return { manifest, selection, resolvedThemeId: resolved?.resolvedThemeId ?? null, status, themeCss, themeAvailability, setSelection };
}

function PrototypeThemeScope({ runtime, children }) {
  if (!runtime?.resolvedThemeId) return children;
  const theme = runtime.manifest?.themes.find(item => item.id === runtime.resolvedThemeId);
  return <div
    data-prototype-root=""
    data-theme={runtime.resolvedThemeId}
    data-theme-selection={runtime.selection?.kind === "system" ? "system" : runtime.resolvedThemeId}
    className={runtime.resolvedThemeId}
    style={{ display: "contents", colorScheme: theme?.colorScheme }}
  >{children}</div>;
}

function usePrototypeCopy() {
  const [, refresh] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    const handleLanguageChanged = () => refresh();
    i18next.on("languageChanged", handleLanguageChanged);
    return () => i18next.off("languageChanged", handleLanguageChanged);
  }, []);
  return (key, fallback) => i18next.isInitialized
    ? String(i18next.t(`editor:canvas.${key}`, { defaultValue: fallback }))
    : fallback;
}

function PrototypeThemeSelect({ runtime, compact = false }) {
  const t = usePrototypeCopy();
  const manifest = runtime?.manifest;
  if (!manifest || manifest.themes.length < 2) return null;
  const value = runtime.selection?.kind === "system" ? "system" : runtime.resolvedThemeId ?? manifest.defaultThemeId;
  return <label data-prototype-theme-control="" className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-white/15 bg-black/65 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur">
    {!compact && <span>{t("prototypeTheme", "Prototype theme")}</span>}
    <select aria-label={t("prototypeTheme", "Prototype theme")} value={value} onChange={event => runtime.setSelection(event.target.value, { persist: true })} className="max-w-28 bg-transparent text-inherit outline-none">
      {manifest.themes.map(theme => {
        const ready = runtime.themeAvailability?.[theme.id]?.ready !== false;
        return <option key={theme.id} value={theme.id} disabled={!ready} className="bg-ed-foreground text-ed-background">{theme.label}{ready ? "" : ` — ${t("themeUnavailable", "unavailable")}`}</option>;
      })}
      {manifest.systemMapping && (() => {
        const ready = Object.values(manifest.systemMapping).every(themeId => runtime.themeAvailability?.[themeId]?.ready !== false);
        return <option value="system" disabled={!ready} className="bg-ed-foreground text-ed-background">{t("systemTheme", "System")}{ready ? "" : ` — ${t("themeUnavailable", "unavailable")}`}</option>;
      })()}
    </select>
  </label>;
}

function usePrototypePortalHost(runtime) {
  const [host, setHost] = React.useState(null);
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const node = document.createElement("div");
    node.setAttribute("data-prototype-theme-portal-host", "");
    document.body.appendChild(node);
    setHost(node);
    return () => {
      setHost(null);
      node.remove();
    };
  }, []);
  React.useEffect(() => {
    if (!host) return;
    const themeId = runtime?.resolvedThemeId;
    const theme = runtime?.manifest?.themes.find(item => item.id === themeId);
    if (!themeId) {
      host.removeAttribute("data-prototype-root");
      host.removeAttribute("data-theme");
      host.removeAttribute("data-theme-selection");
      host.className = "";
      host.style.colorScheme = "";
      return;
    }
    host.setAttribute("data-prototype-root", "");
    host.setAttribute("data-theme", themeId);
    host.setAttribute("data-theme-selection", runtime.selection?.kind === "system" ? "system" : themeId);
    host.className = themeId;
    host.style.colorScheme = theme?.colorScheme || "";
  }, [host, runtime?.manifest, runtime?.resolvedThemeId, runtime?.selection?.kind]);
  return host;
}

function ProjectThemedPreview({ projectPath, initialSelection, syncUrl = false, sessionKey = "default", children, controlClassName = "absolute right-2 top-2 z-[70]" }) {
  const runtime = useProjectPrototypeTheme(projectPath, { initialSelection, syncUrl, sessionKey });
  const portalHost = usePrototypePortalHost(runtime);
  return <PortalContainerProvider container={portalHost}><>
      {runtime.themeCss && <style data-prototype-theme-styles="">{runtime.themeCss}</style>}
      <div className={controlClassName}><PrototypeThemeSelect runtime={runtime} compact={true} /></div>
      <PrototypeThemeScope runtime={runtime}>{children}</PrototypeThemeScope>
    </></PortalContainerProvider>;
}

export { ProjectThemedPreview, PrototypeThemeScope, PrototypeThemeSelect, themeSourceMatchesEvent, useProjectPrototypeTheme };
