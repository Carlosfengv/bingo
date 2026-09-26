import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { beginProjectRegistration, recoverProjectRegistrations } from "./projectRegistrationTransaction";

async function fixture(run: (project: string, userData: string) => Promise<void>) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-registration-"));
  const project = path.join(base, "project");
  const userData = path.join(base, "app");
  await fs.mkdir(project);
  try { await run(await fs.realpath(project), userData); }
  finally { await fs.rm(base, { recursive: true, force: true }); }
}

test("failed registration restores only its Git rule, stamp and untouched new design", async () => {
  await fixture(async (project, userData) => {
    const ignore = path.join(project, ".gitignore");
    const original = Buffer.from("dist/\r\n");
    await fs.writeFile(ignore, original);
    const transaction = beginProjectRegistration(userData, project, () => false);
    const writtenContent = "dist/\r\n/.bingo/design/\r\n";
    transaction.recordIgnore({ previousBytes: original, writtenContent });
    await fs.writeFile(ignore, writtenContent);
    const design = path.join(project, ".bingo", "design");
    await fs.mkdir(design, { recursive: true });
    await fs.writeFile(path.join(design, "manifest.json"), "{}\n");
    transaction.recordDesign();
    const stamp = Buffer.from('{"id":"project"}\n');
    transaction.recordStamp(stamp);
    await fs.writeFile(path.join(design, "project.json"), stamp);
    transaction.rollback();
    assert.deepEqual(await fs.readFile(ignore), original);
    await assert.rejects(fs.stat(design), { code: "ENOENT" });
  });
});

test("registration recovery preserves later user edits and leaves an actionable journal", async () => {
  await fixture(async (project, userData) => {
    const ignore = path.join(project, ".gitignore");
    const transaction = beginProjectRegistration(userData, project, () => false);
    transaction.recordIgnore({ previousBytes: null, writtenContent: "/.bingo/design/\n" });
    await fs.writeFile(ignore, "/.bingo/design/\nuser-rule/\n");
    assert.throws(() => transaction.rollback(), /needs review/);
    assert.match(await fs.readFile(ignore, "utf8"), /user-rule/);
    assert.throws(() => beginProjectRegistration(userData, project, () => false), /needs review/);
  });
});

test("registration recovery does not delete new design data when a user adds a file or directory", async () => {
  await fixture(async (project, userData) => {
    const transaction = beginProjectRegistration(userData, project, () => false);
    const design = path.join(project, ".bingo", "design");
    await fs.mkdir(design, { recursive: true });
    await fs.writeFile(path.join(design, "manifest.json"), "{}\n");
    transaction.recordDesign();
    await fs.mkdir(path.join(design, "user-created"));
    assert.throws(() => transaction.rollback(), /needs review/);
    assert.equal((await fs.stat(path.join(design, "user-created"))).isDirectory(), true);
  });
});

test("an interrupted design write removes only recorded new files and empty directories", async () => {
  await fixture(async (project, userData) => {
    const transaction = beginProjectRegistration(userData, project, () => false);
    const design = path.join(project, ".bingo", "design");
    const page = path.join(design, "pages", "page.json");
    const bytes = Buffer.from("{\"id\":\"page\"}\n");
    transaction.recordCreatedFile(page, bytes);
    await fs.mkdir(path.dirname(page), { recursive: true });
    await fs.writeFile(page, bytes);
    transaction.recordCreatedFile(path.join(design, "manifest.json"), Buffer.from("{}\n"));
    transaction.rollback();
    await assert.rejects(fs.stat(design), { code: "ENOENT" });
  });
});

test("an interrupted design write preserves files changed after registration", async () => {
  await fixture(async (project, userData) => {
    const transaction = beginProjectRegistration(userData, project, () => false);
    const file = path.join(project, ".bingo", "design", "manifest.json");
    transaction.recordCreatedFile(file, Buffer.from("{}\n"));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{\"edited\":true}\n");
    assert.throws(() => transaction.rollback(), /needs review/);
    assert.equal(await fs.readFile(file, "utf8"), "{\"edited\":true}\n");
  });
});

test("an interrupted design write preserves unrecorded user files", async () => {
  await fixture(async (project, userData) => {
    const transaction = beginProjectRegistration(userData, project, () => false);
    const design = path.join(project, ".bingo", "design");
    const file = path.join(design, "manifest.json");
    transaction.recordCreatedFile(file, Buffer.from("{}\n"));
    await fs.mkdir(design, { recursive: true });
    await fs.writeFile(file, "{}\n");
    await fs.writeFile(path.join(design, "user.json"), "keep\n");
    assert.throws(() => transaction.rollback(), /needs review/);
    assert.equal(await fs.readFile(file, "utf8"), "{}\n");
    assert.equal(await fs.readFile(path.join(design, "user.json"), "utf8"), "keep\n");
  });
});

test("registration rollback never follows a later symbolic link to delete a recorded file", async () => {
  await fixture(async (project, userData) => {
    const design = path.join(project, ".bingo", "design");
    const outside = path.join(path.dirname(project), "outside");
    await fs.mkdir(design, { recursive: true });
    await fs.mkdir(outside);
    const target = path.join(outside, "page.json");
    await fs.writeFile(target, "{}\n");
    const transaction = beginProjectRegistration(userData, project, () => false);
    transaction.recordCreatedFile(path.join(design, "pages", "page.json"), Buffer.from("{}\n"));
    await fs.symlink(outside, path.join(design, "pages"));
    assert.throws(() => transaction.rollback(), /needs review/);
    assert.equal(await fs.readFile(target, "utf8"), "{}\n");
  });
});

test("registration recovery removes a dead design lock before cleaning its files", async () => {
  await fixture(async (project, userData) => {
    const transaction = beginProjectRegistration(userData, project, () => false);
    const design = path.join(project, ".bingo", "design");
    const file = path.join(design, "manifest.json");
    transaction.recordCreatedFile(file, Buffer.from("{}\n"));
    await fs.mkdir(design, { recursive: true });
    await fs.writeFile(file, "{}\n");
    await fs.writeFile(path.join(design, ".write.lock"), JSON.stringify({ token: crypto.randomUUID(), pid: 2147483647, hostname: os.hostname() }));
    transaction.rollback();
    await assert.rejects(fs.stat(design), { code: "ENOENT" });
  });
});

test("intent recorded before a write can be recovered after a crashed owner", async () => {
  await fixture(async (project, userData) => {
    const ignore = path.join(project, ".gitignore");
    const original = Buffer.from("node_modules/\n");
    await fs.writeFile(ignore, original);
    const transaction = beginProjectRegistration(userData, project, () => false);
    transaction.recordIgnore({ previousBytes: original, writtenContent: "node_modules/\n/.bingo/design/\n" });
    const file = path.join(userData, "project-registration", `${crypto.createHash("sha256").update(await fs.realpath(project)).digest("hex")}.json`);
    const journal = JSON.parse(await fs.readFile(file, "utf8"));
    await fs.writeFile(file, JSON.stringify({ ...journal, ownerPid: 2147483647 }));
    recoverProjectRegistrations(userData, () => false);
    assert.deepEqual(await fs.readFile(ignore), original);
    await assert.rejects(fs.stat(file), { code: "ENOENT" });
    // The transaction object belongs to the simulated dead process.
  });
});

test("a committed registration keeps its prepared files when recovering its journal", async () => {
  await fixture(async (project, userData) => {
    let registered = false;
    const transaction = beginProjectRegistration(userData, project, () => registered);
    transaction.recordIgnore({ previousBytes: null, writtenContent: "/.bingo/design/\n" });
    await fs.writeFile(path.join(project, ".gitignore"), "/.bingo/design/\n");
    registered = true;
    transaction.rollback();
    assert.equal(await fs.readFile(path.join(project, ".gitignore"), "utf8"), "/.bingo/design/\n");
  });
});
