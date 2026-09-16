export const AGENT_IDS = ["claude", "codex", "opencode", "grok"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export type AgentModel = {
  id: string;
  label: string;
  description?: string;
  provider?: string;
};

export const AGENT_INFO = {
  claude: {
    name: "Claude Code",
    command: "claude",
    install: "npm install -g @anthropic-ai/claude-code",
    login: "claude /login",
  },
  codex: {
    name: "Codex CLI",
    command: "codex",
    install: "npm install -g @openai/codex",
    login: "codex login",
  },
  opencode: {
    name: "OpenCode",
    command: "opencode",
    install: "curl -fsSL https://opencode.ai/install | bash",
    login: "opencode auth login",
  },
  grok: {
    name: "Grok Build",
    command: "grok",
    install: "curl -fsSL https://x.ai/cli/install.sh | bash",
    login: "grok login",
  },
} as const;

export function normalizeAgentId(value: unknown): AgentId {
  return AGENT_IDS.includes(value as AgentId) ? (value as AgentId) : "claude";
}

export type InstalledAgent = {
  agent: AgentId;
  displayName: string;
  installed: boolean;
  installCommand: string;
  loginCommand: string;
};

export function selectInstalledAgent(agents: InstalledAgent[], preferred: unknown): AgentId | null {
  return agents.find(entry => entry.agent === preferred && entry.installed)?.agent
    ?? agents.find(entry => entry.installed)?.agent
    ?? null;
}
