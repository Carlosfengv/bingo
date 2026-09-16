import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PrototypeThemeScope, PrototypeThemeSelect, themeSourceMatchesEvent } from "../../packages/editor/src/shared/theme/PrototypeThemeRuntime";

const runtime = {
  manifest: {
    defaultThemeId: "light",
    themes: [
      { id: "light", label: "Light", colorScheme: "light" },
      { id: "dark", label: "Dark", colorScheme: "dark" }
    ],
    systemMapping: { light: "light", dark: "dark" }
  },
  selection: { kind: "system" },
  resolvedThemeId: "dark",
  setSelection() {}
};

test("renders a scoped prototype theme independently from editor-dark", () => {
  const html = renderToStaticMarkup(React.createElement(PrototypeThemeScope, { runtime }, React.createElement("main", null, "Preview")));
  assert.match(html, /data-prototype-root=""/);
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /data-theme-selection="system"/);
  assert.match(html, /class="dark"/);
  assert.doesNotMatch(html, /editor-dark/);
});

test("renders all configured themes and system in the preview selector", () => {
  const html = renderToStaticMarkup(React.createElement(PrototypeThemeSelect, { runtime }));
  assert.match(html, /aria-label="Prototype theme"/);
  assert.match(html, />Light</);
  assert.match(html, />Dark</);
  assert.match(html, />System</);
});

test("disables incomplete themes and system without removing their diagnostics entry", () => {
  const unavailableRuntime = {
    ...runtime,
    selection: { kind: "theme", themeId: "light" },
    resolvedThemeId: "light",
    themeAvailability: {
      light: { ready: true, diagnostics: [] },
      dark: { ready: false, diagnostics: [{ code: "THEME_INCOMPLETE" }] }
    }
  };
  const html = renderToStaticMarkup(React.createElement(PrototypeThemeSelect, { runtime: unavailableRuntime }));
  assert.match(html, /value="dark" disabled=""[^>]*>Dark — unavailable/);
  assert.match(html, /value="system" disabled=""[^>]*>System — unavailable/);
});

test("reloads only when the configured token source changes in the same project", () => {
  const manifest = { source: { kind: "tokens", file: "theme/tokens.json" } };
  assert.equal(themeSourceMatchesEvent(manifest, { projectId: "/demo", filePath: "theme/tokens.json" }, "/demo"), true);
  assert.equal(themeSourceMatchesEvent(manifest, { projectId: "/demo", filePath: "/demo/theme/tokens.json" }, "/demo"), true);
  assert.equal(themeSourceMatchesEvent(manifest, { projectId: "/other", filePath: "theme/tokens.json" }, "/demo"), false);
  assert.equal(themeSourceMatchesEvent(manifest, { projectId: "/demo", filePath: "src/App.tsx" }, "/demo"), false);
});
