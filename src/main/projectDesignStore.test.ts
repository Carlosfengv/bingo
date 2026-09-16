import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  createPortableDesign,
  deletePortablePage,
  hasPortableDesign,
  listPortablePages,
  readPortablePage,
  reorderPortablePages,
  savePortableAsset,
  savePortablePage,
} from "./projectDesignStore";

const execFileAsync = promisify(execFile);

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-design-"));
  try { await run(root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}

const page = id => ({
  id,
  name: `Page ${id.slice(0, 4)}`,
  elements: { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: [] } },
  newClasses: [],
});

test("creates, reopens and updates a portable design using project files", async () => {
  await fixture(async root => {
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    createPortableDesign(root, [page(first)]);
    assert.equal(hasPortableDesign(root), true);
    savePortablePage(root, page(second));
    savePortablePage(root, { ...page(first), name: "Updated" });
    assert.deepEqual(listPortablePages(root).map(item => item.name), ["Updated", `Page ${second.slice(0, 4)}`]);
    assert.equal(readPortablePage(root, first).canvas.elements.schemaVersion, 2);
  });
});

test("reorders and removes pages through the manifest", async () => {
  await fixture(async root => {
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    createPortableDesign(root, [page(first), page(second)]);
    reorderPortablePages(root, [{ id: second, sortOrder: 0 }, { id: first, sortOrder: 1 }]);
    assert.deepEqual(listPortablePages(root).map(item => item.id), [second, first]);
    deletePortablePage(root, second);
    assert.deepEqual(listPortablePages(root).map(item => item.id), [first]);
  });
});

test("stores portable assets by content and returns a machine-independent reference", async () => {
  await fixture(async root => {
    createPortableDesign(root, []);
    const one = savePortableAsset(root, { filename: "photo.png", dataBase64: Buffer.from("image").toString("base64") });
    const two = savePortableAsset(root, { filename: "copy.png", dataBase64: Buffer.from("image").toString("base64") });
    assert.equal(one.url, two.url);
    assert.match(one.url, /^bingo-asset:[a-f0-9]{64}\.png$/);
    assert.equal((await fs.readdir(path.join(root, ".bingo/design/assets"))).length, 1);
  });
});

test("publishes prepared migration assets before pages reference them", async () => {
  await fixture(async root => {
    const id = "11111111-1111-4111-8111-111111111111";
    const bytes = Buffer.from("portable-image");
    const hash = "2790008bb8652eb4fbb48584d7640ecae4ce7fc870ca7bd52a6834f94295f080";
    createPortableDesign(root, [{ ...page(id), elements: {
      schemaVersion: 2,
      byId: { image: { id: "image", type: "html", tag: "img", props: { src: `bingo-asset:${hash}.png` } } },
      childrenByParent: { ROOT: ["image"] },
    } }], { assets: [{ name: `${hash}.png`, filename: "image.png", bytes }] });
    assert.equal(await fs.readFile(path.join(root, `.bingo/design/assets/${hash}.png`), "utf8"), "portable-image");
    assert.equal(readPortablePage(root, id).canvas.elements.byId.image.props.src, `bingo-asset:${hash}.png`);
  });
});

test("does not treat a damaged manifest as an empty design", async () => {
  await fixture(async root => {
    await fs.mkdir(path.join(root, ".bingo/design"), { recursive: true });
    await fs.writeFile(path.join(root, ".bingo/design/manifest.json"), "{ broken");
    assert.equal(hasPortableDesign(root), true);
    assert.throws(() => listPortablePages(root), error => error?.code === "DESIGN_INVALID");
  });
});

test("reopens committed pages and assets from a fresh Git clone", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-design-clone-"));
  const source = path.join(directory, "source");
  const clone = path.join(directory, "clone");
  await fs.mkdir(source);
  try {
    const id = "11111111-1111-4111-8111-111111111111";
    createPortableDesign(source, [page(id)]);
    const asset = savePortableAsset(source, { filename: "photo.png", dataBase64: Buffer.from("clone-image").toString("base64") });
    savePortablePage(source, { ...page(id), elements: {
      schemaVersion: 2,
      byId: { image: { id: "image", type: "html", tag: "img", props: { src: asset.url } } },
      childrenByParent: { ROOT: ["image"] },
    } });
    await execFileAsync("git", ["init", "-q"], { cwd: source });
    await execFileAsync("git", ["add", ".bingo/design"], { cwd: source });
    await execFileAsync("git", ["-c", "user.name=Bingo Test", "-c", "user.email=test@localhost", "commit", "-qm", "design"], { cwd: source });
    await execFileAsync("git", ["clone", "-q", source, clone]);
    const cloned = listPortablePages(clone);
    assert.equal(cloned[0].canvas.elements.byId.image.props.src, asset.url);
    assert.equal((await fs.readdir(path.join(clone, ".bingo/design/assets"))).length, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects a save based on a stale page revision", async () => {
  await fixture(async root => {
    const id = "11111111-1111-4111-8111-111111111111";
    createPortableDesign(root, [page(id)]);
    const first = readPortablePage(root, id);
    savePortablePage(root, { ...page(id), name: "External update" }, first._revision);
    assert.throws(
      () => savePortablePage(root, { ...page(id), name: "Stale update" }, first._revision),
      error => error?.code === "DESIGN_CONFLICT" && error?.details?.actualRevision !== first._revision,
    );
    assert.equal(readPortablePage(root, id).name, "External update");
  });
});

test("does not write through another process design lock", async () => {
  await fixture(async root => {
    const id = "11111111-1111-4111-8111-111111111111";
    createPortableDesign(root, [page(id)]);
    const lock = path.join(root, ".bingo/design/.write.lock");
    await fs.writeFile(lock, JSON.stringify({ token: "other-process", pid: 999999 }));
    assert.throws(
      () => savePortablePage(root, { ...page(id), name: "Should not save" }),
      error => error?.code === "WRITE_IN_PROGRESS",
    );
    assert.equal(readPortablePage(root, id).name, `Page ${id.slice(0, 4)}`);
    assert.equal(JSON.parse(await fs.readFile(lock, "utf8")).token, "other-process");
  });
});
