import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
// The recovered compiler entry includes CommonJS runtime modules.
const { componentLoader } = createRequire(import.meta.url)("../../../../workspace/src/services/ComponentLoader.ts");

const moduleUrl = (source: string) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const index = { App: { path: "App.tsx", exportName: "default" }, Unused: { path: "Unused.tsx", exportName: "default" } };
const createLoader = () => new (componentLoader.constructor as new () => typeof componentLoader)();

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function browserGlobals(context) {
  for (const [name, value] of Object.entries({
    window: { api: { invoke: async () => [] }, dispatchEvent() {} },
    document: { querySelectorAll: () => [] },
    HTMLCanvasElement: class { getContext() { return null; } },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    context.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
}

test("component editing contracts survive index loading and props-only patches", () => {
  const loader = createLoader();
  const editing = { rootStyle: "supported", rootTag: "button" };
  assert.deepEqual(loader.applyComponentIndex({ Button: { path: "Button.tsx", exportName: "Button", editing } }).componentIndex.Button.editing, editing);
  assert.deepEqual(loader.patchComponentIndex({ Button: { props: { size: { type: "string" } } } }).componentIndex.Button.editing, editing);
  assert.equal(loader.patchComponentIndex({ Button: { editing: { rootStyle: "unknown" } } }).componentIndex.Button.editing.rootStyle, "unknown");
  assert.equal(loader.applyComponentIndex({ Button: { path: "Other.tsx", exportName: "Button" } }).componentIndex.Button.editing, undefined, "new full index must not inherit an obsolete contract");
});

test("authoritative API updates and component identity changes cannot resurrect stale parameters", () => {
  const loader = createLoader();
  const full = { path: "Button.tsx", exportName: "Button", props: { size: { type: "'sm' | 'lg'" } }, editing: { rootStyle: "supported", rootTag: "button" }, inspectsChildren: true };
  loader.applyComponentIndex({ Button: full });
  const changed = loader.applyComponentIndex({ Button: { path: "Button.tsx", exportName: "Button" } }).componentIndex.Button;
  assert.equal(changed.props, undefined);
  assert.equal(changed.inspectsChildren, undefined);
  loader.applyComponentIndex({ Button: full });
  const partial = loader.patchComponentIndex({ Button: { inspectsChildren: false } }).componentIndex.Button;
  assert.deepEqual(partial.props, full.props, "a partial update preserves unchanged metadata");
  assert.equal(partial.inspectsChildren, undefined);
  const renamed = loader.patchComponentIndex({ Button: { path: "NewButton.tsx", exportName: "default" } }).componentIndex.Button;
  assert.equal(renamed.props, undefined);
  assert.equal(renamed.editing, undefined);
  assert.equal(renamed.inspectsChildren, undefined);
  const exported = loader.patchComponentIndex({ Button: { exportName: "NewExport" } }).componentIndex.Button;
  assert.equal(exported.path, "NewButton.tsx", "changing only the export preserves the module address");
  assert.equal(exported.exportName, "NewExport");
});

test("canvas style rebuilds keep unused project components lazy, including index updates", async () => {
  const loader = createLoader();
  const app = { path: "App.tsx", codeUrl: moduleUrl("export default function App() { return 1 }") };
  const unused = { path: "Unused.tsx", codeUrl: moduleUrl("throw new Error('Unused module must not run');") };
  loader.cacheModules([app, unused]);
  await loader.importModulesAtPaths([app.path]);
  const initial = loader.applyComponentIndex(index);
  for (let i = 0; i < 3; i++) {
    const update = await loader.reloadUpdatedModules([app, unused]);
    await loader.patchComponentIndexAndLoad(index);
    assert.equal(update.components.App, initial.components.App);
    assert.equal(loader.moduleErrors.size, 0, "unused module was never evaluated");
    assert.equal(update.components.Unused, undefined);
  }
  const changed = { path: app.path, codeUrl: moduleUrl("export default function App() { return 2 }") };
  const update = await loader.reloadUpdatedModules([changed, unused]);
  assert.equal(update.components.App(), 2, "used components still refresh");
  loader.cacheModules([{ path: unused.path, codeUrl: moduleUrl("export default function Unused() { return 3 }") }]);
  const requested = await loader.ensureModulesForNames(["Unused"]);
  assert.equal(requested.components.Unused(), 3, "an unused component can still load on demand");
});

test("full builder index updates discard unavailable props while partial scans preserve them", async () => {
  const loader = createLoader();
  const identity = { path: "Button.tsx", exportName: "Button" };
  const props = { label: { type: "string", default: "Default" } };
  loader.applyComponentIndex({ Button: { ...identity, props, editing: { rootStyle: "supported", rootTag: "button" } } });
  const partial = await loader.patchComponentIndexAndLoad({ Button: identity });
  assert.deepEqual(partial.componentIndex.Button.props, props);
  const full = await loader.patchComponentIndexAndLoad({ Button: identity }, { replace: true });
  assert.equal(full.componentIndex.Button.props, undefined);
  assert.equal(full.componentIndex.Button.editing, undefined);
  const rebound = await loader.reloadUpdatedModules([]);
  assert.equal(rebound.componentIndex.Button.props, undefined, "later module events cannot restore obsolete parameter controls");
});

test("a failed revision is not retried on canvas changes and a corrected revision recovers", async () => {
  const loader = createLoader();
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent() {} } as unknown as Window & typeof globalThis;
  try {
    const broken = { path: "App.tsx", codeUrl: moduleUrl("throw new Error('Broken fixture');") };
    loader.cacheModules([broken]);
    loader.applyComponentIndex(index);
    await loader.ensureModulesForNames(["App"]);
    assert.match(loader.moduleErrors.get(broken.path), /Broken fixture/);
    assert.match(loader.applyComponentIndex(index).componentIndex.App.runtimeError, /Broken fixture/);
    assert.equal(await loader.ensureModulesForNames(["App"]), null);
    const good = { path: broken.path, codeUrl: moduleUrl("export default function Fixed() { return 4 }") };
    const recovered = await loader.reloadUpdatedModules([good]);
    assert.equal(recovered.components.App(), 4);
    assert.equal(recovered.componentIndex.App.runtimeError, undefined);
    const failure = await loader.reloadUpdatedModules([broken]);
    assert.equal(failure.components.App(), 4, "a failed refresh preserves the working component");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("concurrent requests wait for the same module and stale completions cannot overwrite updates", async () => {
  const loader = createLoader();
  const slow = { path: "App.tsx", codeUrl: moduleUrl("await new Promise(r => setTimeout(r, 60)); export default function Slow() { return 5 }") };
  loader.cacheModules([slow]);
  loader.applyComponentIndex(index);
  const [one, two] = await Promise.all([loader.ensureModulesForNames(["App"]), loader.ensureModulesForNames(["App"])]);
  assert.equal(one.components.App, two.components.App);
  const newerSlow = { ...slow, codeUrl: moduleUrl("await new Promise(r => setTimeout(r, 60)); export default function Older() { return 6 }") };
  const pending = loader.reloadUpdatedModules([newerSlow]);
  await new Promise(resolve => setTimeout(resolve, 10));
  await loader.reloadUpdatedModules([{ ...slow, codeUrl: moduleUrl("export default function Latest() { return 7 }") }]);
  await pending;
  assert.equal(loader.applyComponentIndex(index).components.App(), 7);
});

test("a canvas request made before registration loads when the component index arrives", async () => {
  const loader = createLoader();
  loader.applyComponentIndex({});
  assert.equal(await loader.ensureModulesForNames(["Late"]),null);
  loader.cacheModules([{path:"Late.tsx",codeUrl:moduleUrl('export function Late(){return 8}') }]);
  const registered = await loader.patchComponentIndexAndLoad({Late:{path:"Late.tsx",exportName:"Late"}});
  assert.equal(registered.components.Late(),8);
  const repaired = await loader.reloadUpdatedModules([{path:"Late.tsx",codeUrl:moduleUrl('export function Late(){return 9}')}]);
  assert.equal(repaired.components.Late(),9);
});

test("an in-flight canvas import cannot restore metadata from before a definition edit", async () => {
  const loader = createLoader();
  const oldIndex = { App: { ...index.App, editing: { themeVariables: "available" } } };
  const newIndex = { App: { ...index.App, editing: { themeVariables: "applied" } } };
  loader.applyComponentIndex(oldIndex);
  loader.cacheModules([{ path: "App.tsx", codeUrl: moduleUrl("export default function App() { return 10 }") }]);
  let release;
  const imports = loader.importModulesAtPaths.bind(loader);
  loader.importModulesAtPaths = async paths => {
    await new Promise(resolve => { release = resolve; });
    await imports(paths);
  };
  const pending = loader.ensureModulesForNames(["App"]);
  loader.applyComponentIndex(newIndex);
  release();
  const result = await pending;
  assert.equal(result.componentIndex.App.editing.themeVariables, "applied");
  assert.equal(loader.lastComponentIndex.App.editing.themeVariables, "applied");
});

test("a slower earlier contract update cannot overwrite a newer complete index", async () => {
  const loader = createLoader();
  loader.applyComponentIndex(index);
  loader.requestedComponentNames.add("App");
  loader.cacheModules([{ path: "App.tsx", codeUrl: moduleUrl("export default function App() { return 11 }") }]);
  const gate = deferred();
  const imports = loader.importModulesAtPaths.bind(loader);
  let first = true;
  loader.importModulesAtPaths = async paths => {
    if (first) { first = false; await gate.promise; }
    await imports(paths);
  };
  const old = loader.patchComponentIndexAndLoad({ App: { ...index.App, props: { old: { type: "string" } } } }, { replace: true });
  const latest = { App: { ...index.App, props: { current: { type: "boolean" } } } };
  await loader.patchComponentIndexAndLoad(latest, { replace: true });
  gate.resolve();
  assert.equal(await old, null, "a superseded result must not be published to the UI");
  assert.deepEqual(loader.lastComponentIndex.App.props, latest.App.props);
});

for (const operation of ["initial", "canvas", "files", "modules", "index"]) {
  test(`${operation} loading is discarded after leaving and reopening the same project`, async context => {
    browserGlobals(context);
    const loader = createLoader();
    loader.setProject("project-a");
    loader.applyComponentIndex(index);
    loader.cacheModules([{ path: "App.tsx", codeUrl: moduleUrl(`export default function Obsolete() { return '${operation}' }`) }]);
    loader.requestedModulePaths.add("App.tsx");
    const started = deferred(), release = deferred();
    loader.loadCssFromModules = async () => { started.resolve(); await release.promise; };
    loader.pathsUsedOnCanvas = async () => ({ kind: "components", paths: ["App.tsx"] });
    const pending = operation === "initial" ? loader.loadModulesForIndex(index)
      : operation === "canvas" ? loader.ensureModulesForNames(["App"])
      : operation === "files" ? loader.reloadIndexedModules(["App.tsx"])
      : operation === "modules" ? loader.reloadUpdatedModules([...loader.moduleCatalog.values()])
      : loader.patchComponentIndexAndLoad(index, { replace: true });
    await started.promise;
    loader.setProject("project-b");
    loader.setProject("project-a");
    const current = () => "current session";
    loader.moduleRegistry.set("App.tsx", { default: current });
    const currentIndex = { App: { ...index.App, props: { current: { type: "number" } } } };
    loader.applyComponentIndex(currentIndex);
    release.resolve();
    assert.equal(await pending, null);
    assert.equal(loader.moduleRegistry.get("App.tsx").default, current);
    assert.deepEqual(loader.lastComponentIndex.App.props, currentIndex.App.props);
    assert.equal(loader.lastComponentIndex.Unused, undefined);
  });
}

test("concurrent partial index updates retain both contracts and wait for their implementations", async () => {
  const loader = createLoader();
  loader.applyComponentIndex(index);
  loader.requestedComponentNames.add("App");
  loader.requestedComponentNames.add("Unused");
  const app = { path: "App.tsx", codeUrl: moduleUrl("export default function App() { return 12 }") };
  const unused = { path: "Unused.tsx", codeUrl: moduleUrl("export default function Unused() { return 13 }") };
  loader.cacheModules([app, unused]);
  const gate = deferred(), started = deferred();
  const imports = loader.importModulesFromUrls.bind(loader);
  loader.importModulesFromUrls = async modules => {
    if (modules.some(module => module.path === app.path)) { started.resolve(); await gate.promise; }
    await imports(modules);
  };
  const old = loader.patchComponentIndexAndLoad({ App: { props: { first: { type: "string" } } } });
  await started.promise;
  let published = false;
  const next = loader.patchComponentIndexAndLoad({ Unused: { props: { second: { type: "boolean" } } } }).then(value => { published = true; return value; });
  const request = loader.ensureModulesForNames(["Unused"]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published, false, "metadata cannot publish while its first implementation is still loading");
  gate.resolve();
  assert.equal(await old, null);
  const latest = await next;
  assert.equal(latest.components.App(), 12);
  assert.equal(latest.components.Unused(), 13);
  assert.equal(latest.componentIndex.App.props.first.type, "string");
  assert.equal(latest.componentIndex.Unused.props.second.type, "boolean");
  assert.deepEqual((await request).componentIndex, latest.componentIndex);
});

test("a definition update during the initial canvas lookup still loads its visible components", async () => {
  const loader = createLoader();
  const canvas = deferred<{ kind: string; paths: string[] }>();
  loader.pathsUsedOnCanvas = () => canvas.promise;
  loader.cacheModules([{ path: "App.tsx", codeUrl: moduleUrl("export default function UpdatedDuringLookup() { return 14 }") }]);
  const initial = loader.loadModulesForIndex(index);
  const latest = loader.patchComponentIndexAndLoad({ App: { ...index.App, props: { newest: { type: "string" } } } }, { replace: true });
  canvas.resolve({ kind: "components", paths: ["App.tsx"] });
  assert.equal(await initial, null);
  const result = await latest;
  assert.equal(result.components.App?.(), 14);
  assert.equal(result.componentIndex.App.props.newest.type, "string");
});

test("an old module delayed by its stylesheet cannot start importing after the new revision", async () => {
  const loader = createLoader();
  loader.applyComponentIndex(index);
  loader.requestedModulePaths.add("App.tsx");
  const old = { path: "App.tsx", codeUrl: moduleUrl("export default function OldStylesheetRevision() { return 15 }") };
  const latest = { path: "App.tsx", codeUrl: moduleUrl("export default function NewStylesheetRevision() { return 16 }") };
  const css = deferred();
  loader.loadCssFromModules = modules => modules.includes(old) ? css.promise : Promise.resolve();
  const pending = loader.reloadUpdatedModules([old]);
  assert.equal((await loader.reloadUpdatedModules([latest])).components.App(), 16);
  css.resolve();
  assert.equal((await pending).components.App(), 16);
  assert.equal(loader.loadedModuleUrls.get("App.tsx"), latest.codeUrl);
});

for (const fails of [false, true]) {
  test(`a late CSS ${fails ? "failure" : "response"} cannot affect the next project`, async context => {
    browserGlobals(context);
    const nodes = [];
    let dispatched = 0;
    const old = deferred<string>();
    Object.assign(document, {
      querySelectorAll: () => [...nodes],
      getElementById: id => nodes.find(node => node.id === id),
      createElement: () => {
        const node = { id: "", textContent: "", remove() { nodes.splice(nodes.indexOf(node), 1); } };
        return node;
      },
      head: { appendChild: node => nodes.push(node) },
    });
    window.dispatchEvent = () => { dispatched++; return true; };
    window.api.invoke = async (_channel, args) => args.root === "old" ? old.promise : ".current { color: blue; }";
    const loader = createLoader();
    const modules = [{ path: "App.tsx", cssImports: ["./theme.css"] }];
    loader.setProject("old");
    const pending = loader.loadCssFromModules(modules);
    loader.setProject("new");
    await loader.loadCssFromModules(modules);
    if (fails) old.reject(new Error("old project disappeared"));
    else old.resolve(".obsolete { color: red; }");
    await pending;
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].textContent, ".current { color: blue; }");
    assert.ok(loader.injectedCssPaths.has("theme.css"));
    assert.equal(dispatched, 1, "only the current project's CSS may trigger a refresh");
  });
}
