import assert from "node:assert/strict";
import test from "node:test";
import { resolveAcpPermission } from "./agentPermission";

const request = {
  toolCall: { title: "Write source", rawInput: { path: "src/App.tsx" } },
  options: [
    { kind: "allow_once", optionId: "yes" },
    { kind: "reject_once", optionId: "no" },
  ],
};

test("ACP ask mode waits for approval and selects only the requested outcome", async () => {
  let seen;
  let approve!: (value: boolean) => void;
  const pending = new Promise<boolean>(resolve => { approve = resolve; });
  const result = resolveAcpPermission(request, false, async (name, input) => {
    seen = { name, input };
    return pending;
  });
  await Promise.resolve();
  assert.deepEqual(seen, { name: "Write source", input: { path: "src/App.tsx" } });
  approve(true);
  assert.deepEqual(await result, { outcome: { outcome: "selected", optionId: "yes" } });
  assert.deepEqual(await resolveAcpPermission(request, false, async () => false),
    { outcome: { outcome: "selected", optionId: "no" } });
});

test("ACP permission failure and absent choices cancel safely", async () => {
  assert.deepEqual(await resolveAcpPermission(request, false, async () => { throw Error("closed"); }),
    { outcome: { outcome: "selected", optionId: "no" } });
  assert.deepEqual(await resolveAcpPermission({ options: [] }, true), { outcome: { outcome: "cancelled" } });
});

test("ACP ask mode never turns a one-time user decision into a persistent permission", async () => {
  const persistentOnly = {
    ...request,
    options: [
      { kind: "allow_always", optionId: "always-yes" },
      { kind: "reject_always", optionId: "always-no" },
    ],
  };
  assert.deepEqual(await resolveAcpPermission(persistentOnly, false, async () => true),
    { outcome: { outcome: "cancelled" } });
  assert.deepEqual(await resolveAcpPermission(persistentOnly, false, async () => false),
    { outcome: { outcome: "cancelled" } });
  assert.deepEqual(await resolveAcpPermission(persistentOnly, true),
    { outcome: { outcome: "selected", optionId: "always-yes" } });
});
