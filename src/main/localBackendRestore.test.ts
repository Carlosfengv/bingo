import assert from "node:assert/strict";
import test from "node:test";
import { createLocalBackend } from "../../packages/workspace/src/backends/LocalBackend";

test("version history keeps the opening source hash until the user reloads", async () => {
  let diskHash = "opened-hash";
  const restoreAttempts: any[] = [];
  const previousWindow = globalThis.window;
  (globalThis as any).window = {
    api: {
      async invoke(_channel: string, payload: any) {
        if (payload.op === "file-versions") return [{ id: "old-version", filename: "old-version" }];
        if (payload.op === "read-file-snapshot") return { content: "current source", hash: diskHash };
        if (payload.op === "restore-file-version") {
          restoreAttempts.push(payload);
          if (payload.expectedHash !== diskHash) throw new Error("SOURCE_CONFLICT");
          diskHash = "restored-hash";
          return { success: true, hash: diskHash };
        }
        throw new Error(`Unexpected operation: ${payload.op}`);
      },
    },
  };
  try {
    const backend = createLocalBackend("/project");
    await backend.listFileVersions("App", "src/App.tsx");
    diskHash = "agent-hash";
    await assert.rejects(backend.restoreFileVersion("App", "old-version", "src/App.tsx"), /SOURCE_CONFLICT/);
    assert.equal(restoreAttempts[0].expectedHash, "opened-hash");
    await backend.readFileSnapshot("src/App.tsx");
    assert.equal((await backend.restoreFileVersion("App", "old-version", "src/App.tsx")).success, true);
    assert.equal(restoreAttempts[1].expectedHash, "agent-hash");
  } finally {
    (globalThis as any).window = previousWindow;
  }
});
