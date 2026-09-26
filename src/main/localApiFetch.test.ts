import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { projectApiPath } from "./projectApiPath";

test("the local API routes files, pages and settings to a registered special-character project", async () => {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "bingo-api-path-")));
  const project = path.join(base, "files", "pages % # 中文");
  const data = path.join(base, "user-data");
  await fs.mkdir(path.join(project, "src"), { recursive: true });
  await fs.mkdir(data);
  await fs.writeFile(path.join(project, "src", "App.tsx"), "export default function App() { return null }\n");
  await fs.writeFile(path.join(data, "local-projects.json"), JSON.stringify([
    { id: project, rootPath: project, canonicalRoot: project, name: "Special path" },
  ]));

  const load = createRequire(path.join(process.cwd(), "src/main/localApiFetch.test.ts"));
  const fsSync = load("node:fs");
  const originalWatch = fsSync.watch;
  fsSync.watch = () => ({ close() {}, on() { return this; } });
  const electronId = load.resolve("electron");
  const previous = load.cache[electronId];
  load.cache[electronId] = {
    id: electronId, filename: electronId, loaded: true,
    exports: { app: { getPath: () => data }, BrowserWindow: { getAllWindows: () => [] }, dialog: {}, ipcMain: {} },
  } as any;
  try {
    load("./projectAccess.ts").configureProjectAccess({
      userDataRoot: data,
      resolveProjectRoot: (id: string) => id === project ? project : null,
    });
    const { localApiFetch } = load("./localApiFetch.ts");
    const file = await localApiFetch(projectApiPath(project, "/files/by-path?path=src%2FApp.tsx"));
    assert.equal(file.status, 200, JSON.stringify(await file.json()));
    const opened = await file.json();
    assert.match(opened.content, /return null/);
    const same = await localApiFetch(projectApiPath(project, `/files/${opened.id}`), {
      method: "PATCH", body: JSON.stringify({ content: opened.content, expectedHash: opened.hash }),
    });
    assert.equal(same.status, 200);
    assert.deepEqual({ changed: (await same.json()).changed, hash: (await same.json()).hash },
      { changed: false, hash: opened.hash });
    const changed = await localApiFetch(projectApiPath(project, `/files/${opened.id}`), {
      method: "PATCH", body: JSON.stringify({ content: `${opened.content}// changed\n`, expectedHash: opened.hash }),
    });
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).changed, true);
    assert.notEqual((await changed.json()).hash, opened.hash);

    const pages = await localApiFetch(projectApiPath(project, "/pages"));
    assert.equal(pages.status, 200);
    assert.ok(Array.isArray(await pages.json()));

    const settings = await localApiFetch(projectApiPath(project, "/settings"));
    assert.equal(settings.status, 200);
    assert.ok(Array.isArray((await settings.json()).iconLibraries));

    assert.equal((await localApiFetch(projectApiPath(path.join(base, "unregistered"), "/settings"))).status, 404);
    assert.equal((await localApiFetch(`/projects/${project}/settings`)).status, 400);
    assert.equal((await localApiFetch("/projects/%ZZ/settings")).status, 400);
  } finally {
    fsSync.watch = originalWatch;
    if (previous) load.cache[electronId] = previous;
    else delete load.cache[electronId];
    await fs.rm(base, { recursive: true, force: true });
  }
});
