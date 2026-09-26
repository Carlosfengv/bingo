import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { publishLocalModules, readLocalModuleBytes, stopLocalModuleServer, storeCompiledModule } from "./localModuleServer";
import { localProjectBuilderClient } from "../../packages/workspace/src/services/LocalProjectBuilderClient";
import { projectAssetUrl } from "../../packages/workspace/src/utils/projectAssetUrl";

after(() => stopLocalModuleServer());

test("compiled modules travel as short references and remain fetchable", async () => {
  const source = "export const answer = 42;";
  const codeUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const [ref] = await publishLocalModules("/project/one", [{ path: "src/Answer.tsx", codeUrl }]);
  assert.equal(ref.path, "src/Answer.tsx");
  assert.match(ref.codeUrl, /^http:\/\/127\.0\.0\.1:\d+\/module\//);
  assert.ok(ref.codeUrl.length < 180);
  const response = await fetch(ref.codeUrl);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.equal(await response.text(), source);
  const [same] = await publishLocalModules("/project/one", [{ path: "src/Answer.tsx", codeUrl }]);
  assert.equal(same.codeUrl, ref.codeUrl);
  assert.equal((await readLocalModuleBytes(ref.codeUrl)).toString(), source);
  const stored = await storeCompiledModule(Buffer.from(source));
  assert.equal(stored, ref.codeUrl);
  const [republished] = await publishLocalModules("/project/one", [{ path: "src/Answer.tsx", codeUrl: stored }]);
  assert.equal(republished.codeUrl, ref.codeUrl);
  const unknown = await fetch(ref.codeUrl.replace(/\.js$/, "0.js"));
  assert.equal(unknown.status, 404);
});

test("project images use the local asset server and cannot escape the project", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-project-assets-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-outside-assets-"));
  const previousWindow = globalThis.window;
  try {
    await fs.mkdir(path.join(root, "public", "assets"), { recursive: true });
    await fs.writeFile(path.join(root, "public", "assets", "image.png"), "image bytes");
    await fs.writeFile(path.join(outside, "secret.png"), "secret bytes");
    await fs.symlink(path.join(outside, "secret.png"), path.join(root, "public", "assets", "escape.png"));
    const [ref] = await publishLocalModules(root, [{ path: "App.tsx", codeUrl: `data:text/javascript;base64,${Buffer.from("export default null").toString("base64")}` }]);
    localProjectBuilderClient.projectId = root;
    localProjectBuilderClient.emit({ type: "modules:ready", payload: { modules: [ref] } });
    globalThis.window = { location: { search: "" } };
    const url = projectAssetUrl(root, "/assets/image.png");
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/asset\//);
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(await response.text(), "image bytes");
    assert.equal((await fetch(projectAssetUrl(root, "/assets/escape.png"))).status, 404);
    assert.equal((await fetch(url.replace(encodeURIComponent(root), encodeURIComponent(outside)))).status, 404);
  } finally {
    localProjectBuilderClient.projectId = null;
    localProjectBuilderClient.clearBootstrapEvents();
    globalThis.window = previousWindow;
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});
