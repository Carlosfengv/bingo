import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyProjectConfiguration,
  inspectProjectConfiguration,
  prepareProjectConfiguration,
  projectConfigurationPaths,
  readEffectiveConfiguration,
  writeProjectConfiguration,
} from "./projectConfiguration";

const prototypeTheme = {
  version: 1,
  source: { kind: "tokens", file: "src/theme/tokens.json" },
  defaultThemeId: "light",
  themes: [
    { id: "light", label: "Light", colorScheme: "light", collectionModes: { colors: "light" } },
    { id: "dark", label: "Dark", colorScheme: "dark", collectionModes: { colors: "dark" } }
  ],
  systemMapping: { light: "light", dark: "dark" },
  adapter: { kind: "scoped-css" }
};

async function withFixture(run) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-config-"));
  const project = path.join(base, "project");
  const userData = path.join(base, "user-data");
  await fs.mkdir(project, { recursive: true });
  try {
    await run({ base, project, userData });
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
}

test("inspection is read-only and starts with an unselected local default", async () => {
  await withFixture(async ({ project, userData }) => {
    const result = await inspectProjectConfiguration(project, userData);
    assert.equal(result.mode, "unselected");
    assert.equal(result.initializationRequired, true);
    assert.deepEqual(result.settings.iconLibraries, []);
    assert.deepEqual(await fs.readdir(project), []);
    await assert.rejects(fs.stat(userData), { code: "ENOENT" });
  });
});

test("creates project configuration without changing gitignore when sharing is selected", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, {
      mode: "project",
      gitPreference: "unchanged",
      initialPatch: { iconLibraries: ["lucide-react", "lucide-react"] },
    });
    assert.equal(prepared.files.length, 1);
    const applied = await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "test-share" });
    assert.equal(applied.mode, "project");
    assert.deepEqual(applied.settings.iconLibraries, ["lucide-react"]);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(project, ".bingo/config.json"), "utf8")), {
      schemaVersion: 1,
      iconLibraries: ["lucide-react"],
    });
    await assert.rejects(fs.stat(path.join(project, ".gitignore")), { code: "ENOENT" });
  });
});

test("can keep configuration in app data without touching the project", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, {
      mode: "app",
      initialPatch: { iconLibraries: ["@phosphor-icons/react"] },
    });
    await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "test-local" });
    assert.deepEqual(await fs.readdir(project), []);
    const effective = readEffectiveConfiguration(project, userData);
    assert.equal(effective.mode, "app");
    assert.deepEqual(effective.settings.iconLibraries, ["@phosphor-icons/react"]);
  });
});

test("persists prototype themes in project and app storage without losing icon settings", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, {
      mode: "project",
      gitPreference: "unchanged",
      initialPatch: { iconLibraries: ["lucide-react"], prototypeTheme }
    });
    const applied = await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "theme-project" });
    assert.deepEqual(applied.settings.prototypeTheme, prototypeTheme);
    assert.deepEqual(applied.settings.iconLibraries, ["lucide-react"]);

    const updated = { ...prototypeTheme, defaultThemeId: "dark" };
    await writeProjectConfiguration(project, userData, { prototypeTheme: updated }, applied.revision);
    const effective = readEffectiveConfiguration(project, userData);
    assert.equal(effective.settings.prototypeTheme.defaultThemeId, "dark");
    assert.deepEqual(effective.settings.iconLibraries, ["lucide-react"]);
  });
});

test("rejects invalid prototype theme configuration", async () => {
  await withFixture(async ({ project, userData }) => {
    await assert.rejects(
      prepareProjectConfiguration(project, userData, {
        mode: "app",
        initialPatch: { prototypeTheme: { ...prototypeTheme, defaultThemeId: "missing" } }
      }),
      error => error?.code === "CONFIG_INVALID"
    );
  });
});

test("removes prototype theme without retaining the old project field", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, {
      mode: "project",
      gitPreference: "unchanged",
      initialPatch: { prototypeTheme }
    });
    const applied = await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "theme-remove-init" });
    await writeProjectConfiguration(project, userData, { prototypeTheme: null }, applied.revision);
    const written = JSON.parse(await fs.readFile(path.join(project, ".bingo/config.json"), "utf8"));
    assert.equal("prototypeTheme" in written, false);
    assert.equal("prototypeTheme" in readEffectiveConfiguration(project, userData).settings, false);
  });
});

test("discovers a checked-in configuration without writing a policy", async () => {
  await withFixture(async ({ project, userData }) => {
    await fs.mkdir(path.join(project, ".bingo"));
    await fs.writeFile(path.join(project, ".bingo/config.json"), JSON.stringify({
      schemaVersion: 1,
      iconLibraries: ["lucide-react"],
      futureField: { keep: true },
    }));
    const effective = readEffectiveConfiguration(project, userData);
    assert.equal(effective.mode, "project");
    assert.equal(effective.source, "discovered");
    assert.deepEqual(effective.settings, { iconLibraries: ["lucide-react"] });
    await writeProjectConfiguration(project, userData, { iconLibraries: ["react-icons/fa"] }, effective.revision);
    const written = JSON.parse(await fs.readFile(path.join(project, ".bingo/config.json"), "utf8"));
    assert.deepEqual(written.futureField, { keep: true });
    assert.deepEqual(written.iconLibraries, ["react-icons/fa"]);
  });
});

test("refuses to overwrite invalid or unsupported project configuration", async () => {
  await withFixture(async ({ project, userData }) => {
    await fs.mkdir(path.join(project, ".bingo"));
    await fs.writeFile(path.join(project, ".bingo/config.json"), "{ broken");
    assert.throws(() => readEffectiveConfiguration(project, userData), (error) => error?.code === "CONFIG_INVALID");
    await fs.writeFile(path.join(project, ".bingo/config.json"), JSON.stringify({ schemaVersion: 2, iconLibraries: [] }));
    assert.throws(() => readEffectiveConfiguration(project, userData), (error) => error?.code === "CONFIG_VERSION_UNSUPPORTED");
  });
});

test("invalidates a prepared plan when the target changes", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, { mode: "project", gitPreference: "unchanged" });
    await fs.mkdir(path.join(project, ".bingo"));
    await fs.writeFile(path.join(project, ".bingo/config.json"), JSON.stringify({ schemaVersion: 1, iconLibraries: ["external"] }));
    await assert.rejects(
      applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "conflict" }),
      (error) => error?.code === "CONFIG_CONFLICT",
    );
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(project, ".bingo/config.json"), "utf8")).iconLibraries, ["external"]);
  });
});

test("requires initialization before a compatibility settings write", async () => {
  await withFixture(async ({ project, userData }) => {
    await assert.rejects(
      writeProjectConfiguration(project, userData, { iconLibraries: ["lucide-react"] }),
      (error) => error?.code === "CONFIG_INITIALIZATION_REQUIRED",
    );
    assert.deepEqual(await fs.readdir(project), []);
  });
});

test("does not follow a symbolic .bingo directory", async (t) => {
  if (process.platform === "win32") return t.skip("symbolic link permissions vary on Windows");
  await withFixture(async ({ base, project, userData }) => {
    const outside = path.join(base, "outside");
    await fs.mkdir(outside);
    await fs.symlink(outside, path.join(project, ".bingo"), "dir");
    const prepared = await prepareProjectConfiguration(project, userData, { mode: "project", gitPreference: "unchanged" });
    await assert.rejects(
      applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "symlink" }),
      (error) => error?.code === "PATH_UNSAFE",
    );
    assert.deepEqual(await fs.readdir(outside), []);
  });
});

test("replays a completed operation without writing the files again", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, {
      mode: "project",
      gitPreference: "unchanged",
      initialPatch: { iconLibraries: ["lucide-react"] },
    });
    const operationId = "stable-operation";
    const first = await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId });
    const before = await fs.stat(path.join(project, ".bingo/config.json"));
    const replay = await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId });
    const after = await fs.stat(path.join(project, ".bingo/config.json"));
    assert.equal(first.success, true);
    assert.equal(replay.replayed, true);
    assert.equal(after.mtimeMs, before.mtimeMs);
  });
});

test("honors a live project lock and recovers one whose process is gone", async () => {
  await withFixture(async ({ project, userData }) => {
    const prepared = await prepareProjectConfiguration(project, userData, { mode: "project", gitPreference: "unchanged" });
    await applyProjectConfiguration(project, userData, { planId: prepared.planId, operationId: "initialize-lock-test" });
    const lock = path.join(project, ".bingo/.config-write.lock");
    await fs.writeFile(lock, JSON.stringify({ pid: process.pid, token: "other-live-process" }));
    await assert.rejects(
      writeProjectConfiguration(project, userData, { iconLibraries: ["blocked"] }),
      (error) => error?.code === "WRITE_IN_PROGRESS",
    );
    await fs.writeFile(lock, JSON.stringify({ pid: 99999999, token: "stale-process" }));
    await writeProjectConfiguration(project, userData, { iconLibraries: ["saved"] });
    assert.deepEqual(readEffectiveConfiguration(project, userData).settings.iconLibraries, ["saved"]);
    await assert.rejects(fs.stat(lock), { code: "ENOENT" });
  });
});

test("reports a recoverable transaction left by an interrupted change", async () => {
  await withFixture(async ({ project, userData }) => {
    const paths = projectConfigurationPaths(project, userData);
    await fs.mkdir(paths.appDataDir, { recursive: true });
    await fs.writeFile(paths.transaction, JSON.stringify({
      schemaVersion: 1,
      operationId: "interrupted",
      mode: "project",
      phase: "ignore-written",
    }));
    const inspected = await inspectProjectConfiguration(project, userData);
    assert.equal(inspected.issues[0].code, "MIGRATION_INCOMPLETE");
    assert.equal(inspected.issues[0].transaction.operationId, "interrupted");
  });
});
