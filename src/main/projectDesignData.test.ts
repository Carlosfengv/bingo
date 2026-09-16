import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { ChatStore } from "./chatStore";
import { deleteProjectDesignData, ensureProjectDesignData, legacyProjectDataPath } from "./projectDesignData";
import { createPortableDesign, listPortablePages, readPortablePage, savePortablePage } from "./projectDesignStore";

const pageId = "11111111-1111-4111-8111-111111111111";
async function fixture(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-design-data-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const root = await fs.realpath(temp);
  const project = path.join(root, "project");
  const userData = path.join(root, "app");
  await fs.mkdir(project);
  const legacy = legacyProjectDataPath(project, userData);
  const write = async (file, value) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
  };
  return { root, project, userData, legacy, write };
}

test("migration preserves pages, history, drafts, memory and chat bodies/attachments after a real Git clone", async t => {
  const { root, project, userData, legacy, write } = await fixture(t);
  const image = path.join(legacy, "assets", "photo.png");
  await write(image, "image bytes");
  const canvas = { elements: { schemaVersion: 2, byId: { image: { id: "image", props: { src: pathToFileURL(image).href } } }, childrenByParent: { ROOT: ["image"] } }, zoom: 1.5, pan: { x: 20, y: 30 } };
  await write(path.join(legacy, "canvases", `${pageId}.json`), { id: pageId, name: "Prototype", canvas });
  await write(path.join(legacy, "canvases", `${pageId}.versions/one.json`), { pageId, canvas });
  await write(path.join(legacy, "drafts", "draft.json"), { code: `<img src="${pathToFileURL(image).href}" />` });
  await write(path.join(legacy, "files", "file", "one.json"), { content: "old source" });
  await write(path.join(legacy, "memory.json"), { items: [{ text: "Project decision" }] });
  await write(path.join(legacy, "preview.json"), { dataUrl: "data:image/png;base64,aGVsbG8=" });
  const content = "Long conversation ".repeat(3000);
  const attachment = "data:image/png;base64,aGVsbG8=";
  const messages = Array.from({ length: 130 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", content: i === 0 ? content : `Message ${i}`, ...(i === 0 ? { inlineRefs: [{ type: "image", data: attachment }] } : {}) }));
  await new ChatStore(legacy).createChat({ id: "chat", messages });
  const data = ensureProjectDesignData(project, userData);
  assert.equal(readPortablePage(project, pageId).canvas.zoom, 1.5);
  const git = (...args) => execFileSync("git", args, { cwd: project });
  git("init", "-q"); git("add", ".bingo/design");
  git("-c", "user.name=Bingo test", "-c", "user.email=test@example.invalid", "commit", "-qm", "Design");
  const clone = path.join(root, "clone");
  git("clone", "-q", project, clone);
  await fs.rm(userData, { recursive: true });
  const clonedData = ensureProjectDesignData(clone, path.join(root, "fresh-app"));
  const restored = await new ChatStore(clonedData).readAll("chat");
  assert.equal(restored.messages.length, 130);
  assert.equal(restored.messages[0].content, content);
  assert.equal(restored.messages[0].inlineRefs[0].data, attachment);
  const page = readPortablePage(clone, pageId);
  const src = page.canvas.elements.byId.image.props.src;
  assert.match(src, /^bingo-asset:/);
  assert.equal(await fs.readFile(path.join(clonedData, "assets", src.slice("bingo-asset:".length)), "utf8"), "image bytes");
  assert.deepEqual(page.canvas.pan, { x: 20, y: 30 });
  for (const file of [`canvases/${pageId}.versions/one.json`, "drafts/draft.json", "files/file/one.json", "memory.json", "preview.json"]) {
    const text = await fs.readFile(path.join(clonedData, file), "utf8");
    assert.ok(text.length);
    assert.ok(!text.includes(pathToFileURL(image).href));
  }
  assert.equal(data, path.join(project, ".bingo", "design"));
});

test("migration never overwrites repository data or resurrects deleted chat history", async t => {
  const { project, userData, legacy, write } = await fixture(t);
  createPortableDesign(project, [{ id: pageId, name: "Repository version" }]);
  await write(path.join(legacy, "canvases", `${pageId}.json`), { id: pageId, name: "Old local version" });
  await new ChatStore(legacy).createChat({ id: "chat", messages: [{ role: "user", content: "Legacy" }] });
  const data = ensureProjectDesignData(project, userData);
  assert.equal(readPortablePage(project, pageId).name, "Repository version");
  await new ChatStore(data).deleteChat("chat");
  ensureProjectDesignData(project, userData);
  assert.equal(await new ChatStore(data).resolveChatId("chat"), null);
  assert.equal((await new ChatStore(legacy).readAll("chat")).messages[0].content, "Legacy");
});

test("new projects use project storage and retain camera state through subsequent saves", async t => {
  const { project, userData } = await fixture(t);
  ensureProjectDesignData(project, userData);
  assert.deepEqual(listPortablePages(project), []);
  savePortablePage(project, { id: pageId, zoom: 2, pan: { x: 1, y: 2 } });
  savePortablePage(project, { id: pageId, name: "Rename" });
  assert.equal(readPortablePage(project, pageId).canvas.zoom, 2);
  await assert.rejects(fs.stat(userData), { code: "ENOENT" });
});

test("invalid legacy JSON leaves the original intact and migration can be retried", async t => {
  const { project, userData, legacy, write } = await fixture(t);
  const file = path.join(legacy, "canvases", `${pageId}.json`);
  await write(file, "broken json");
  assert.throws(() => ensureProjectDesignData(project, userData));
  assert.equal(await fs.readFile(file, "utf8"), "broken json");
  await write(file, { id: pageId, name: "Recovered" });
  ensureProjectDesignData(project, userData);
  assert.equal(readPortablePage(project, pageId).name, "Recovered");
});

test("missing committed manifest is reported instead of importing stale application copies", async t => {
  const { project, userData } = await fixture(t);
  const data = ensureProjectDesignData(project, userData);
  await fs.unlink(path.join(data, "manifest.json"));
  assert.throws(() => ensureProjectDesignData(project, userData), /Restore/);
});

test("migration rejects symlinked design or legacy data paths", async t => {
  const { root, project, userData, legacy, write } = await fixture(t);
  await fs.symlink(root, path.join(project, ".bingo"));
  assert.throws(() => ensureProjectDesignData(project, userData), /symbolic/);
  await fs.unlink(path.join(project, ".bingo"));
  await write(path.join(legacy, "project.json"), {});
  await fs.symlink(root, path.join(legacy, "chats"));
  assert.throws(() => ensureProjectDesignData(project, userData), /symbolic/);
});

test("older id-less pages retain their version history during migration", async t => {
  const { project, userData, legacy, write } = await fixture(t);
  await write(path.join(legacy, "canvases/undefined.json"), { name: "Old prototype" });
  await write(path.join(legacy, "canvases/undefined.versions/one.json"), { name: "Earlier prototype", canvas: { zoom: 2 } });
  const data = ensureProjectDesignData(project, userData);
  const [page] = listPortablePages(project);
  assert.equal(page.name, "Old prototype");
  const version = JSON.parse(await fs.readFile(path.join(data, `canvases/${page.id}.versions/one.json`), "utf8"));
  assert.equal(version.pageId, page.id);
  assert.equal(version.canvas.zoom, 2);
});

test("live migration locks prevent a second writer and remain intact", async t => {
  const { project, userData, write } = await fixture(t);
  const lock = path.join(project, ".bingo/.design-data-migration.lock");
  await write(lock, { pid: process.pid, hostname: os.hostname() });
  assert.throws(() => ensureProjectDesignData(project, userData), /locked/);
  assert.ok(await fs.stat(lock));
});

test("deleting design data preserves source/configuration and prevents legacy resurrection", async t => {
  const { project, userData, legacy, write } = await fixture(t);
  await write(path.join(project, "src/App.tsx"), "source to keep");
  await write(path.join(project, ".bingo/config.json"), { iconLibraries: [] });
  await write(path.join(project, ".gitignore"), "/.bingo/design/\n");
  await write(path.join(legacy, "settings.json"), { iconLibraries: [] });
  await write(path.join(legacy, "canvases", `${pageId}.json`), { id: pageId, name: "Old prototype" });
  await new ChatStore(legacy).createChat({ id: "legacy-chat", messages: [{ role: "user", content: "Old chat" }] });
  const data = ensureProjectDesignData(project, userData);
  deleteProjectDesignData(project, userData);
  await assert.rejects(fs.stat(data), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(legacy, "chats")), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(project, "src/App.tsx"), "utf8"), "source to keep");
  assert.ok(await fs.stat(path.join(project, ".bingo/config.json")));
  assert.ok(await fs.stat(path.join(project, ".gitignore")));
  assert.ok(await fs.stat(path.join(legacy, "settings.json")));
  ensureProjectDesignData(project, userData);
  assert.deepEqual(listPortablePages(project), []);
  assert.equal(await new ChatStore(data).resolveChatId("legacy-chat"), null);
});

test("deletion rejects symlinked parents before deleting any design or legacy data", async t => {
  const { root, project, userData, legacy, write } = await fixture(t);
  const outside = path.join(root, "outside");
  await write(path.join(outside, "design/keep.json"), "do not delete");
  await write(path.join(legacy, "chats/chat.json"), "keep legacy until deletion succeeds");
  await fs.symlink(outside, path.join(project, ".bingo"));
  assert.throws(() => deleteProjectDesignData(project, userData), /symbolic/);
  assert.equal(await fs.readFile(path.join(outside, "design/keep.json"), "utf8"), "do not delete");
  assert.ok(await fs.stat(path.join(legacy, "chats/chat.json")));
});

test("deletion never follows nested symlinks inside the design directory", async t => {
  const { root, project, userData, write } = await fixture(t);
  const outside = path.join(root, "outside");
  await write(path.join(outside, "keep.txt"), "keep");
  const data = ensureProjectDesignData(project, userData);
  await fs.symlink(outside, path.join(data, "linked"));
  deleteProjectDesignData(project, userData);
  assert.equal(await fs.readFile(path.join(outside, "keep.txt"), "utf8"), "keep");
});

test("deletion handles missing projects without recreating them and rejects active writes", async t => {
  const { project, userData, legacy, write } = await fixture(t);
  await write(path.join(legacy, "preview.json"), {});
  await fs.rmdir(project);
  deleteProjectDesignData(project, userData);
  await assert.rejects(fs.stat(project), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(legacy, "preview.json")), { code: "ENOENT" });
  await write(path.join(project, ".bingo/design/.write.lock"), {});
  await write(path.join(legacy, "preview.json"), {});
  assert.throws(() => deleteProjectDesignData(project, userData), /being written/);
  assert.ok(await fs.stat(path.join(legacy, "preview.json")));
});
