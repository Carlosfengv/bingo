import assert from "node:assert/strict";
import test from "node:test";
import { AgentSideConnection, ClientSideConnection, PROTOCOL_VERSION, ndJsonStream } from "@agentclientprotocol/sdk";
import { grokClientHandlers } from "./agentRuntime";

test("Grok ACP permission requests reach Bingo decisions over the protocol", async () => {
  const clientToAgent = new TransformStream<Uint8Array, Uint8Array>();
  const agentToClient = new TransformStream<Uint8Array, Uint8Array>();
  const seen: unknown[] = [];
  const emitted: unknown[] = [];
  const outcomes: unknown[] = [];
  const decisions = [true, false, true];
  const client = new ClientSideConnection(() => grokClientHandlers({
    autoApprove: false,
    requestPermission: async (name, input) => {
      seen.push({ name, input });
      return decisions.shift() ?? false;
    },
    emit: event => emitted.push(event),
  }), ndJsonStream(clientToAgent.writable, agentToClient.readable));
  const agent = new AgentSideConnection(connection => ({
    initialize(params) {
      return { protocolVersion: params.protocolVersion, agentCapabilities: { loadSession: false }, authMethods: [] };
    },
    newSession() { return { sessionId: "test-grok-session" }; },
    authenticate() {},
    async prompt(params) {
      const persistentOnly = params.prompt[0]?.type === "text" && params.prompt[0].text === "persistent";
      const response = await connection.requestPermission({
        sessionId: params.sessionId,
        toolCall: {
          toolCallId: "write-source", title: "Write source", kind: "edit", status: "pending",
          content: [], rawInput: { file_path: "src/App.tsx" },
        },
        options: persistentOnly
          ? [{ kind: "allow_always", name: "Always allow", optionId: "always" }, { kind: "reject_always", name: "Always reject", optionId: "never" }]
          : [{ kind: "allow_once", name: "Allow once", optionId: "allow" }, { kind: "reject_once", name: "Reject once", optionId: "reject" }],
      });
      outcomes.push(response.outcome);
      await connection.sessionUpdate({
        sessionId: params.sessionId,
        update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "finished" } },
      });
      return { stopReason: "end_turn" };
    },
    cancel() {},
  }), ndJsonStream(agentToClient.writable, clientToAgent.readable));
  void agent;

  await client.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {}, clientInfo: { name: "Bingo test", version: "0" } });
  const session = await client.newSession({ cwd: process.cwd(), additionalDirectories: [], mcpServers: [] });
  for (const text of ["allow", "reject", "persistent"]) {
    await client.prompt({ sessionId: session.sessionId, prompt: [{ type: "text", text }] });
  }
  assert.deepEqual(outcomes, [
    { outcome: "selected", optionId: "allow" },
    { outcome: "selected", optionId: "reject" },
    { outcome: "cancelled" },
  ]);
  assert.deepEqual(seen, Array.from({ length: 3 }, () => ({ name: "Write source", input: { file_path: "src/App.tsx" } })));
  assert.deepEqual(emitted, Array.from({ length: 3 }, () => ({ type: "text", content: "finished" })));
});
