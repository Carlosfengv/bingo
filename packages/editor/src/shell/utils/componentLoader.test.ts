import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
// The recovered compiler entry includes CommonJS runtime modules.
const { componentLoader } = createRequire(import.meta.url)("../../../../workspace/src/services/ComponentLoader.ts");

const moduleUrl = (source: string) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const index = { App: { path: "App.tsx", exportName: "default" }, Unused: { path: "Unused.tsx", exportName: "default" } };
const createLoader = () => new (componentLoader.constructor as new () => typeof componentLoader)();

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
