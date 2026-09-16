import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { builtinModules } from "node:module";
import fs from "node:fs";

const here = process.cwd();
const workspaceSrc = (p) => path.resolve(here, "packages", p, "src/index.ts");

// The workspace packages ship no build output in this tree -- only src/ -- so
// every `@bingo/*` specifier is pointed straight at source. They must also
// be excluded from dependency externalisation, or the main process would try to
// `require()` a .ts file at runtime.
const workspaceAlias = {
  "@bingo/ui": workspaceSrc("ui"),
  "@bingo/editor": workspaceSrc("editor"),
  "@bingo/i18n": workspaceSrc("i18n"),
  "@bingo/compiler": workspaceSrc("compiler"),
  "@bingo/workspace": workspaceSrc("workspace"),
};
const WORKSPACE = Object.keys(workspaceAlias);

const workspaceBrowserAlias = Object.fromEntries(
  WORKSPACE.map((k) => [
    k,
    path.resolve(here, "packages", k.slice("@bingo/".length), "src/index.browser.ts"),
  ])
);

// Several recovered .ts modules contain JSX. The original project evidently
// allowed that (its build succeeded), and since the tree is build output with
// types already erased, parsing .ts as TSX is safe and costs nothing.
const esbuildTsx = { loader: "tsx", include: /\.tsx?$/ };

// Babel 7 uses these Node environment flags to opt into Babel 8 behaviour.
// The renderer runs without Node globals, so replace the flags at build time
// instead of exposing a browser-wide `process` shim.
const babelBrowserDefine = {
  "process.env.BABEL_8_BREAKING": "false",
  "process.env.BABEL_TYPES_8_BREAKING": "false",
};

// Main and preload run in Node, so builtins must stay as require() calls rather
// than being stubbed out with Vite's browser externals.
const nodeExternal = (id) =>
  id.startsWith("node:") || builtinModules.includes(id);

/**
 * Add externals on top of whatever externalizeDepsPlugin produced.
 *
 * Assigning `build.rollupOptions.external` directly loses to that plugin, which
 * sets its own list, so this composes with it instead.
 */
function extraExternal(predicate) {
  return {
    name: "extra-external",
    config(config) {
      const prev = config.build?.rollupOptions?.external;
      const prevMatch =
        typeof prev === "function"
          ? prev
          : (id) => (Array.isArray(prev) ? prev.includes(id) : false);
      config.build ??= {};
      config.build.rollupOptions ??= {};
      config.build.rollupOptions.external = (id) =>
        prevMatch(id) || predicate(id);
    },
  };
}

/** The import map references next-shims by URL, so they are copied, not bundled. */
function copyNextShims() {
  return {
    name: "copy-next-shims",
    closeBundle() {
      fs.cpSync(
        path.resolve(here, "src/renderer/next-shims"),
        path.resolve(here, "out/renderer/next-shims"),
        { recursive: true }
      );
    },
  };
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: WORKSPACE }),
      // electron-devtools-installer is dev-only and not shipped in the asar;
      // its one import site is a dynamic import inside a try/catch.
      extraExternal(
        (id) =>
          id === "electron-devtools-installer" ||
          // ESM-only dependencies must load from node_modules at runtime; the
          // bundler's CJS interop turns `conf`'s default export into a
          // namespace, so `new Conf()` throws "not a constructor".
          /^conf(\/|$)/.test(id) ||
          nodeExternal(id)
      ),
    ],
    resolve: { alias: workspaceAlias },
    esbuild: esbuildTsx,
    build: {
      outDir: "out/main",
      lib: {
        entry: {
          index: "src/main/index.ts",
          mcpBridge: "src/main/mcpBridge.ts",
        },
      },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({ exclude: WORKSPACE }),
      extraExternal(nodeExternal),
    ],
    esbuild: esbuildTsx,
    build: { outDir: "out/preload", lib: { entry: "src/preload/index.ts" } },
  },
  renderer: {
    root: "src/renderer",
    plugins: [react(), copyNextShims()],
    resolve: { alias: workspaceBrowserAlias },
    esbuild: esbuildTsx,
    define: babelBrowserDefine,
    // Electron- and Node-only packages must not be pre-bundled for the browser;
    optimizeDeps: {
      exclude: ["conf", "@electron-toolkit/preload"],
      esbuildOptions: {
        // Dependency scanning does not use the renderer's top-level esbuild
        // loader. Recovered source includes JSX in .ts files, so mirror it here.
        loader: { ".ts": "tsx" },
        define: babelBrowserDefine,
      },
    },
    build: {
      outDir: path.resolve(here, "out/renderer"),
      emptyOutDir: true,
      // The recovered sources already call Vite's `__vitePreload` helper, which
      // is itself recovered as a module. Letting Vite inject its own would
      // declare the same identifier twice.
      modulePreload: false,
      rollupOptions: {
        input: path.resolve(here, "src/renderer/index.html"),
        // The workspace packages are aliased to absolute paths, so the bundler
        // never consults their `sideEffects` field. Declaring it here lets the
        // compiler barrel's Node-only re-exports (claudeMerge shells out to
        // `claude`) drop out of the browser build, as in the shipped bundle.
        // App source keeps its defaults: the renderer entry boots purely by
        // side effect, so marking it side-effect-free would drop the app.
        treeshake: {
          moduleSideEffects: (id) =>
            !id.startsWith(path.resolve(here, "packages")),
        },
      },
    },
  },
});
