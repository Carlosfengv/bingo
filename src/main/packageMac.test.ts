import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { packageMac } from "../../tools/package-mac.mjs";

for (const fail of [false, true]) test(`Mac packaging removes temporary apps after ${fail ? "failure" : "success"}`, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-package-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outputDirectory = path.join(root, "release");
  await fs.mkdir(outputDirectory);
  await fs.writeFile(path.join(outputDirectory, "previous.dmg"), "preserve");
  let staging;
  const result = packageMac({ outputDirectory, temporaryDirectory: root, buildVersion: "20260916",
    builder: async args => {
      staging = args.find(arg => arg.startsWith("-c.directories.output=")).split("=")[1];
      assert.ok(path.basename(staging).startsWith(".bingo-package-"));
      assert.ok(args.includes("-c.buildVersion=20260916"));
      await fs.mkdir(path.join(staging, "mac-arm64", "Bingo.app"), { recursive: true });
      await fs.writeFile(path.join(staging, "new.dmg"), "dmg");
      await fs.writeFile(path.join(staging, "new.zip"), "zip");
      if (fail) throw new Error("build failed");
    } });
  if (fail) await assert.rejects(result, /build failed/);
  else assert.equal((await result).length, 2);
  await assert.rejects(fs.stat(staging), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(outputDirectory, "previous.dmg"), "utf8"), "preserve");
  assert.deepEqual((await fs.readdir(outputDirectory)).sort(), fail ? ["previous.dmg"] : ["new.dmg", "new.zip", "previous.dmg"]);
});
