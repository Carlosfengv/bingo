import assert from "node:assert/strict";
import test from "node:test";

import { BINGO_MCP_TOOL_PREFIX, bingoToolName } from "./brand";

test("Bingo MCP tool names use only the Bingo server prefix", () => {
  assert.equal(BINGO_MCP_TOOL_PREFIX, "mcp__bingo__");
  assert.equal(bingoToolName("mcp__bingo__canvas_add"), "canvas_add");
  assert.equal(bingoToolName("canvas_add"), null);
  assert.equal(bingoToolName("mcp__other__canvas_add"), null);
});
