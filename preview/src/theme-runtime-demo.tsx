import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ProjectThemedPreview, useProjectPrototypeTheme } from "../../packages/editor/src/shared/theme/PrototypeThemeRuntime";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../packages/ui/src/components/Dialog";
import "../../src/renderer/src/index.css";

const manifest = {
  version: 1,
  source: { kind: "tokens", file: "theme/tokens.json" },
  defaultThemeId: "light",
  themes: [
    { id: "light", label: "Light", colorScheme: "light", collectionModes: { colors: "light" } },
    { id: "dark", label: "Dark", colorScheme: "dark", collectionModes: { colors: "dark" } },
    { id: "ocean", label: "Ocean", colorScheme: "dark", collectionModes: { colors: "ocean" } }
  ],
  systemMapping: { light: "light", dark: "dark" },
  adapter: { kind: "scoped-css" }
};

let library = {
  version: 1,
  collections: [{
    id: "colors",
    label: "Colors",
    defaultModeId: "light",
    modes: [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "ocean", label: "Ocean" }]
  }],
  requiredTokenIds: ["page-bg", "text-primary"],
  tokens: [
    {
      id: "page-bg", name: "Page background", collectionId: "colors", type: "color", cssName: "page-bg",
      valuesByMode: { light: { kind: "literal", value: "#f7f8fc" }, dark: { kind: "literal", value: "#151821" }, ocean: { kind: "literal", value: "#06293b" } },
      sourceRef: { kind: "authored", locator: "theme-runtime-demo" }
    },
    {
      id: "text-primary", name: "Primary text", collectionId: "colors", type: "color", cssName: "text-primary",
      valuesByMode: { light: { kind: "literal", value: "#172033" }, dark: { kind: "literal", value: "#f4f7ff" }, ocean: { kind: "literal", value: "#e7f7ff" } },
      sourceRef: { kind: "authored", locator: "theme-runtime-demo" }
    },
    {
      id: "accent", name: "Accent", collectionId: "colors", type: "color", cssName: "accent",
      valuesByMode: { light: { kind: "literal", value: "#5b5bd6" }, dark: { kind: "literal", value: "#9797ff" }, ocean: { kind: "literal", value: "#42c8ff" } },
      sourceRef: { kind: "authored", locator: "theme-runtime-demo" }
    }
  ],
  assets: []
};

let preference = null;
const listeners = new Map();
window["__bingoProjectPath"] = "/theme-runtime-demo";
window["__updateDemoThemeColor"] = color => {
  library = structuredClone(library);
  library.tokens.find(token => token.id === "page-bg").valuesByMode.ocean.value = color;
  for (const listener of listeners.get("file_changed") || []) {
    listener({ projectId: "/theme-runtime-demo", filePath: "theme/tokens.json" });
  }
};
window["__breakDemoOceanTheme"] = () => {
  library = structuredClone(library);
  delete library.tokens.find(token => token.id === "text-primary").valuesByMode.ocean;
  for (const listener of listeners.get("file_changed") || []) {
    listener({ projectId: "/theme-runtime-demo", filePath: "theme/tokens.json" });
  }
};
window.api = {
  invoke(_channel, payload) {
    if (payload.op === "read-settings") return Promise.resolve({ prototypeTheme: manifest });
    if (payload.op === "read-file") return Promise.resolve(JSON.stringify(library));
    if (payload.op === "read-prototype-theme-preference") return Promise.resolve(preference);
    if (payload.op === "write-prototype-theme-preference") {
      preference = { version: 1, selection: payload.selection };
      return Promise.resolve(preference);
    }
    return Promise.resolve(null);
  },
  on(eventName, listener) {
    const eventListeners = listeners.get(eventName) || new Set();
    eventListeners.add(listener);
    listeners.set(eventName, eventListeners);
    return () => eventListeners.delete(listener);
  }
};

function AppearanceModeDemo() {
  const runtime = useProjectPrototypeTheme(undefined, { sessionKey: "canvas" });
  if (!runtime.manifest || runtime.manifest.themes.length < 2) return null;
  const value = runtime.selection?.kind === "system" ? "system" : runtime.resolvedThemeId ?? runtime.manifest.defaultThemeId;
  return <aside aria-label="Appearance" style={{ position: "fixed", right: 20, top: 72, zIndex: 30, width: 248, padding: 16, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)", background: "rgba(30,32,40,.94)", color: "white", boxShadow: "0 18px 48px rgba(0,0,0,.28)", backdropFilter: "blur(16px)" }}>
    <strong style={{ display: "block", marginBottom: 14, fontSize: 13 }}>Appearance</strong>
    <label style={{ display: "grid", gap: 7, fontSize: 11, color: "rgba(255,255,255,.68)" }}>Theme
      <select aria-label="Theme mode" value={value} onChange={event => runtime.setSelection(event.target.value, { persist: true })} style={{ width: "100%", height: 32, borderRadius: 7, border: "1px solid rgba(255,255,255,.14)", padding: "0 9px", background: "rgba(255,255,255,.07)", color: "white" }}>
        {runtime.manifest.themes.map(theme => <option key={theme.id} value={theme.id} disabled={runtime.themeAvailability?.[theme.id]?.ready === false}>{theme.label}</option>)}
        {runtime.manifest.systemMapping && <option value="system">System</option>}
      </select>
    </label>
    {runtime.selection?.kind === "system" && <small style={{ display: "block", marginTop: 7, color: "rgba(255,255,255,.52)" }}>Following system · {runtime.resolvedThemeId}</small>}
  </aside>;
}

function Demo() {
  const [value, setValue] = useState("State survives theme changes");
  const [dialogOpen, setDialogOpen] = useState(false);
  return <>
    <AppearanceModeDemo />
    <ProjectThemedPreview sessionKey="canvas" syncUrl={true} controlClassName="fixed left-5 top-5 z-20">
      <main data-testid="theme-page" style={{ minHeight: "100vh", padding: 48, background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "Inter, system-ui, sans-serif", transition: "background-color 120ms ease, color 120ms ease" }}>
      <section style={{ maxWidth: 720, margin: "80px auto", border: "1px solid color-mix(in srgb, var(--text-primary) 18%, transparent)", borderRadius: 24, padding: 32 }}>
        <p style={{ color: "var(--accent)", fontWeight: 700 }}>MULTI-THEME RUNTIME</p>
        <h1 style={{ fontSize: 42, lineHeight: 1.08, margin: "10px 0 20px" }}>One page, three themes</h1>
        <p>Theme switching changes scoped semantic variables without remounting this form.</p>
        <label style={{ display: "grid", gap: 8, marginTop: 28 }}>Persistent input
          <input aria-label="Persistent input" value={value} onChange={event => setValue(event.target.value)} style={{ border: "1px solid var(--accent)", borderRadius: 10, padding: 12, background: "transparent", color: "inherit" }} />
        </label>
        <button onClick={() => setDialogOpen(true)} style={{ marginTop: 20, border: "1px solid var(--accent)", borderRadius: 10, padding: "10px 14px", background: "var(--accent)", color: "var(--page-bg)" }}>Open themed dialog</button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="theme-dialog" style={{ background: "var(--page-bg)", color: "var(--text-primary)", borderColor: "var(--accent)" }}>
            <DialogTitle style={{ color: "var(--text-primary)" }}>Portal follows this preview</DialogTitle>
            <DialogDescription style={{ color: "var(--text-primary)" }}>The dialog is mounted in this surface's themed portal host.</DialogDescription>
          </DialogContent>
        </Dialog>
        <output style={{ display: "block", marginTop: 20 }}>The typed value stays mounted while the scoped theme changes.</output>
      </section>
      </main>
    </ProjectThemedPreview>
  </>;
}

createRoot(document.getElementById("root")!).render(<Demo />);
