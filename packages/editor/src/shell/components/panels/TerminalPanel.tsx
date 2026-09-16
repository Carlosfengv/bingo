/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/TerminalPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_addon_fit from "@xterm/addon-fit";
import * as import_xterm from "@xterm/xterm";
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";

/** Light palette matching editor chrome (--ed-background/--ed-foreground light values). */
var LIGHT_TERMINAL_THEME = {
  background: "#f7f7f7",
  foreground: "#313131",
  cursor: "#313131",
  selectionBackground: "#b4d8fd"
};
/** Dark palette matching editor chrome (--ed-background/--ed-foreground dark values). */
var DARK_TERMINAL_THEME = {
  background: "#242424",
  foreground: "#dedede",
  cursor: "#dedede",
  selectionBackground: "rgba(99, 143, 214, 0.18)"
};
function getBridge$2() {
  if (typeof window === "undefined") return null;
  const api = window.api;
  return api && typeof api.invoke === "function" ? api : null;
}
/**
* xterm.js terminal wired to a real PTY in the Electron main process.
* One session per mounted panel; the session is created on mount and disposed
* on unmount. Keep this component mounted (visually hidden) across tab
* switches so the shell survives.
*
* `active` should flip true when the panel becomes visible — it triggers a
* refit + focus once the container actually has a size.
*/
function TerminalPanel({
  active,
  initialCommand,
  theme
}) {
  const { t } = useTranslation("editor");
  const containerRef = (0, import_react.useRef)(null);
  const termRef = (0, import_react.useRef)(null);
  const fitRef = (0, import_react.useRef)(null);
  const sessionIdRef = (0, import_react.useRef)(null);
  const commandAtMount = (0, import_react.useEffectEvent)(() => initialCommand);
  const resolvedTheme = theme ?? LIGHT_TERMINAL_THEME;
  (0, import_react.useEffect)(() => {
    const bridge = getBridge$2();
    const container = containerRef.current;
    if (!bridge || !container) return;
    const term = new import_xterm.Terminal({
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--ed-font-mono").trim(),
      fontSize: 12,
      cursorBlink: true,
      theme: resolvedTheme
    });
    const fit = new import_addon_fit.FitAddon();
    term.loadAddon(fit);
    term.open(container);
    termRef.current = term;
    fitRef.current = fit;
    term.attachCustomKeyEventHandler(event => {
      if (event.type !== "keydown") return true;
      if (event.key === "Escape") return false;
      if (event.key === "Tab" && event.shiftKey) return false;
      return true;
    });
    const safeFit = () => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return null;
      try {
        fit.fit();
        return {
          cols: term.cols,
          rows: term.rows
        };
      } catch {
        return null;
      }
    };
    let disposed = false;
    const offFns = [];
    const dims = safeFit();
    bridge.invoke("terminal:create", {
      cols: dims?.cols ?? 80,
      rows: dims?.rows ?? 24,
      initialCommand: commandAtMount()
    }).then(res => {
      if (disposed) {
        if (res.ok) bridge.send("terminal:dispose", {
          id: res.id
        });
        return;
      }
      if (!res.ok) {
        term.writeln(`\x1b[31mFailed to start terminal: ${res.error}\x1b[0m`);
        return;
      }
      sessionIdRef.current = res.id;
      offFns.push(bridge.on("terminal:data", payload => {
        const p = payload;
        if (p?.id === res.id) term.write(p.data);
      }));
      offFns.push(bridge.on("terminal:exit", payload => {
        const p = payload;
        if (p?.id === res.id) term.writeln(`\r\n\x1b[90m[process exited with code ${p.exitCode}]\x1b[0m`);
      }));
      term.onData(data => {
        if (sessionIdRef.current) bridge.send("terminal:input", {
          id: sessionIdRef.current,
          data
        });
      });
    });
    const sendResize = () => {
      const d = safeFit();
      const id = sessionIdRef.current;
      if (d && id) bridge.send("terminal:resize", {
        id,
        cols: d.cols,
        rows: d.rows
      });
    };
    const ro = new ResizeObserver(() => sendResize());
    ro.observe(container);
    return () => {
      disposed = true;
      ro.disconnect();
      for (const off of offFns) off();
      if (sessionIdRef.current) {
        bridge.send("terminal:dispose", {
          id: sessionIdRef.current
        });
        sessionIdRef.current = null;
      }
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);
  const themeJson = JSON.stringify(resolvedTheme);
  (0, import_react.useEffect)(() => {
    if (termRef.current) termRef.current.options.theme = JSON.parse(themeJson);
  }, [themeJson]);
  (0, import_react.useEffect)(() => {
    if (!active) return;
    const fit = fitRef.current;
    const term = termRef.current;
    if (!fit || !term) return;
    const raf = requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {}
      term.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);
  if (!getBridge$2()) return <div className="h-full w-full flex items-center justify-center text-ed-muted-foreground text-sm">{t("panels.terminalDesktopOnly")}</div>;
  return <div className="h-full w-full p-2 overflow-hidden" style={{
    backgroundColor: resolvedTheme.background
  }}>{<div ref={containerRef} className="h-full w-full" />}</div>;
}

export { DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME, TerminalPanel };
