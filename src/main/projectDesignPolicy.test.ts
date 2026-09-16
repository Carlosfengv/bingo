import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { configureProjectDesignPolicy, readProjectDesignPolicy, writeProjectDesignPolicy } from "./projectDesignPolicy";

test("design storage policy is local to a project path and persists", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "bingo-design-policy-"));
  const userData = path.join(temp, "user-data");
  const project = path.join(temp, "project");
  await mkdir(project);
  configureProjectDesignPolicy({ userDataRoot: userData });

  assert.equal(readProjectDesignPolicy(project), null);
  assert.deepEqual(writeProjectDesignPolicy(project, "project"), { schemaVersion: 1, mode: "project" });
  assert.deepEqual(readProjectDesignPolicy(project), { schemaVersion: 1, mode: "project" });
  assert.deepEqual(writeProjectDesignPolicy(project, "app"), { schemaVersion: 1, mode: "app" });
  assert.deepEqual(readProjectDesignPolicy(project), { schemaVersion: 1, mode: "app" });

  const files = await import("node:fs/promises").then(async fs => fs.readdir(path.join(userData, "local-project-data"), { recursive: true }));
  const policy = files.find(file => String(file).endsWith("design-storage-policy.json"));
  assert.ok(policy);
  assert.match(await readFile(path.join(userData, "local-project-data", String(policy)), "utf8"), /\"mode\": \"app\"/);
});
