/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ClaudeCodeSetupModal.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClaudeStatus } from "../hooks/useClaudeStatus";
import { TerminalPanel } from "./panels/TerminalPanel";
import { ArrowRightIcon, Badge, Button, CheckIcon, CopyIcon, Dialog, DialogContent, DialogDescription, DialogTitle, PlayIcon, SpinnerIcon, TerminalIcon, Text$4, cn$2, useIsDark } from "@bingo/ui";
import { CheckCircle as s$8 } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var SHADOW_7 = "0 25px 50px -12px rgba(0, 0, 0, 0.07)";
var TITLE_CLASS = "text-base leading-6 tracking-[-0.02em] font-semibold text-ed-foreground";
var SUBTITLE_CLASS = "max-w-[580px] text-lg leading-[1.7] text-ed-muted-foreground";
var INSTALL_COMMAND = "npm install -g @anthropic-ai/claude-code";
var LOGIN_COMMAND = "claude /login";
var TERM_LIGHT = {
  background: "#fafafa",
  foreground: "#27272a",
  cursor: "#27272a",
  selectionBackground: "#2563eb40",
  green: "#16a34a",
  brightGreen: "#16a34a",
  blue: "#2563eb",
  brightBlue: "#2563eb"
};
var TERM_DARK = {
  background: "#141414",
  foreground: "#e4e4e7",
  cursor: "#e4e4e7",
  selectionBackground: "#7c9fff40",
  green: "#4ade80",
  brightGreen: "#4ade80",
  blue: "#7c9fff",
  brightBlue: "#7c9fff"
};
function phaseOf(status) {
  if (!status || !status.installed) return "install";
  if (!status.loggedIn) return "login";
  return "allset";
}
/** Orange Claude tile — bundled mark so the modal doesn't depend on a project asset. */
function ClaudeTile() {
  const $ = (0, import_compiler_runtime.c)(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      backgroundColor: "#d77655"
    };
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div className="flex size-16 shrink-0 items-center justify-center rounded-[16px] border border-ed-border shadow-2xl" style={t0}>{<svg viewBox="0 0 24 24" className="size-8 text-white" aria-hidden="true">{Array.from({
          length: 12
        }).map(_temp$23)}</svg>}</div>;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function _temp$23(_, i) {
  return <rect key={i} x="11.1" y="1.6" width="1.8" height="8.2" rx="0.9" fill="currentColor" transform={`rotate(${i * 30} 12 12)`} />;
}
var BADGE = {
  install: {
    label: "notInstalled",
    dot: "bg-ed-muted-foreground"
  },
  login: {
    label: "notLoggedIn",
    dot: "bg-amber-400"
  },
  allset: {
    label: "connected",
    dot: "bg-ed-chart-2"
  }
};
function StatusBadge(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const { t } = useTranslation("editor");
  const {
    phase
  } = t0;
  const {
    label,
    dot
  } = BADGE[phase];
  let t1;
  if ($[0] !== dot) {
    t1 = cn$2("size-2 rounded-full", dot);
    $[0] = dot;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== t1) {
    t2 = <span className={t1} />;
    $[2] = t1;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if (true) {
    t3 = <Badge variant="outline" className="gap-1.5 text-ed-muted-foreground">{t2}{t(`claudeSetup.${label}`)}</Badge>;
    $[4] = label;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
function ClaudeCodeSetupModal(t0) {
  const $ = (0, import_compiler_runtime.c)(38);
  const { t } = useTranslation("editor");
  const {
    open,
    onOpenChange,
    onConsent
  } = t0;
  let t1;
  if ($[0] !== open) {
    t1 = {
      poll: open
    };
    $[0] = open;
    $[1] = t1;
  } else t1 = $[1];
  const {
    status,
    loading,
    error,
    refresh
  } = useClaudeStatus(t1);
  const dark = useIsDark();
  let t2;
  if ($[2] !== status) {
    t2 = phaseOf(status);
    $[2] = status;
    $[3] = t2;
  } else t2 = $[3];
  const phase = t2;
  const initializing = open && !status && loading;
  const unreachable = open && !status && error;
  const [running, setRunning] = (0, import_react.useState)(false);
  const [copied, setCopied] = (0, import_react.useState)(false);
  const [headsUp, setHeadsUp] = (0, import_react.useState)(false);
  const [runId, setRunId] = (0, import_react.useState)(0);
  let t3;
  if ($[4] !== open || $[5] !== phase) {
    t3 = {
      phase,
      open
    };
    $[4] = open;
    $[5] = phase;
    $[6] = t3;
  } else t3 = $[6];
  const [resetKey, setResetKey] = (0, import_react.useState)(t3);
  if (phase !== resetKey.phase || open !== resetKey.open) {
    setResetKey({
      phase,
      open
    });
    setRunning(false);
    setHeadsUp(false);
  }
  let t4;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = () => {
      setRunning(true);
      setRunId(_temp2$15);
    };
    $[7] = t4;
  } else t4 = $[7];
  const runCommand = t4;
  const command = phase === "install" ? INSTALL_COMMAND : LOGIN_COMMAND;
  let t5;
  if ($[8] !== command) {
    t5 = () => {
      navigator.clipboard?.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    $[8] = command;
    $[9] = t5;
  } else t5 = $[9];
  const copyCommand = t5;
  let t6;
  if ($[10] !== onConsent || $[11] !== onOpenChange) {
    t6 = () => {
      onConsent?.();
      onOpenChange(false);
    };
    $[10] = onConsent;
    $[11] = onOpenChange;
    $[12] = t6;
  } else t6 = $[12];
  const handleConsent = t6;
  const t7 = headsUp ? "w-[600px] max-w-[600px]" : "w-[760px] max-w-[760px]";
  let t8;
  if ($[13] !== t7) {
    t8 = cn$2("flex flex-col gap-0 overflow-hidden rounded-[24px] p-0", t7);
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  let t9;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = {
      boxShadow: SHADOW_7
    };
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if (true) {
    t10 = unreachable ? <div className="flex flex-col gap-8 px-12 pt-12 pb-7">{<DialogTitle className={TITLE_CLASS}>{t("claudeSetup.unreachableTitle")}</DialogTitle>}{<DialogDescription className={SUBTITLE_CLASS}>{t("claudeSetup.unreachableDescription")}</DialogDescription>}{<div className="flex items-center justify-end gap-2">{<Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common:actions.close")}</Button>}{<Button variant="default" onClick={() => void refresh()}>{t("common:actions.retry")}</Button>}</div>}</div> : initializing ? <div className="flex flex-col gap-8 px-12 pt-12 pb-7">{<DialogTitle className="sr-only">{t("claudeSetup.checking")}</DialogTitle>}{<div className="flex h-[220px] items-center justify-center">{<SpinnerIcon width={28} height={28} className="animate-spin text-ed-muted-foreground" />}</div>}</div> : headsUp ? <>{<div className="flex flex-col gap-3 px-10 pt-10">{<span className="text-xs font-semibold uppercase tracking-[1px] text-ed-muted-foreground">{t("claudeSetup.headsUp")}</span>}{<DialogTitle className={cn$2(TITLE_CLASS, "leading-[1.2]")}>{t("claudeSetup.planTitle")}</DialogTitle>}{<DialogDescription className="text-base leading-[1.7] text-ed-muted-foreground">{t("claudeSetup.planDescription")}</DialogDescription>}</div>}{<div className="flex items-center justify-end gap-2 px-10 pt-7 pb-10">{<Button variant="secondary" onClick={() => setHeadsUp(false)}>{t("claudeSetup.goBack")}</Button>}{<Button variant="default" onClick={() => onOpenChange(false)}>{t("claudeSetup.gotIt")}</Button>}</div>}</> : <>{<div className="flex flex-col gap-8 px-12 pt-12 pb-7">{<div className="flex items-start justify-between gap-2">{<ClaudeTile />}{<StatusBadge phase={phase} />}</div>}{<div className="flex flex-col gap-2">{<DialogTitle className={TITLE_CLASS}>{phase === "install" && t("claudeSetup.installTitle")}{phase === "login" && t("claudeSetup.loginTitle")}{phase === "allset" && t("claudeSetup.readyTitle")}</DialogTitle>}{<DialogDescription className={SUBTITLE_CLASS}>{phase === "install" && t("claudeSetup.installDescription")}{phase === "login" && t("claudeSetup.loginDescription")}{phase === "allset" && t("claudeSetup.readyDescription")}</DialogDescription>}</div>}</div>}{<div className="px-12 pb-6">{phase === "allset" ? <div className="flex flex-col gap-5 rounded-[16px] bg-ed-muted p-7">{<div className="flex flex-col overflow-hidden rounded-xl border border-ed-border bg-ed-background px-6 py-4 shadow-lg">{<div className="flex items-center justify-between">{<div className="flex min-w-0 items-center gap-[14px]">{<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ed-secondary">{<TerminalIcon width={20} height={20} className="text-ed-foreground" />}</div>}{<div className="flex min-w-0 flex-col gap-0.5">{<Text$4 size="md" weight="medium" variant="primary">Claude Code</Text$4>}{<Text$4 size="sm" weight="regular" variant="tertiary" className="truncate">{t("claudeSetup.installed")}{status?.version ? ` · v${status.version}` : ""}{status?.account ? ` · ${status.account}` : ""}</Text$4>}</div>}</div>}{(0, import_jsx_runtime.jsx)(s$8, {
                size: 22,
                weight: "duotone",
                className: "shrink-0 text-ed-selected-foreground"
              })}</div>}</div>}{<Text$4 size="sm" variant="tertiary" className="leading-[1.7]">{t("claudeSetup.readyPlanDescription")}</Text$4>}</div> : <div className="flex flex-col gap-5 rounded-[16px] bg-ed-muted p-7">{<div className="flex w-full flex-col overflow-hidden rounded-xl border border-ed-border bg-ed-background" style={{
            boxShadow: SHADOW_7
          }}>{<div className={cn$2("flex w-full items-center justify-between", running ? "gap-2 px-4 py-2" : "gap-3 py-2 pr-2 pl-4")}>{<span className="min-w-0 truncate font-mono text-[13px] text-ed-foreground">{command}</span>}{<div className="flex shrink-0 items-center gap-1.5">{<Button variant="ghost" size="icon-sm" aria-label={t("claudeSetup.copyCommand")} LeftIcon={copied ? CheckIcon : CopyIcon} leftIconSize={14} onClick={copyCommand} />}{<Button size="sm" variant="default" LeftIcon={PlayIcon} leftIconSize={14} onClick={runCommand}>{t(running ? "claudeSetup.runAgain" : "claudeSetup.run")}</Button>}{<span aria-live="polite" className="sr-only">{copied ? t("claudeSetup.commandCopied") : ""}</span>}</div>}</div>}{running && <>{<div className="h-64 w-full">{<TerminalPanel key={`${phase}-${runId}`} active={running} initialCommand={command} theme={dark ? TERM_DARK : TERM_LIGHT} />}</div>}{<div className="flex flex-col gap-0.5 px-4 py-2">{<Text$4 size="xs" variant="tertiary">{t("claudeSetup.pressEnter")}</Text$4>}{<Text$4 size="xs" variant="tertiary">{t("claudeSetup.pressEsc")}</Text$4>}</div>}</>}</div>}</div>}</div>}{phase === "allset" ? <div className="flex items-center justify-end gap-2 px-12 pb-10">{<Button variant="secondary" onClick={() => setHeadsUp(true)}>{t("claudeSetup.no")}</Button>}{<Button variant="default" RightIcon={ArrowRightIcon} rightIconSize={16} onClick={handleConsent}>{t("claudeSetup.yes")}</Button>}</div> : <div className="flex items-center px-12 pb-10">{<Button variant="secondary" className="text-ed-muted-foreground" onClick={() => onOpenChange(false)}>{t("claudeSetup.skip")}</Button>}</div>}</>;
    $[16] = command;
    $[17] = copied;
    $[18] = copyCommand;
    $[19] = dark;
    $[20] = handleConsent;
    $[21] = headsUp;
    $[22] = initializing;
    $[23] = onOpenChange;
    $[24] = phase;
    $[25] = refresh;
    $[26] = runId;
    $[27] = running;
    $[28] = status;
    $[29] = unreachable;
    $[30] = t10;
  } else t10 = $[30];
  let t11;
  if ($[31] !== t10 || $[32] !== t8) {
    t11 = <DialogContent showCloseButton={false} className={t8} style={t9}>{t10}</DialogContent>;
    $[31] = t10;
    $[32] = t8;
    $[33] = t11;
  } else t11 = $[33];
  let t12;
  if ($[34] !== onOpenChange || $[35] !== open || $[36] !== t11) {
    t12 = <Dialog open={open} onOpenChange={onOpenChange}>{t11}</Dialog>;
    $[34] = onOpenChange;
    $[35] = open;
    $[36] = t11;
    $[37] = t12;
  } else t12 = $[37];
  return t12;
}
function _temp2$15(n) {
  return n + 1;
}

export { ClaudeCodeSetupModal };
