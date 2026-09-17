import assert from "node:assert/strict";
import test from "node:test";

import { prepareInAppDesignSkill, registerMcpChatSession } from "./mcpServer";

test("each in-app chat run receives the design skill and cleans up independently", async () => {
  const projectId = "/tmp/bingo-design-skill-project";
  const chatTabId = "chat-design-lifecycle";
  const unregisterFirst = registerMcpChatSession(projectId, chatTabId, "run-first");
  const first = await prepareInAppDesignSkill(projectId, chatTabId, "run-first");
  assert.match(first, /Loaded Bingo skill: bingo-design/);
  assert.match(first, /# Designing on the Bingo canvas/);

  const unregisterSecond = registerMcpChatSession(projectId, chatTabId, "run-second");
  unregisterFirst();
  await assert.rejects(
    prepareInAppDesignSkill(projectId, chatTabId, "run-first"),
    error => error?.code === "DESIGN_SKILL_UNAVAILABLE"
  );
  assert.match(await prepareInAppDesignSkill(projectId, chatTabId, "run-second"), /bingo-design/);

  unregisterSecond();
  await assert.rejects(
    prepareInAppDesignSkill(projectId, chatTabId, "run-second"),
    error => error?.code === "DESIGN_SKILL_UNAVAILABLE"
  );
});

test("a repeated cleanup from an older run cannot unregister a newer run", async () => {
  const projectId = "/tmp/bingo-design-skill-project-cleanup";
  const chatTabId = "chat-design-cleanup";
  const unregisterOld = registerMcpChatSession(projectId, chatTabId, "run-old");
  unregisterOld();

  const unregisterNew = registerMcpChatSession(projectId, chatTabId, "run-new");
  unregisterOld();
  assert.match(await prepareInAppDesignSkill(projectId, chatTabId, "run-new"), /bingo-design/);

  unregisterNew();
});
