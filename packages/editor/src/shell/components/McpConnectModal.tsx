/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/McpConnectModal.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Badge, Button, CaretDownIcon, CaretRightIcon, CheckIcon, CopyIcon, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, McpIcon, ScrollArea, SimpleTabs, SpinnerIcon, Tabs, TabsContent, TabsTrigger, Text$4, XIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

var MCP_SERVER_NAME = "bingo";
var MCP_DISPLAY_NAME = "Bingo";
function buildClaudeCliCommand(url) {
  return `claude mcp add --scope user --transport http ${MCP_SERVER_NAME} ${url}`;
}
function buildCodexCliCommand(url) {
  return `codex mcp add ${MCP_SERVER_NAME} --url ${url}`;
}
function buildCursorMcpJson(url) {
  return JSON.stringify({
    mcpServers: {
      [MCP_SERVER_NAME]: {
        url
      }
    }
  }, null, 2);
}
function buildOtherClientServerUrlJson(url) {
  return JSON.stringify({
    mcpServers: {
      [MCP_SERVER_NAME]: {
        serverUrl: url
      }
    }
  }, null, 2);
}
function buildMcpRemoteBridgeJson(url) {
  return JSON.stringify({
    mcpServers: {
      [MCP_SERVER_NAME]: {
        command: "npx",
        args: ["mcp-remote", url]
      }
    }
  }, null, 2);
}
function buildCodexToml(url) {
  return `[mcp_servers.${MCP_SERVER_NAME}]
url = "${url}"
enabled = true
`;
}
function CopyBlock(t0) {
  const $ = (0, import_compiler_runtime.c)(11);
  const { t } = useTranslation("editor");
  const {
    value
  } = t0;
  const [copied, setCopied] = (0, import_react.useState)(false);
  let t1;
  if (true) {
    t1 = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(t("mcp.copiedToast"));
        setTimeout(() => setCopied(false), 2e3);
      } catch {
        toast.error(t("mcp.copyFailed"));
      }
    };
    $[0] = value;
    $[1] = t1;
  } else t1 = $[1];
  const copy = t1;
  let t2;
  if ($[2] !== value) {
    t2 = <ScrollArea horizontal={true} className="rounded-[5px] border border-ed-field-border bg-ed-field shadow-ed-control" viewportClassName="py-2 pr-9 pl-2.5">{<pre className="whitespace-pre font-mono text-[11px] leading-4 text-ed-foreground">{value}</pre>}</ScrollArea>;
    $[2] = value;
    $[3] = t2;
  } else t2 = $[3];
  const t3 = t(copied ? "mcp.copied" : "mcp.copy");
  const t4 = copied ? CheckIcon : CopyIcon;
  let t5;
  if ($[4] !== copy || $[5] !== t3 || $[6] !== t4) {
    t5 = <Button type="button" size="icon-xs" variant="outline" className="absolute top-1 right-1" aria-label={t3} LeftIcon={t4} onClick={copy} />;
    $[4] = copy;
    $[5] = t3;
    $[6] = t4;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== t2 || $[9] !== t5) {
    t6 = <div className="relative">{t2}{t5}</div>;
    $[8] = t2;
    $[9] = t5;
    $[10] = t6;
  } else t6 = $[10];
  return t6;
}
function InlineCode(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    children
  } = t0;
  let t1;
  if ($[0] !== children) {
    t1 = <code className="rounded-[3px] bg-ed-muted px-1 py-px font-mono text-[11px] text-ed-foreground">{children}</code>;
    $[0] = children;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function SetupStep(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    step,
    title,
    children
  } = t0;
  let t1;
  if ($[0] !== step || $[1] !== title) {
    t1 = <Text$4 as="h3" size="xs" weight="medium" variant="primary">{step}. {title}</Text$4>;
    $[0] = step;
    $[1] = title;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== children) {
    t2 = <div className="flex flex-col gap-2.5">{children}</div>;
    $[3] = children;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== t1 || $[6] !== t2) {
    t3 = <section className="flex flex-col gap-2.5">{t1}{t2}</section>;
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
  } else t3 = $[7];
  return t3;
}
/** Step body copy. Block on purpose: Text is an inline span and would take the parent's line box. */
function Note(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    children
  } = t0;
  let t1;
  if ($[0] !== children) {
    t1 = <Text$4 as="p" size="2xs" variant="tertiary" className="text-pretty">{children}</Text$4>;
    $[0] = children;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function McpConnectModal(t0) {
  const $ = (0, import_compiler_runtime.c)(83);
  const { t } = useTranslation("editor");
  const {
    open,
    onOpenChange,
    info,
    loading: t1,
    initialAgent: t2
  } = t0;
  const loading = t1 === void 0 ? false : t1;
  const initialAgent = t2 === void 0 ? "claude" : t2;
  const url = info?.url ?? "http://127.0.0.1:0/mcp";
  const [codexManualOpen, setCodexManualOpen] = (0, import_react.useState)(false);
  const [urlCopied, setUrlCopied] = (0, import_react.useState)(false);
  let t3;
  if (true) {
    t3 = async () => {
      try {
        await navigator.clipboard.writeText(url);
        setUrlCopied(true);
        toast.success(t("mcp.copiedToast"));
        setTimeout(() => setUrlCopied(false), 2e3);
      } catch {
        toast.error(t("mcp.copyFailed"));
      }
    };
    $[0] = url;
    $[1] = t3;
  } else t3 = $[1];
  const copyUrl = t3;
  let t4;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = {
      height: "min(85vh, 530px)"
    };
    $[2] = t4;
  } else t4 = $[2];
  let t5;
  if (true) {
    t5 = <div className="flex items-center gap-2">{<McpIcon width={16} height={16} className="shrink-0 text-ed-muted-foreground" />}{<DialogTitle className="m-0 text-sm font-medium leading-5 text-ed-foreground">{t("mcp.title")}</DialogTitle>}</div>;
    $[3] = t5;
  } else t5 = $[3];
  let t6;
  if (true) {
    t6 = <div className="flex items-center justify-between gap-4 border-b border-ed-menu-border px-5 py-3">{t5}{<DialogClose asChild={true}>{<Button variant="ghost" size="icon-xs" aria-label={t("common:actions.close")} LeftIcon={XIcon} />}</DialogClose>}</div>;
    $[4] = t6;
  } else t6 = $[4];
  let t7;
  if (true) {
    t7 = <DialogDescription className="m-0 text-xs leading-4 text-ed-muted-foreground">{t("mcp.description")}{<span className="block">{t("mcp.activeHint")}</span>}</DialogDescription>;
    $[5] = t7;
  } else t7 = $[5];
  let t8;
  if (true) {
    t8 = <DialogHeader className="shrink-0 gap-0 border-b border-ed-menu-border">{t6}{<div className="flex flex-col gap-1 px-5 pt-3 pb-4">{t7}{loading ? <div className="flex items-center gap-2 pt-2">{<SpinnerIcon width={14} height={14} className="animate-spin text-ed-muted-foreground" />}{<Text$4 size="2xs" variant="tertiary">{t("mcp.loading")}</Text$4>}</div> : info ? <div className="flex items-center gap-2 pt-2">{<div className="flex h-6.5 min-w-0 items-center gap-1 rounded-[5px] border border-ed-field-border bg-ed-field pl-2 pr-0.5 shadow-ed-control">{<code className="min-w-0 truncate font-mono text-[11px] text-ed-foreground">{info.url}</code>}{<Button type="button" size="icon-xs" variant="ghost" aria-label={t(urlCopied ? "mcp.copied" : "mcp.copyUrl")} LeftIcon={urlCopied ? CheckIcon : CopyIcon} onClick={copyUrl} />}</div>}{<Badge variant="outline" className="cursor-default gap-1.5 border-ed-field-border bg-ed-field px-2.5 py-1 text-[11px] leading-4 shadow-ed-control">{<span className={`size-2 shrink-0 rounded-full ${info.healthy ? "bg-ed-chart-2" : "bg-amber-400"}`} />}{t(info.healthy ? "mcp.ready" : "mcp.starting")}</Badge>}</div> : <div className="pt-2">{<Text$4 as="p" size="2xs" variant="danger">{t("mcp.endpointError")}</Text$4>}</div>}</div>}</DialogHeader>;
    $[6] = copyUrl;
    $[7] = info;
    $[8] = loading;
    $[9] = urlCopied;
    $[10] = t8;
  } else t8 = $[10];
  let t9;
  if (true) {
    t9 = <div className="shrink-0 px-5 pt-4">{<SimpleTabs size="xs">{<TabsTrigger value="claude">Claude Code</TabsTrigger>}{<TabsTrigger value="codex">Codex</TabsTrigger>}{<TabsTrigger value="cursor">Cursor</TabsTrigger>}{<TabsTrigger value="manual">{t("mcp.other")}</TabsTrigger>}</SimpleTabs>}</div>;
    $[11] = t9;
  } else t9 = $[11];
  let t10;
  if (true) {
    t10 = <Note>{t("mcp.copyConfig")}</Note>;
    $[12] = t10;
  } else t10 = $[12];
  let t11;
  if ($[13] !== url) {
    t11 = buildCursorMcpJson(url);
    $[13] = url;
    $[14] = t11;
  } else t11 = $[14];
  let t12;
  if ($[15] !== t11) {
    t12 = <CopyBlock value={t11} />;
    $[15] = t11;
    $[16] = t12;
  } else t12 = $[16];
  let t13;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = <span className="font-medium text-ed-foreground">{"Settings > MCP"}</span>;
    $[17] = t13;
  } else t13 = $[17];
  let t14;
  if (true) {
    t14 = <Note>{t("mcp.cursorPasteBefore")} {t13}, {t("mcp.cursorPasteAfter")} {<InlineCode>~/.cursor/mcp.json</InlineCode>}.</Note>;
    $[18] = t14;
  } else t14 = $[18];
  let t15;
  if (true) {
    t15 = <SetupStep step={1} title={t("mcp.addTo", { agent: "Cursor" })}>{t10}{t12}{t14}</SetupStep>;
    $[19] = t12;
    $[20] = t15;
  } else t15 = $[20];
  let t16;
  if (true) {
    t16 = <SetupStep step={2} title={t("mcp.verify")}>{<Note>{t("mcp.cursorVerify")}</Note>}</SetupStep>;
    $[21] = t16;
  } else t16 = $[21];
  let t17;
  if ($[22] !== t15) {
    t17 = <TabsContent value="cursor" className="flex flex-col gap-6 overflow-visible">{t15}{t16}</TabsContent>;
    $[22] = t15;
    $[23] = t17;
  } else t17 = $[23];
  let t18;
  if (true) {
    t18 = <Note>{t("mcp.runRegister")}</Note>;
    $[24] = t18;
  } else t18 = $[24];
  let t19;
  if ($[25] !== url) {
    t19 = buildClaudeCliCommand(url);
    $[25] = url;
    $[26] = t19;
  } else t19 = $[26];
  let t20;
  if (true) {
    t20 = <SetupStep step={1} title={t("mcp.addTo", { agent: "Claude Code" })}>{t18}{<CopyBlock value={t19} />}</SetupStep>;
    $[27] = t19;
    $[28] = t20;
  } else t20 = $[28];
  let t21;
  if (true) {
    t21 = <SetupStep step={2} title={t("mcp.verify")}>{<Note>{t("mcp.runVerify")}</Note>}{<CopyBlock value="claude mcp list" />}</SetupStep>;
    $[29] = t21;
  } else t21 = $[29];
  let t22;
  if ($[30] !== t20) {
    t22 = <TabsContent value="claude" className="flex flex-col gap-6 overflow-visible">{t20}{t21}</TabsContent>;
    $[30] = t20;
    $[31] = t22;
  } else t22 = $[31];
  let t23;
  if (true) {
    t23 = <Note>{t("mcp.runRegister")}</Note>;
    $[32] = t23;
  } else t23 = $[32];
  let t24;
  if ($[33] !== url) {
    t24 = buildCodexCliCommand(url);
    $[33] = url;
    $[34] = t24;
  } else t24 = $[34];
  let t25;
  if ($[35] !== t24) {
    t25 = <CopyBlock value={t24} />;
    $[35] = t24;
    $[36] = t25;
  } else t25 = $[36];
  const t26 = codexManualOpen ? CaretDownIcon : CaretRightIcon;
  let t27;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t27 = () => setCodexManualOpen(_temp$9);
    $[37] = t27;
  } else t27 = $[37];
  let t28;
  if (true) {
    t28 = <div>{<Button type="button" variant="ghost" size="xs" LeftIcon={t26} onClick={t27}>{t("mcp.manualToml")}</Button>}</div>;
    $[38] = t26;
    $[39] = t28;
  } else t28 = $[39];
  let t29;
  if ($[40] !== codexManualOpen || $[41] !== url) {
    t29 = codexManualOpen && <CopyBlock value={buildCodexToml(url)} />;
    $[40] = codexManualOpen;
    $[41] = url;
    $[42] = t29;
  } else t29 = $[42];
  let t30;
  if ($[43] !== t25 || $[44] !== t28 || $[45] !== t29) {
    t30 = <SetupStep step={1} title={t("mcp.addTo", { agent: "Codex" })}>{t23}{t25}{t28}{t29}</SetupStep>;
    $[43] = t25;
    $[44] = t28;
    $[45] = t29;
    $[46] = t30;
  } else t30 = $[46];
  let t31;
  if (true) {
    t31 = <SetupStep step={2} title={t("mcp.verify")}>{<Note>{t("mcp.runVerify")}</Note>}{<CopyBlock value="codex mcp list" />}</SetupStep>;
    $[47] = t31;
  } else t31 = $[47];
  let t32;
  if ($[48] !== t30) {
    t32 = <TabsContent value="codex" className="flex flex-col gap-6 overflow-visible">{t30}{t31}</TabsContent>;
    $[48] = t30;
    $[49] = t32;
  } else t32 = $[49];
  let t33;
  if (true) {
    t33 = <Note>{t("mcp.otherIntro")} {<InlineCode>{url}</InlineCode>}</Note>;
    $[50] = url;
    $[51] = t33;
  } else t33 = $[51];
  let t34;
  if ($[52] !== url) {
    t34 = buildOtherClientServerUrlJson(url);
    $[52] = url;
    $[53] = t34;
  } else t34 = $[53];
  let t35;
  if ($[54] !== t34) {
    t35 = <CopyBlock value={t34} />;
    $[54] = t34;
    $[55] = t35;
  } else t35 = $[55];
  let t36;
  if (true) {
    t36 = <Note>{t("mcp.bridge")}</Note>;
    $[56] = t36;
  } else t36 = $[56];
  let t37;
  if ($[57] !== url) {
    t37 = buildMcpRemoteBridgeJson(url);
    $[57] = url;
    $[58] = t37;
  } else t37 = $[58];
  let t38;
  if ($[59] !== t37) {
    t38 = <CopyBlock value={t37} />;
    $[59] = t37;
    $[60] = t38;
  } else t38 = $[60];
  let t39;
  if ($[61] !== t33 || $[62] !== t35 || $[63] !== t38) {
    t39 = <SetupStep step={1} title={t("mcp.otherClients")}>{t33}{t35}{t36}{t38}</SetupStep>;
    $[61] = t33;
    $[62] = t35;
    $[63] = t38;
    $[64] = t39;
  } else t39 = $[64];
  let t40;
  if (true) {
    t40 = <SetupStep step={2} title={t("mcp.verify")}>{<Note>{t("mcp.otherVerify")}</Note>}</SetupStep>;
    $[65] = t40;
  } else t40 = $[65];
  let t41;
  if ($[66] !== t39) {
    t41 = <TabsContent value="manual" className="flex flex-col gap-6 overflow-visible">{t39}{t40}</TabsContent>;
    $[66] = t39;
    $[67] = t41;
  } else t41 = $[67];
  let t42;
  if ($[68] !== t17 || $[69] !== t22 || $[70] !== t32 || $[71] !== t41) {
    t42 = <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-5">{t17}{t22}{t32}{t41}</ScrollArea>;
    $[68] = t17;
    $[69] = t22;
    $[70] = t32;
    $[71] = t41;
    $[72] = t42;
  } else t42 = $[72];
  let t43;
  if ($[73] !== initialAgent || $[74] !== t42) {
    t43 = <Tabs defaultValue={initialAgent} className="flex min-h-0 flex-1 flex-col">{t9}{t42}</Tabs>;
    $[73] = initialAgent;
    $[74] = t42;
    $[75] = t43;
  } else t43 = $[75];
  let t44;
  if ($[76] !== t43 || $[77] !== t8) {
    t44 = <DialogContent showCloseButton={false} className="inset-0 m-auto flex h-fit w-[560px] max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-xl border-ed-menu-border bg-ed-background p-0 shadow-ed-popover sm:max-w-[560px]" style={t4}>{t8}{t43}</DialogContent>;
    $[76] = t43;
    $[77] = t8;
    $[78] = t44;
  } else t44 = $[78];
  let t45;
  if ($[79] !== onOpenChange || $[80] !== open || $[81] !== t44) {
    t45 = <Dialog open={open} onOpenChange={onOpenChange}>{t44}</Dialog>;
    $[79] = onOpenChange;
    $[80] = open;
    $[81] = t44;
    $[82] = t45;
  } else t45 = $[82];
  return t45;
}
function _temp$9(v) {
  return !v;
}

export { McpConnectModal };
