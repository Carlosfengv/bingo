import assert from "node:assert/strict";
import test from "node:test";
import { inlineAssetImages } from "../../canvas/lib/canvasPreview";

test("thumbnail asset fetches never replace an image edited during capture", async t => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(globalThis, "fetch", async () => {
    await gate;
    return { ok: true, blob: async () => new Blob() };
  });
  const original = globalThis.FileReader;
  globalThis.FileReader = class {
    result = "data:image/png;base64,preview";
    readAsDataURL() { this.onload(); }
  } as any;
  t.after(() => { if (original) globalThis.FileReader = original; else delete globalThis.FileReader; });
  let src = "/assets/by-path?path=old.png";
  const image = { getAttribute: () => src, setAttribute: (_: string, value: string) => { src = value; } };
  const pending = inlineAssetImages({ querySelectorAll: () => [image] });
  src = "/assets/by-path?path=new.png";
  release();
  const restore = await pending;
  assert.equal(src, "/assets/by-path?path=new.png");
  restore();
  assert.equal(src, "/assets/by-path?path=new.png");
});

test("thumbnail restoration only undoes its own still-current replacement", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, blob: async () => new Blob() }));
  const original = globalThis.FileReader;
  globalThis.FileReader = class {
    result = "data:image/png;base64,preview";
    readAsDataURL() { this.onload(); }
  } as any;
  t.after(() => { if (original) globalThis.FileReader = original; else delete globalThis.FileReader; });
  let src = "/assets/by-path?path=old.png";
  const image = { getAttribute: () => src, setAttribute: (_: string, value: string) => { src = value; } };
  const root = { querySelectorAll: () => [image] };
  const restore = await inlineAssetImages(root);
  assert.equal(src, "data:image/png;base64,preview");
  restore(); assert.equal(src, "/assets/by-path?path=old.png");
  const restoreAfterEdit = await inlineAssetImages(root);
  src = "new-source.png";
  restoreAfterEdit(); assert.equal(src, "new-source.png");
});
