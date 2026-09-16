/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/constants/agentPaths.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ClaudeIcon, McpIcon } from "@bingo/ui";

/**
* Claude Code path copy on the desktop dashboard once the CLI check has resolved: the card
* knows the state, so it says what is true and what to do next instead of the generic line.
*/
var CLAUDE_STATE_COPY = {
  connected: {
    description: "Chat on the canvas. Claude Code is installed on your computer, so Bingo is connected and uses your own subscription."
  },
  notLoggedIn: {
    description: "Chat on the canvas. Claude Code is installed but not logged in. Log in with your Anthropic account and Bingo connects automatically.",
    action: "Log in to Claude Code"
  },
  notInstalled: {
    description: "Chat on the canvas. Install the Claude Code CLI on your computer and Bingo connects automatically, using your own subscription.",
    action: "Install Claude Code"
  }
};
/**
* The two ways to work with an agent in Bingo. Shown in the onboarding intro step
* (informational) and on the dashboard's "Connect an agent" card (with setup actions), so
* the copy lives in one place.
*/
var AGENT_PATHS = [{
  id: "claude",
  title: "Claude Code in Bingo",
  description: "Chat on the canvas. When the Claude Code CLI is installed on your computer, Bingo connects to it automatically and uses your own subscription.",
  webDescription: "Chat on the canvas. The desktop app connects automatically to the Claude Code CLI installed on your computer, using your own subscription.",
  Icon: ClaudeIcon
}, {
  id: "mcp",
  title: "MCP",
  description: "Connect Claude Code, Codex, Cursor, or any other agent that supports MCP, and control Bingo from the tools you already use.",
  webDescription: "Connect Claude Code, Codex, Cursor, or any other agent that supports MCP. The MCP server runs inside the desktop app on your computer, so connect from there.",
  Icon: McpIcon
}];

export { AGENT_PATHS, CLAUDE_STATE_COPY };
