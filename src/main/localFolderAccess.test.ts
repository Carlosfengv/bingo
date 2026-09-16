import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { configureProjectAccess, getProjectExtraPaths, setProjectAccessMode, setProjectAllowedPaths } from "./projectAccess";
import { getAllowedLocalPaths, withPromptFolders } from "./promptFolders";
import { cancelAllApprovals, cancelApprovalsForChat, getProjectAllowedPaths, handleLocalFolders, handleLocalWrite, isExistingPathAllowed, mcpEvents, resolveFolderAccess } from "./mcpServer";

async function fixture(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-folder-flow-"));
  const project = path.join(directory, "project");
  const extra = path.join(directory, "extra");
  const attachment = path.join(directory, "attachment");
  await Promise.all([project, extra, attachment].map(dir => fs.mkdir(dir)));
  const roots = await Promise.all([project, extra, attachment].map(dir => fs.realpath(dir)));
  const options = { userDataRoot: path.join(directory, "app-data"), resolveProjectRoot: id => id === "project" ? roots[0] : null };
  configureProjectAccess(options);
  const prompts = [];
  const onPrompt = event => {
    prompts.push(event);
    resolveFolderAccess(event.requestId, false);
  };
  mcpEvents.on("local_access_needed", onPrompt);
  try {
    await run({ project: roots[0], extra: roots[1], attachment: roots[2], options, prompts });
  } finally {
    mcpEvents.off("local_access_needed", onPrompt);
    configureProjectAccess();
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("opened project reaches chat scope, terminal scope and local_folders before renderer synchronization", async () => {
  await fixture(async ({ project, prompts }) => {
    await fs.writeFile(path.join(project, "tokens.css"), ":root { --brand: red; }");
    for (let turn = 0; turn < 2; turn++) {
      assert.deepEqual(getAllowedLocalPaths("project", "chat"), [project]);
      assert.deepEqual(getProjectAllowedPaths("project"), [project]);
      const result = await handleLocalFolders("project", {}, "chat");
      assert.equal(result.isError, undefined);
      assert.ok(result.content[0].text.includes(project));
      assert.equal(await isExistingPathAllowed(path.join(project, "tokens.css"), "project", "chat"), true);
    }
    assert.equal(prompts.length, 0);
  });
});

test("restart restores extra folders without replacing the current project", async () => {
  await fixture(async ({ project, extra, options, prompts }) => {
    setProjectAllowedPaths("project", [extra]);
    configureProjectAccess(options);
    assert.deepEqual(getAllowedLocalPaths("project", "chat"), [project, extra]);
    assert.equal((await handleLocalFolders("project", {}, "chat")).isError, undefined);
    setProjectAllowedPaths("project", []);
    assert.deepEqual(getProjectAllowedPaths("project"), [project]);
    assert.equal(await isExistingPathAllowed(extra, "project", "chat"), false);
    assert.equal(prompts.length, 0);
  });
});

test("request attachments stay scoped to one chat and expire on failure", async () => {
  await fixture(async ({ project, attachment, prompts }) => {
    await assert.rejects(withPromptFolders("project", "chat", [attachment, project], async () => {
      assert.deepEqual(getAllowedLocalPaths("project", "chat"), [project, attachment]);
      assert.deepEqual(getAllowedLocalPaths("project", "other-chat"), [project]);
      assert.ok((await handleLocalFolders("project", {}, "chat")).content[0].text.includes(attachment));
      assert.equal(await isExistingPathAllowed(attachment, "project", "other-chat"), false);
      throw new Error("cancelled request");
    }), /cancelled request/);
    assert.deepEqual(getAllowedLocalPaths("project", "chat"), [project]);
    assert.deepEqual(getProjectExtraPaths("project"), []);
    assert.equal(prompts.length, 0);
  });
});

test("disabled access cannot be bypassed by attachments and does not request another folder", async () => {
  await fixture(async ({ attachment, prompts }) => {
    setProjectAccessMode("project", "disabled");
    await withPromptFolders("project", "chat", [attachment], async () => {
      assert.deepEqual(getAllowedLocalPaths("project", "chat"), []);
      const result = await handleLocalFolders("project", {}, "chat");
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /disabled/);
      assert.equal(await isExistingPathAllowed(attachment, "project", "chat"), false);
    });
    assert.equal(prompts.length, 0);
  });
});

test("read-only local folders are listed accurately without a permission prompt", async () => {
  await fixture(async ({ project, prompts }) => {
    setProjectAccessMode("project", "read-only");
    const result = await handleLocalFolders("project", {}, "chat");
    assert.match(result.content[0].text, /read-only/);
    assert.doesNotMatch(result.content[0].text, /read and write/);
    assert.equal(await isExistingPathAllowed(project, "project", "chat"), true);
    assert.equal(prompts.length, 0);
  });
});

test("unregistered ids and symlinks cannot grant access to arbitrary folders", async () => {
  await fixture(async ({ project, extra }) => {
    await fs.symlink(extra, path.join(project, "outside"));
    assert.deepEqual(getProjectAllowedPaths(project), []);
    assert.equal(await isExistingPathAllowed(extra, "project", "chat"), false);
    assert.equal(await isExistingPathAllowed(path.join(project, "outside"), "project", "chat"), false);
    assert.equal((await handleLocalFolders(project, {}, "chat")).isError, true);
  });
});

test("local writes use the current project while read-only and external writes remain blocked", async () => {
  await fixture(async ({ project, extra, prompts }) => {
    const file = path.join(project, "tokens.css");
    assert.equal((await handleLocalWrite("project", { file_path: file, content: "original" }, "chat")).isError, undefined);
    assert.equal(prompts.length, 0);
    setProjectAccessMode("project", "read-only");
    assert.equal((await handleLocalWrite("project", { file_path: file, content: "changed" }, "chat")).isError, true);
    assert.equal(await fs.readFile(file, "utf8"), "original");
    assert.equal(prompts.length, 0);
    setProjectAccessMode("project", "edit");
    const outside = path.join(extra, "tokens.css");
    assert.equal((await handleLocalWrite("project", { file_path: outside, content: "changed" }, "chat")).isError, true);
    assert.equal(prompts.length, 1);
    await assert.rejects(fs.stat(outside), { code: "ENOENT" });
  });
});

test("cancelling one chat leaves another chat's folder grant pending", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-folder-isolation-"));
  const project = path.join(directory, "project");
  const outside = path.join(directory, "outside");
  await Promise.all([fs.mkdir(project), fs.mkdir(outside)]);
  configureProjectAccess({ userDataRoot: path.join(directory, "app-data"), resolveProjectRoot: id => id === "project" ? project : null });
  const prompts = [];
  let promptsReady;
  const ready = new Promise(resolve => { promptsReady = resolve; });
  const onPrompt = event => {
    prompts.push(event);
    if (prompts.length === 2) promptsReady();
  };
  mcpEvents.on("local_access_needed", onPrompt);
  t.after(async () => {
    cancelAllApprovals();
    mcpEvents.off("local_access_needed", onPrompt);
    configureProjectAccess();
    await fs.rm(directory, { recursive: true, force: true });
  });

  let secondSettled = false;
  const first = handleLocalWrite("project", { file_path: path.join(outside, "first.txt"), content: "first" }, "chat-1");
  const second = handleLocalWrite("project", { file_path: path.join(outside, "second.txt"), content: "second" }, "chat-2");
  second.then(() => { secondSettled = true; });
  await ready;
  cancelApprovalsForChat("project", "chat-1");
  assert.equal((await first).isError, true);
  await Promise.resolve();
  assert.equal(secondSettled, false);
  resolveFolderAccess(prompts.find(event => event.chatTabId === "chat-2").requestId, false);
  assert.equal((await second).isError, true);
});
