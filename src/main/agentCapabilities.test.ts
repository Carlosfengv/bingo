import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_IDS, supportsAskFirst } from "../shared/codingAgents";

test("only adapters with a live approval callback offer Ask first", () => {
  assert.deepEqual(AGENT_IDS.filter(supportsAskFirst), ["claude", "grok"]);
  assert.equal(supportsAskFirst(null), false);
});
