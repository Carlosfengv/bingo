import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { ensureProjectConfigIgnored, ensureProjectDesignIgnored, inspectProjectGit } from "./projectGitIgnore";

const execFileAsync = promisify(execFile);

test("design ignore works before Git init, preserves existing rules and is idempotent", async () => {
  await withDirectory(async root => {
    await fs.writeFile(path.join(root, ".gitignore"), "node_modules/\r\ndist/");
    await ensureProjectDesignIgnored(root);
    const content = await fs.readFile(path.join(root, ".gitignore"), "utf8");
    assert.ok(content.startsWith("node_modules/\r\ndist/\r\n"));
    assert.ok(content.includes("/.bingo/design/\r\n"));
    await initGit(root);
    assert.equal((await ensureProjectDesignIgnored(root)).changed, false);
    await execFileAsync("git", ["check-ignore", "-q", ".bingo/design/chats/chat.json"], { cwd: root });
  });
});

test("design ignore targets only the selected monorepo package", async () => {
  await withDirectory(async root => {
    await initGit(root);
    const project = path.join(root, "apps", "web");
    await fs.mkdir(project, { recursive: true });
    await ensureProjectDesignIgnored(project);
    await execFileAsync("git", ["check-ignore", "-q", "apps/web/.bingo/design/pages/a.json"], { cwd: root });
    await assert.rejects(execFileAsync("git", ["check-ignore", "-q", "apps/other/.bingo/design/pages/a.json"], { cwd: root }));
    await assert.rejects(fs.stat(path.join(root, ".gitignore")), { code: "ENOENT" });
  });
});

test("design ignore does not silently claim already tracked history is ignored", async () => {
  await withDirectory(async root => {
    await initGit(root);
    await fs.mkdir(path.join(root, ".bingo/design/chats"), { recursive: true });
    await fs.writeFile(path.join(root, ".bingo/design/chats/chat.json"), "{}");
    await execFileAsync("git", ["add", ".bingo/design"], { cwd: root });
    await assert.rejects(ensureProjectDesignIgnored(root), error => error.code === "IGNORE_NOT_EFFECTIVE");
    await assert.rejects(fs.stat(path.join(root, ".gitignore")), { code: "ENOENT" });
  });
});

async function withDirectory(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-git-ignore-"));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function initGit(root) {
  await execFileAsync("git", ["init", "-q"], { cwd: root });
}

test("reports a directory outside Git without creating files", async () => {
  await withDirectory(async (root) => {
    const status = await inspectProjectGit(root);
    assert.equal(status.status, "not-repository");
    await assert.rejects(fs.stat(path.join(root, ".gitignore")), { code: "ENOENT" });
  });
});

test("adds one precise ignore rule and is idempotent", async () => {
  await withDirectory(async (root) => {
    await initGit(root);
    const first = await ensureProjectConfigIgnored(root);
    assert.equal(first.changed, true);
    assert.equal((await inspectProjectGit(root)).status, "ignored");
    const content = await fs.readFile(path.join(root, ".gitignore"), "utf8");
    assert.equal(content, "# Bingo project configuration\n/.bingo/config.json\n");

    const second = await ensureProjectConfigIgnored(root);
    assert.equal(second.changed, false);
    assert.equal(await fs.readFile(path.join(root, ".gitignore"), "utf8"), content);
  });
});

test("preserves CRLF and an existing file without a final newline", async () => {
  await withDirectory(async (root) => {
    await initGit(root);
    await fs.writeFile(path.join(root, ".gitignore"), "node_modules/\r\ndist/");
    await ensureProjectConfigIgnored(root);
    const content = await fs.readFile(path.join(root, ".gitignore"), "utf8");
    assert.equal(content, "node_modules/\r\ndist/\r\n\r\n# Bingo project configuration\r\n/.bingo/config.json\r\n");
  });
});

test("does not claim an already tracked configuration can be ignored", async () => {
  await withDirectory(async (root) => {
    await initGit(root);
    await fs.mkdir(path.join(root, ".bingo"));
    await fs.writeFile(path.join(root, ".bingo/config.json"), "{}\n");
    await execFileAsync("git", ["add", ".bingo/config.json"], { cwd: root });
    await assert.rejects(
      ensureProjectConfigIgnored(root),
      (error) => error?.code === "IGNORE_NOT_EFFECTIVE" && /already tracked/.test(error.message),
    );
    await assert.rejects(fs.stat(path.join(root, ".gitignore")), { code: "ENOENT" });
  });
});

test("uses the selected subproject gitignore inside an ancestor repository", async () => {
  await withDirectory(async (root) => {
    await initGit(root);
    const app = path.join(root, "apps/web");
    await fs.mkdir(app, { recursive: true });
    await ensureProjectConfigIgnored(app);
    assert.equal(await fs.readFile(path.join(app, ".gitignore"), "utf8"), "# Bingo project configuration\n/.bingo/config.json\n");
    await assert.rejects(fs.stat(path.join(root, ".gitignore")), { code: "ENOENT" });
    assert.equal((await inspectProjectGit(app)).status, "ignored");
  });
});
