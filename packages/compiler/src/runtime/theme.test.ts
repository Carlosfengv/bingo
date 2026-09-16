import assert from "node:assert/strict";
import test from "node:test";

import {
  emitScopedThemeCss,
  resolveThemeSelection,
  resolveThemeTokens,
  scanCssThemeModes,
  validateThemeManifest
} from "./theme";

const manifest = {
  version: 1,
  source: { kind: "tokens", file: "src/theme/tokens.json" },
  defaultThemeId: "light",
  themes: [
    { id: "light", label: "浅色", colorScheme: "light", collectionModes: { colors: "mode-light", semantic: "sem-light" } },
    { id: "dark", label: "深色", colorScheme: "dark", collectionModes: { colors: "mode-dark", semantic: "sem-dark" } },
    { id: "ocean", label: "海洋", colorScheme: "dark", collectionModes: { colors: "mode-ocean", semantic: "sem-ocean" }, extendsThemeId: "dark" }
  ],
  systemMapping: { light: "light", dark: "dark" },
  adapter: { kind: "scoped-css" }
};

const library = {
  version: 1,
  collections: [
    { id: "colors", label: "Colors", defaultModeId: "mode-light", modes: [{ id: "mode-light" }, { id: "mode-dark" }, { id: "mode-ocean" }] },
    { id: "semantic", label: "Semantic", defaultModeId: "sem-light", modes: [{ id: "sem-light" }, { id: "sem-dark" }, { id: "sem-ocean" }] }
  ],
  requiredTokenIds: ["page-bg", "text-primary"],
  tokens: [
    {
      id: "neutral-bg",
      name: "Neutral background",
      collectionId: "colors",
      type: "color",
      cssName: "neutral-bg",
      valuesByMode: {
        "mode-light": { kind: "literal", value: "#ffffff" },
        "mode-dark": { kind: "literal", value: "#18181b" },
        "mode-ocean": { kind: "literal", value: "#071e2b" }
      },
      sourceRef: { kind: "authored", locator: "fixture" }
    },
    {
      id: "page-bg",
      name: "Page background",
      collectionId: "semantic",
      type: "color",
      cssName: "page-bg",
      valuesByMode: {
        "sem-light": { kind: "alias", tokenId: "neutral-bg" },
        "sem-dark": { kind: "alias", tokenId: "neutral-bg" },
        "sem-ocean": { kind: "alias", tokenId: "neutral-bg" }
      },
      sourceRef: { kind: "authored", locator: "fixture" }
    },
    {
      id: "text-primary",
      name: "Primary text",
      collectionId: "semantic",
      type: "color",
      cssName: "text-primary",
      valuesByMode: {
        "sem-light": { kind: "literal", value: "#18181b" },
        "sem-dark": { kind: "literal", value: "#fafafa" }
      },
      sourceRef: { kind: "authored", locator: "fixture" }
    }
  ],
  assets: []
};

test("validates stable IDs, defaults and inheritance cycles", () => {
  assert.equal(validateThemeManifest(manifest).themes.length, 3);
  assert.throws(
    () => validateThemeManifest({ ...manifest, themes: [...manifest.themes, { ...manifest.themes[0] }] }),
    error => error?.code === "THEME_ID_DUPLICATE"
  );
  assert.throws(
    () => validateThemeManifest({ ...manifest, themes: [{ ...manifest.themes[0], extendsThemeId: "dark" }, { ...manifest.themes[1], extendsThemeId: "light" }] }),
    error => error?.code === "THEME_INHERITANCE_CYCLE"
  );
});

test("selects URL, inherited, remembered and default themes in priority order", () => {
  assert.equal(resolveThemeSelection(manifest, { urlSelection: "ocean", inheritedSelection: "dark" }).resolvedThemeId, "ocean");
  const invalidUrl = resolveThemeSelection(manifest, { urlSelection: "missing", inheritedSelection: "dark" });
  assert.equal(invalidUrl.resolvedThemeId, "light");
  assert.equal(invalidUrl.invalidUrlSelection, true);
  assert.equal(resolveThemeSelection(manifest, { rememberedSelection: "ocean" }).resolvedThemeId, "ocean");
  assert.equal(resolveThemeSelection(manifest, {}).resolvedThemeId, "light");
  assert.equal(resolveThemeSelection(manifest, { urlSelection: "system", prefersDark: true }).resolvedThemeId, "dark");
});

test("resolves cross-collection aliases under the selected theme", () => {
  const dark = resolveThemeTokens(manifest, library, "dark");
  assert.equal(dark.ready, true);
  assert.equal(dark.values["page-bg"], "#18181b");
  assert.equal(dark.values["text-primary"], "#fafafa");

  const ocean = resolveThemeTokens(manifest, library, "ocean");
  assert.equal(ocean.values["page-bg"], "#071e2b");
  assert.equal(ocean.values["text-primary"], "#fafafa");
  assert.equal(ocean.ready, true);
});

test("reports alias cycles and marks required tokens incomplete", () => {
  const broken = structuredClone(library);
  broken.tokens[0].valuesByMode["mode-dark"] = { kind: "alias", tokenId: "page-bg" };
  const result = resolveThemeTokens(manifest, broken, "dark");
  assert.equal(result.ready, false);
  assert.ok(result.diagnostics.some(item => item.code === "THEME_ALIAS_CYCLE"));
});

test("rejects required token IDs that do not exist", () => {
  assert.throws(
    () => resolveThemeTokens(manifest, { ...library, requiredTokenIds: ["missing"] }, "light"),
    error => error?.code === "THEME_TOKEN_UNKNOWN"
  );
});

test("emits independently scoped CSS for each ready theme", () => {
  const css = emitScopedThemeCss(manifest, library);
  assert.match(css, /data-theme="light"/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /data-theme="ocean"/);
  assert.match(css, /--page-bg: #071e2b/);
  assert.match(css, /color-scheme: dark/);
});

test("scans root, class and data attribute modes without flattening values", () => {
  const result = scanCssThemeModes(`
    :root { --page-bg: white; --text: black; }
    .dark { --page-bg: #111; --text: white; }
    [data-theme="ocean"] { --page-bg: #024; }
  `, "tokens.css");
  assert.deepEqual(result.modes.default, { "page-bg": "white", text: "black" });
  assert.deepEqual(result.modes.dark, { "page-bg": "#111", text: "white" });
  assert.deepEqual(result.modes.ocean, { "page-bg": "#024" });
  assert.equal(result.sources.length, 3);
});
