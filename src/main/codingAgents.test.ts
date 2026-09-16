import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_IDS, AGENT_INFO, selectInstalledAgent, type AgentId } from "../shared/codingAgents";

function catalog(installed: AgentId[]) {
  return AGENT_IDS.map(agent => ({
    agent, displayName: AGENT_INFO[agent].name, installed: installed.includes(agent),
    installCommand: AGENT_INFO[agent].install, loginCommand: AGENT_INFO[agent].login,
  }));
}

test("a single installed agent is selected even when the old default is absent", () => {
  assert.equal(selectInstalledAgent(catalog(["codex"]), "claude"), "codex");
});

test("multiple installed agents preserve the user's saved preference", () => {
  assert.equal(selectInstalledAgent(catalog(["claude", "codex", "opencode"]), "opencode"), "opencode");
});

test("uninstalled and unsupported preferences fall back to an installed agent", () => {
  assert.equal(selectInstalledAgent(catalog(["opencode", "grok"]), "codex"), "opencode");
  assert.equal(selectInstalledAgent(catalog(["grok"]), "unknown"), "grok");
});

test("no installation leaves the selection empty instead of choosing Claude", () => {
  assert.equal(selectInstalledAgent(catalog([]), "claude"), null);
  assert.equal(selectInstalledAgent(catalog([]), undefined), null);
});

test("a removed agent falls back and becomes preferred again after reinstalling", () => {
  assert.equal(selectInstalledAgent(catalog(["claude", "codex"]), "codex"), "codex");
  assert.equal(selectInstalledAgent(catalog(["claude"]), "codex"), "claude");
  assert.equal(selectInstalledAgent(catalog(["claude", "codex"]), "codex"), "codex");
});
