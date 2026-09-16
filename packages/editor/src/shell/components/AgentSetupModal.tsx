import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";

const DETAILS = {
  claude: { name: "Claude Code", install: "npm install -g @anthropic-ai/claude-code", login: "claude /login" },
  codex: { name: "Codex CLI", install: "npm install -g @openai/codex", login: "codex login" },
  opencode: { name: "OpenCode", install: "curl -fsSL https://opencode.ai/install | bash", login: "opencode auth login" },
  grok: { name: "Grok Build", install: "curl -fsSL https://x.ai/cli/install.sh | bash", login: "grok login" },
};

function AgentSetupModal({ agent = "claude", status, open, onOpenChange, onRefresh }) {
  const { t } = useTranslation("editor");
  const detail = DETAILS[agent] || DETAILS.claude;
  const command = status?.installed ? (status?.loginCommand || detail.login) : (status?.installCommand || detail.install);
  const copy = () => navigator.clipboard?.writeText(command).catch(() => {});
  return <Dialog open={open} onOpenChange={onOpenChange}>{<DialogContent className="max-w-lg">{<DialogHeader>{<DialogTitle>{t("chat.setupAgentTitle", { name: detail.name })}</DialogTitle>}{<DialogDescription>{t("chat.setupAgentDescription")}</DialogDescription>}</DialogHeader>}{<div className="flex flex-col gap-4">{<div className="rounded-md border border-ed-border bg-ed-muted/30 p-3 font-mono text-xs break-all">{command}</div>}{<Text$4 as="div" size="2xs" variant="tertiary">{t("chat.setupAgentInstructions")}</Text$4>}{<div className="flex gap-2">{<Button size="sm" onClick={copy}>{t("chat.copyCommand")}</Button>}{<Button size="sm" variant="outline" onClick={onRefresh}>{t("chat.checkAgain")}</Button>}</div>}</div>}</DialogContent>}</Dialog>;
}

export { AgentSetupModal };
