export const BINGO_MCP_SERVER_NAME = "bingo";
export const BINGO_MCP_TOOL_PREFIX = `mcp__${BINGO_MCP_SERVER_NAME}__`;

export function bingoToolName(name: unknown): string | null {
  const value = String(name);
  return value.startsWith(BINGO_MCP_TOOL_PREFIX)
    ? value.slice(BINGO_MCP_TOOL_PREFIX.length)
    : null;
}
