/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { BingoLogo } from "../../assets/BingoLogo";
import { useBackendOptional } from "../../backends/BackendContext";
import { isPlanLimitReason, planLimitTitle } from "../../backends/planLimits";
import { useAssetResolver } from "../../shared/contexts/AssetContext";
import { publishAiWriteTarget } from "../../shared/state/aiWriteTarget";
import { subscribeFolderShared } from "../../shared/state/folderShared";
import { captureElementImage } from "../../shared/utils/captureElementImage";
import { useChatScroll } from "../hooks/useChatScroll";
import { BINGO_COMMANDS, buildConnectionPrompt, connectionDisplayName, fetchSlashCommands, filterSlashCommands } from "../hooks/useClaudeContext";
import { useLocalAgents } from "../hooks/useLocalAgents";
import { useBackgroundVisualCommit } from "../hooks/useBackgroundVisualCommit";
import { isClaudeSetUp, useClaudeStatus } from "../hooks/useClaudeStatus";
import { useContextMentions } from "../hooks/useContextMentions";
import { CHAT_ATTACHMENT_ACCEPT, getDroppedAttachments, readPromptAttachment } from "../utils/chatAttachments";
import { projectReferenceLine } from "../utils/chatContextReferences";
import { isAddToPromptShortcut } from "../utils/chatShortcuts";
import { ChatRecoveryBoundary, ChatRecoveryNotice } from "./ChatRecoveryBoundary";
import { ChatMessageContext, ChatText } from "./ChatText";
import { getDisplayToolResults, normalizeToolResult } from "../utils/chatToolResults";
import { toolFailureReport } from "../utils/chatToolFailure";
import { chatWorkTargets } from "../utils/chatWorkTarget";
import { InlineChatComposer, inlineChatPrompt, splitInlineChatReferences, syncInlineReferenceSpacing } from "../utils/inlineChatComposer";
import { CanvasContextChip } from "./CanvasContextChip";
import { AgentPicker, ContextChip, ContextMenu, FolderChip, pickFolder } from "./ChatContextControls";
import { ChatMarkdown } from "./ChatMarkdown";
import { ChatReferenceChip } from "./ChatReferenceChip";
import { ClaudeCodeSetupModal } from "./ClaudeCodeSetupModal";
import { ContextMentionMenu } from "./ContextMentionMenu";
import { ImageContextChip } from "./ImageContextChip";
import { SelectionContextChip } from "./SelectionContextChip";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { ToolFailureDetails } from "./ToolFailureDetails";
import { PanelEmptyState } from "./panels/PanelEmptyState";
import { getElementLabel } from "./panels/layerSearch";
import { IconBtn } from "./panels/styles/primitives";
import { CLAUDE_EFFORT_LEVELS, getById, resolveClaudeEffort, storeSubtreeToLegacyNested, toWire, walk } from "@bingo/compiler";
import { appI18n, formatDate, formatRelativeTime, useTranslation } from "@bingo/i18n";
import { ArchiveIcon, ArrowClockwiseIcon, ArrowUpIcon, Button, CaretDownIcon, CaretRightIcon, CheckIcon, CursorIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, FileCodeIcon, FileIcon, FolderOpenIcon, PencilIcon, PlusIcon, ScrollArea, SearchIcon, SettingsIcon, SpinnerIcon, StopIcon, Tabs, TabsList, TabsTrigger, TerminalIcon, TrashIcon, WarningIcon$1, XIcon, cn$2 } from "@bingo/ui";
import { Content as Content2, Root as Root2$2, Trigger as Trigger$1 } from "@radix-ui/react-popover";
import * as import_react from "react";
import * as import_react_dom from "react-dom";
import * as import_compiler_runtime from "react/compiler-runtime";

function elementReference(element) {
  return {
    type: "element",
    id: element.id,
    name: getElementLabel(element),
    elementKind: element.type === "component" || element.type === "capture" ? "component" : "element"
  };
}
function handleAttachmentDragOver(e) {
  if (!e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "copy";
}
function classifyFrontendError(err) {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("not available") || msg.includes("no backend")) return {
    code: "not_installed",
    title: "AI chat unavailable",
    message: "No AI backend is configured.",
    action: "Make sure Claude Code CLI is installed and you have an active Claude Pro or Max subscription."
  };
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota") || msg.includes("usage limit")) return {
    code: "rate_limited",
    title: "Rate limit reached",
    message: "You've hit the usage limit for your Claude plan.",
    action: "Wait a few minutes and try again, or upgrade your plan at claude.ai."
  };
  if (msg.includes("overloaded") || msg.includes("503")) return {
    code: "overloaded",
    title: "Claude is busy",
    message: "The API is currently overloaded.",
    action: "Wait a moment and try again."
  };
  if (msg.includes("not logged in") || msg.includes("unauthorized") || msg.includes("auth")) return {
    code: "not_authenticated",
    title: "Not logged in",
    message: "Claude Code is not authenticated.",
    action: "Run `claude /login` in your terminal to log in."
  };
  if (msg.includes("enoent") || msg.includes("not found") || msg.includes("spawn")) return {
    code: "not_installed",
    title: "Claude Code not found",
    message: "Claude Code CLI is not installed or not in your PATH.",
    action: "Install it with `npm install -g @anthropic-ai/claude-code` and make sure you have an active Claude Pro or Max subscription."
  };
  const raw = err instanceof Error ? err.message : String(err);
  return {
    code: "unknown",
    title: "Something went wrong",
    message: raw.length > 200 ? raw.slice(0, 200) + "…" : raw
  };
}
function localizeChatError(t, error) {
  if (!error) return null;
  const known = {
    not_installed: ["chat.errorNoBackendTitle", "chat.errorNoBackendMessage", "chat.errorNoBackendAction"],
    rate_limited: ["chat.errorRateLimitTitle", "chat.errorRateLimitMessage", "chat.errorRateLimitAction"],
    overloaded: ["chat.errorBusyTitle", "chat.errorBusyMessage", "chat.errorBusyAction"],
    not_authenticated: ["chat.errorNotSignedInTitle", "chat.errorNotSignedInMessage", "chat.errorNotSignedInAction"],
    no_active_chat: ["chat.noActiveChatTitle", "chat.noActiveChatMessage"],
    chat_not_saved: ["chat.chatNotSavedTitle", "chat.chatNotSavedMessage"],
    attach_failed: ["chat.attachFailedTitle"],
    plan_limit: ["chat.planLimitTitle"]
  }[error.code];
  if (!known) return {
    ...error,
    title: t("chat.errorUnknownTitle")
  };
  return {
    ...error,
    title: t(known[0]),
    message: known[1] ? t(known[1]) : error.message,
    action: known[2] ? t(known[2]) : error.action
  };
}
/** Capture a canvas element as a PNG data URL (same helper as MCP take_screenshot). */
async function captureElementScreenshot(elementId) {
  if (typeof document === "undefined") return null;
  let el = document.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`);
  if (!el) for (const iframe of Array.from(document.querySelectorAll("iframe"))) try {
    const found = iframe.contentDocument?.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`);
    if (found) {
      el = found;
      break;
    }
  } catch {}
  if (!el) return null;
  try {
    return await captureElementImage(el);
  } catch {
    return null;
  }
}
var WRAP_ANYWHERE_CLASS = "[overflow-wrap:anywhere] [word-break:break-word]";
/** Per-element image URL extraction (inspects this element only — caller walks the subtree). */
function extractImageUrlsForElement(el, resolveAsset) {
  const results = [];
  if (el.type === "html" && (el.tag === "img" || el.tag === "video") && el.props?.src) results.push({
    url: resolveAsset(el.props.src),
    name: `${el.tag} in ${el.id}`
  });
  if (el.type === "component" && el.props) {
    for (const [key, value] of Object.entries(el.props)) if (typeof value === "string" && (key.toLowerCase().includes("src") || key.toLowerCase().includes("image") || key.toLowerCase().includes("avatar")) && (value.startsWith("data:image/") || value.startsWith("http") || value.includes(".bingo-assets/"))) results.push({
      url: resolveAsset(value),
      name: `${key} in ${el.id}`
    });
  }
  if (el.styles?.backgroundImage) {
    const bgMatch = String(el.styles.backgroundImage).match(/url\(["']?(.+?)["']?\)/);
    if (bgMatch) results.push({
      url: resolveAsset(bgMatch[1]),
      name: `background in ${el.id}`
    });
  }
  return results;
}
/** Walk a subtree in the Store and collect image URLs from every node. */
function extractImageUrlsFromSubtree(store, rootId, resolveAsset) {
  const results = [];
  const visit = id => {
    const el = getById(store, id);
    if (el) results.push(...extractImageUrlsForElement(el, resolveAsset));
  };
  visit(rootId);
  walk(store, rootId, descId => visit(descId));
  return results;
}
/** Fetch an image URL and return it as a data URL. Returns null on failure. */
async function fetchImageAsDataUrl(url) {
  try {
    if (url.startsWith("data:image/")) return url;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    if (blob.size > 3e6) return null;
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
function generateMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
/** Human-readable label for a tool activity indicator */
function getToolActivityLabel(t, name, input) {
  const path = input?.path || input?.file_path || "";
  const short = path ? path.split("/").slice(-2).join("/") : "";
  const baseName = name.includes("__") ? name.split("__").pop() : name;
  switch (baseName) {
    case "project_read":
      return short ? t("chat.activityReading", { target: short }) : t("chat.activityReadingFile");
    case "read_skill":
      return input?.name ? t("chat.activityLoading", { target: input.name }) : t("chat.activityLoadingSkill");
    case "project_write":
      return short ? t("chat.activityWriting", { target: short }) : t("chat.activityWritingFile");
    case "project_copy_file":
      {
        const dest = input?.project_path || (Array.isArray(input?.files) ? input.files[0]?.project_path : "");
        const destShort = dest ? String(dest).split("/").slice(-2).join("/") : "";
        const extra = Array.isArray(input?.files) && input.files.length > 1 ? t("chat.activityMore", { count: input.files.length - 1 }) : "";
        return destShort ? t("chat.activityCopying", { target: destShort, extra }) : t("chat.activityCopyingFile");
      }
    case "project_edit":
      return short ? t("chat.activityEditing", { target: short }) : t("chat.activityEditingFile");
    case "project_delete":
      return short ? t("chat.activityDeleting", { target: short }) : t("chat.activityDeletingFile");
    case "project_glob":
      return input?.pattern ? t("chat.activityFinding", { target: input.pattern }) : t("chat.activityFindingFiles");
    case "project_grep":
      return input?.pattern ? t("chat.activitySearching", { target: input.pattern }) : t("chat.activitySearchingGeneric");
    case "LS":
      return short ? t("chat.activityListing", { target: short }) : t("chat.activityListingDirectory");
    case "AddToCanvas":
    case "canvas_add":
      return t("chat.activityAddingCanvas");
    case "UpdateElement":
    case "canvas_update":
      return t("chat.activityUpdatingElement");
    case "canvas_edit":
      return t("chat.activityEditingElement");
    case "canvas_insert":
      return t("chat.activityInsertingCanvas");
    case "canvas_grep":
      return input?.pattern ? t("chat.activitySearchingCanvas", { target: input.pattern }) : t("chat.activitySearchingCanvasGeneric");
    case "canvas_query":
      return input?.selector ? t("chat.activityQueryingCanvas", { target: input.selector }) : t("chat.activityQueryingCanvasGeneric");
    case "get_theme":
      return t("chat.activityReadingTheme");
    case "DeleteElement":
    case "canvas_delete":
      return t("chat.activityDeletingElement");
    case "ReplaceWithComponent":
      return input?.componentName ? t("chat.activityReplacingWith", { target: input.componentName }) : t("chat.activityReplacingElement");
    case "ReadCanvas":
    case "canvas_read":
      return input?.element_id ? t("chat.activityReadingElement") : t("chat.activityReadingCanvas");
    case "SearchIcons":
    case "search_icons":
      return input?.query ? t("chat.activitySearchingIcons", { target: input.query }) : t("chat.activitySearchingIconsGeneric");
    case "take_screenshot":
    case "TakeScreenshot":
      return t("chat.activityTakingScreenshot");
    default:
      return `${baseName}...`;
  }
}
function getBaseToolName(name) {
  return (name.includes("__") ? name.split("__").pop() : name).toLowerCase();
}
function formatWorkDuration(tOrDuration, maybeDuration) {
  const t = typeof tOrDuration === "function" ? tOrDuration : (key, options) => appI18n.t(key, options);
  const durationMs = typeof tOrDuration === "function" ? maybeDuration : tOrDuration;
  if (!durationMs || durationMs < 1e3) return t("chat.durationMoment");
  const seconds = Math.round(durationMs / 1e3);
  if (seconds < 60) return t("chat.durationSeconds", { count: seconds });
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? t("chat.durationMinutesSeconds", { minutes, seconds: remainingSeconds }) : t("chat.durationMinutes", { count: minutes });
}
function getToolActivityCategory(item) {
  const name = getBaseToolName(item.name || "");
  if (/(write|edit|delete|add|update|insert|replace|copy)/.test(name)) return "changes";
  if (name === "read" || name === "project_read" || name === "canvas_read" || name === "readcanvas") return "reads";
  if (/(glob|grep|search|find|query)/.test(name)) return "searches";
  if (/(bash|shell|terminal|command|exec)/.test(name)) return "commands";
  return "other";
}
function getToolCategoryLabel(t, category, count) {
  switch (category) {
    case "changes":
      return t("chat.activityMadeChanges", { count });
    case "reads":
      return t("chat.activityReadFiles", { count });
    case "searches":
      return t("chat.activityRanSearches", { count });
    case "commands":
      return t("chat.activityRanCommands", { count });
    default:
      return t("chat.activityCompletedSteps", { count });
  }
}
function isCompletedTool(item) {
  return item.type === "tool" && item.pending !== true;
}
function groupCompletedTools(activity) {
  return activity.filter(isCompletedTool).reduce((groups, tool) => {
    groups[getToolActivityCategory(tool)].push(tool);
    return groups;
  }, {
    changes: [],
    reads: [],
    searches: [],
    commands: [],
    other: []
  });
}
function getCompletedActivitySummary(t, activity) {
  return Object.entries(groupCompletedTools(activity)).filter(([, items]) => items.length > 0).map(([category, items]) => getToolCategoryLabel(t, category, items.length)).join(" · ");
}
function isFileWriteActivity(name) {
  const base = getBaseToolName(name || "");
  return base === "project_write" || base === "project_edit" || base === "local_write" || base === "local_edit";
}
function isStreamingActivity(name) {
  const base = getBaseToolName(name || "");
  return isFileWriteActivity(name) || base === "canvas_add" || base === "canvas_insert" || base === "canvas_update";
}
function slimToolInput(input) {
  if (!input || typeof input !== "object") return input;
  const slim = {
    ...input
  };
  for (const key of ["content", "new_string", "old_string", "jsx"]) if (typeof slim[key] === "string" && slim[key].length > 160) slim[key] = `${slim[key].slice(0, 80)}…`;
  return slim;
}
function upsertPendingTool(prev, event) {
  const input = slimToolInput(event.input ?? {});
  const id = event.id || void 0;
  const pending = isStreamingActivity(event.name);
  for (let i = prev.length - 1; i >= 0; i--) {
    const item = prev[i];
    if (item.type !== "tool" || item.pending !== true) continue;
    const sameId = Boolean(id && item.id && id === item.id);
    const sameName = getBaseToolName(item.name || "") === getBaseToolName(event.name);
    const itemPath = item.input?.file_path || item.input?.path;
    const nextPath = input.file_path || input.path;
    if (sameId || sameName && (Boolean(itemPath && nextPath && itemPath === nextPath) || !itemPath && !nextPath)) {
      const next = [...prev];
      next[i] = {
        type: "tool",
        name: event.name,
        input: {
          ...item.input,
          ...input
        },
        id: item.id || id,
        pending
      };
      return next;
    }
  }
  return [...prev, {
    type: "tool",
    name: event.name,
    input,
    id,
    pending
  }];
}
function getThoughtSegments(activity) {
  return activity.filter(item => item.type === "thinking" && item.text != null && (typeof item.text !== "string" || item.text.trim())).map(item => typeof item.text === "string" ? item.text.trim() : item.text);
}
function getCompletedToolParts(t, item) {
  const name = getBaseToolName(item.name || "");
  const input = item.input ?? {};
  const path = input.path || input.file_path;
  const shortPath = path ? String(path).split("/").slice(-2).join("/") : void 0;
  if (name === "read" || name === "project_read") return {
    verb: t("chat.verbRead"),
    target: shortPath || t("chat.targetFile")
  };
  if (name === "read_skill") return {
    verb: t("chat.verbLoaded"),
    target: input.name || t("chat.targetSkill")
  };
  if (name === "canvas_read" || name === "readcanvas") return {
    verb: t("chat.verbRead"),
    target: t(input.element_id ? "chat.targetElement" : "chat.targetCanvas")
  };
  if (/(write|edit|update|insert|replace|copy)/.test(name)) return {
    verb: t("chat.verbEdited"),
    target: shortPath || input.project_path || input.element_id || t("chat.targetFile")
  };
  if (/(delete)/.test(name)) return {
    verb: t("chat.verbDeleted"),
    target: shortPath || input.element_id || t("chat.targetItem")
  };
  if (/(glob|grep|search|find|query)/.test(name)) return {
    verb: t("chat.verbSearched"),
    target: input.pattern || input.query || input.selector || t("chat.targetMatches")
  };
  if (/(bash|shell|terminal|command|exec)/.test(name)) return {
    verb: t("chat.verbRan"),
    target: input.command || input.cmd || t("chat.targetCommand")
  };
  if (name === "take_screenshot") return {
    verb: t("chat.verbCaptured"),
    target: t("chat.targetScreenshot")
  };
  return {
    verb: getToolActivityLabel(t, item.name || "Tool", input).replace(/[.…]+$/, "")
  };
}
function ToolActivityRow(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  const { t } = useTranslation("editor");
  const {
    item
  } = t0;
  let t1;
  let target;
  let verb;
  if (true) {
    const name = getBaseToolName(item.name || "");
    ({
      verb,
      target
    } = getCompletedToolParts(t, item));
    t1 = /(write|edit|update|insert|replace|delete)/.test(name) ? PencilIcon : /(glob|grep|search|find|query)/.test(name) ? SearchIcon : /(bash|shell|terminal|command|exec)/.test(name) ? TerminalIcon : FileCodeIcon;
    $[0] = item;
    $[1] = t1;
    $[2] = target;
    $[3] = verb;
  } else {
    t1 = $[1];
    target = $[2];
    verb = $[3];
  }
  const Icon = t1;
  let t2;
  if ($[4] !== Icon) {
    t2 = <Icon width={13} height={13} className="shrink-0" />;
    $[4] = Icon;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== verb) {
    t3 = <span className="shrink-0">{verb}</span>;
    $[6] = verb;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== target) {
    t4 = target && <span className="min-w-0 truncate underline decoration-dotted underline-offset-2">{target}</span>;
    $[8] = target;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] !== t2 || $[11] !== t3 || $[12] !== t4) {
    t5 = <div className="flex min-w-0 items-center gap-2 text-ed-chat leading-5 text-ed-muted-foreground">{t2}{t3}{t4}</div>;
    $[10] = t2;
    $[11] = t3;
    $[12] = t4;
    $[13] = t5;
  } else t5 = $[13];
  return t5;
}
function FileWriteStreamPreview(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const { t } = useTranslation("editor");
  const {
    path,
    content
  } = t0;
  const preRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      const el = preRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== content) {
    t2 = [content];
    $[1] = content;
    $[2] = t2;
  } else t2 = $[2];
  (0, import_react.useEffect)(t1, t2);
  let lines;
  let t3;
  if ($[3] !== content) {
    lines = content.split("\n");
    t3 = lines.length > 48 ? lines.slice(-48).join("\n") : content;
    $[3] = content;
    $[4] = lines;
    $[5] = t3;
  } else {
    lines = $[4];
    t3 = $[5];
  }
  const tail = t3;
  let t4;
  if ($[6] !== path) {
    t4 = path.split("/").filter(Boolean).slice(-2).join("/") || path;
    $[6] = path;
    $[7] = t4;
  } else t4 = $[7];
  const short = t4;
  let t5;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = <SpinnerIcon width={10} height={10} className="shrink-0 animate-spin" />;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if (true) {
    t6 = <span className="min-w-0 truncate">{t("chat.writingTarget", { target: short })}</span>;
    $[9] = short;
    $[10] = t6;
  } else t6 = $[10];
  const t7 = t("chat.lineCount", { count: lines.length });
  let t8;
  if ($[11] !== lines.length || $[12] !== t7) {
    t8 = <span className="ml-auto shrink-0">{t7}</span>;
    $[11] = lines.length;
    $[12] = t7;
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if ($[14] !== t6 || $[15] !== t8) {
    t9 = <div className="flex items-center gap-1.5 px-2 py-1 text-ed-chat text-ed-muted-foreground">{t5}{t6}{t8}</div>;
    $[14] = t6;
    $[15] = t8;
    $[16] = t9;
  } else t9 = $[16];
  let t10;
  if ($[17] !== tail) {
    t10 = <pre ref={preRef} className={`max-h-36 overflow-auto px-2 py-1.5 font-mono text-[11px] leading-4 text-ed-foreground/70 ${WRAP_ANYWHERE_CLASS}`}>{tail}</pre>;
    $[17] = tail;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  if ($[19] !== t10 || $[20] !== t9) {
    t11 = <div className="overflow-hidden rounded-md border border-ed-border bg-ed-muted/30">{t9}{t10}</div>;
    $[19] = t10;
    $[20] = t9;
    $[21] = t11;
  } else t11 = $[21];
  return t11;
}
function ToolActivityGroup(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const { t } = useTranslation("editor");
  const {
    category,
    items,
    defaultOpen: t1
  } = t0;
  const defaultOpen = t1 === void 0 ? false : t1;
  const [open, setOpen] = (0, import_react.useState)(defaultOpen);
  const [wasDefaultOpen, setWasDefaultOpen] = (0, import_react.useState)(defaultOpen);
  if (wasDefaultOpen !== defaultOpen) {
    setWasDefaultOpen(defaultOpen);
    if (defaultOpen) setOpen(true);
  }
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => setOpen(_temp$18);
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if (true) {
    t3 = getToolCategoryLabel(t, category, items.length);
    $[1] = category;
    $[2] = items.length;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== t3) {
    t4 = <span>{t3}</span>;
    $[4] = t3;
    $[5] = t4;
  } else t4 = $[5];
  const t5 = open && "rotate-90";
  let t6;
  if ($[6] !== t5) {
    t6 = cn$2("size-2.5 shrink-0 transition-transform", t5);
    $[6] = t5;
    $[7] = t6;
  } else t6 = $[7];
  let t7;
  if ($[8] !== t6) {
    t7 = <CaretRightIcon width={10} height={10} className={t6} />;
    $[8] = t6;
    $[9] = t7;
  } else t7 = $[9];
  let t8;
  if ($[10] !== t4 || $[11] !== t7) {
    t8 = <Button type="button" onClick={t2} variant="ghost" size="text" isChildText={false} className="flex min-h-6.5 w-fit select-none items-center gap-1 bg-transparent! text-ed-chat leading-5 text-ed-muted-foreground hover:bg-transparent! hover:text-ed-foreground active:bg-transparent!">{t4}{t7}</Button>;
    $[10] = t4;
    $[11] = t7;
    $[12] = t8;
  } else t8 = $[12];
  let t9;
  if ($[13] !== items || $[14] !== open) {
    t9 = open && <div className="mt-1.5 flex min-w-0 flex-col gap-1.5 border-l border-ed-border pl-3">{items.map(_temp2$11)}</div>;
    $[13] = items;
    $[14] = open;
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if ($[16] !== t8 || $[17] !== t9) {
    t10 = <div className="min-w-0">{t8}{t9}</div>;
    $[16] = t8;
    $[17] = t9;
    $[18] = t10;
  } else t10 = $[18];
  return t10;
}
/** Collapsed activity accordion for saved messages */
function _temp2$11(item, index) {
  return <ToolActivityRow key={index} item={item} />;
}
function _temp$18(prev) {
  return !prev;
}
function SavedActivityAccordion(t0) {
  const $ = (0, import_compiler_runtime.c)(43);
  const { t } = useTranslation("editor");
  const {
    activity,
    durationMs,
    active: t1,
    fileWriteStream,
    thinking
  } = t0;
  const active = t1 === void 0 ? false : t1;
  const [open, setOpen] = (0, import_react.useState)(active);
  const [wasActive, setWasActive] = (0, import_react.useState)(active);
  if (wasActive !== active) {
    setWasActive(active);
    setOpen(active);
  }
  let t2;
  if (true) {
    const thoughts = getThoughtSegments(activity);
    const groupedTools = groupCompletedTools(activity);
    let t3;
    if (true) {
      t3 = getCompletedActivitySummary(t, activity);
      $[7] = activity;
      $[8] = t3;
    } else t3 = $[8];
    const summary = t3;
    let pendingTool;
    let t4;
    let t5;
    let t6;
    let t7;
    let writePreview;
    if ($[9] !== active || $[10] !== activity || $[11] !== durationMs || $[12] !== fileWriteStream || $[13] !== open || $[14] !== summary) {
      pendingTool = active ? [...activity].reverse().find(_temp3$7) : void 0;
      let t8;
      if ($[21] !== durationMs) {
        t8 = durationMs ? formatWorkDuration(t, durationMs) : "";
        $[21] = durationMs;
        $[22] = t8;
      } else t8 = $[22];
      const duration = t8;
      const label = active ? `Working…${duration ? ` ${duration}` : ""}` : duration ? `Worked for ${duration}` : "Worked";
      writePreview = fileWriteStream?.content ? fileWriteStream : pendingTool && isFileWriteActivity(pendingTool.name) && typeof pendingTool.input?.content === "string" ? {
        path: String(pendingTool.input.file_path || pendingTool.input.path || "file"),
        content: pendingTool.input.content
      } : null;
      t4 = "min-w-0 text-ed-chat leading-normal";
      let t9;
      if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = () => setOpen(_temp4$8);
        $[23] = t9;
      } else t9 = $[23];
      let t10;
      if ($[24] !== label) {
        t10 = <ActivityStatusLabel active={active} duration={duration} />;
        $[24] = label;
        $[25] = t10;
      } else t10 = $[25];
      const t11 = open && "rotate-90";
      let t12;
      if ($[26] !== t11) {
        t12 = cn$2("size-2.5 shrink-0 transition-transform", t11);
        $[26] = t11;
        $[27] = t12;
      } else t12 = $[27];
      let t13;
      if ($[28] !== t12) {
        t13 = <CaretRightIcon width={10} height={10} className={t12} />;
        $[28] = t12;
        $[29] = t13;
      } else t13 = $[29];
      if ($[30] !== t10 || $[31] !== t13) {
        t5 = <Button type="button" onClick={t9} variant="ghost" size="text" isChildText={false} className="flex min-h-6.5 w-fit select-none items-center gap-1 bg-transparent! text-ed-chat leading-[1.5] text-ed-muted-foreground/55 hover:bg-transparent! hover:text-ed-muted-foreground/80 active:bg-transparent!">{t10}{t13}</Button>;
        $[30] = t10;
        $[31] = t13;
        $[32] = t5;
      } else t5 = $[32];
      if ($[33] !== open || $[34] !== summary) {
        t6 = summary && !open && <div className="mt-0.5 text-ed-chat leading-5 text-ed-muted-foreground/70">{summary}</div>;
        $[33] = open;
        $[34] = summary;
        $[35] = t6;
      } else t6 = $[35];
      t7 = pendingTool && <div className="mt-1 flex items-center gap-1.5 text-ed-chat leading-5 text-ed-muted-foreground">{<SpinnerIcon width={11} height={11} className="shrink-0 animate-spin" />}{<span className="min-w-0 truncate">{getToolActivityLabel(t, pendingTool.name || "Tool", pendingTool.input)}</span>}</div>;
      $[9] = active;
      $[10] = activity;
      $[11] = durationMs;
      $[12] = fileWriteStream;
      $[13] = open;
      $[14] = summary;
      $[15] = pendingTool;
      $[16] = t4;
      $[17] = t5;
      $[18] = t6;
      $[19] = t7;
      $[20] = writePreview;
    } else {
      pendingTool = $[15];
      t4 = $[16];
      t5 = $[17];
      t6 = $[18];
      t7 = $[19];
      writePreview = $[20];
    }
    let t8;
    if ($[36] !== active || $[37] !== pendingTool || $[38] !== thinking) {
      t8 = active && thinking && !pendingTool && <div className="mt-1 flex items-center gap-1.5 text-ed-chat leading-5 text-ed-muted-foreground">{<SpinnerIcon width={11} height={11} className="shrink-0 animate-spin" />}{<span><LocalizedChatLabel id="thinking" /></span>}</div>;
      $[36] = active;
      $[37] = pendingTool;
      $[38] = thinking;
      $[39] = t8;
    } else t8 = $[39];
    let t9;
    if ($[40] !== active || $[41] !== writePreview) {
      t9 = active && writePreview && <div className="mt-1.5">{<FileWriteStreamPreview path={writePreview.path} content={writePreview.content} />}</div>;
      $[40] = active;
      $[41] = writePreview;
      $[42] = t9;
    } else t9 = $[42];
    t2 = <div className={t4}>{t5}{t6}{t7}{t8}{t9}{open && <div className="mt-2 flex min-w-0 flex-col gap-2 border-l border-ed-border pl-3">{thoughts.map(_temp5$5)}{Object.entries(groupedTools).filter(_temp6$3).map(t10 => {
          const [category, items_0] = t10;
          return <ToolActivityGroup key={category} category={category} items={items_0} defaultOpen={active} />;
        })}</div>}</div>;
    $[0] = active;
    $[1] = activity;
    $[2] = durationMs;
    $[3] = fileWriteStream;
    $[4] = open;
    $[5] = thinking;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}
function _temp6$3(t0) {
  const [, items] = t0;
  return items.length > 0;
}
function ActivityStatusLabel({ active, duration }) {
  const { t } = useTranslation("editor");
  return <span>{active ? t("chat.working", { duration: duration ? ` ${duration}` : "" }) : duration ? t("chat.workedFor", { duration }) : t("chat.worked")}</span>;
}
function LocalizedChatLabel({ id }) {
  const { t } = useTranslation("editor");
  return <>{t(`chat.${id}`)}</>;
}
function _temp5$5(thought, i) {
  return <div key={i} className="min-w-0">{<div className="mb-1 text-ed-chat text-ed-muted-foreground/70"><LocalizedChatLabel id="thought" /></div>}{<div className={`text-ed-chat leading-[1.65] text-ed-foreground/80 ${WRAP_ANYWHERE_CLASS}`}>{<ChatText value={thought} />}</div>}</div>;
}
function _temp4$8(prev) {
  return !prev;
}
function _temp3$7(item) {
  return item.type === "tool" && item.pending === true;
}
function SequentialAssistantActivity(t0) {
  const $ = (0, import_compiler_runtime.c)(10);
  const {
    activity,
    durationMs,
    active: t1,
    fileWriteStream,
    thinking
  } = t0;
  const active = t1 === void 0 ? false : t1;
  let blocks;
  let t2;
  if ($[0] !== activity) {
    blocks = [];
    for (const item of activity) if (item.type === "text") {
      const previous = blocks[blocks.length - 1];
      if (previous?.type === "text" && typeof previous.text === "string" && typeof item.text === "string") previous.text += item.text;else blocks.push({
        type: "text",
        text: item.text || ""
      });
    } else {
      const previous_0 = blocks[blocks.length - 1];
      if (previous_0?.type === "work") previous_0.items.push(item);else blocks.push({
        type: "work",
        items: [item]
      });
    }
    t2 = blocks.reduce(_temp7$2, -1);
    $[0] = activity;
    $[1] = blocks;
    $[2] = t2;
  } else {
    blocks = $[1];
    t2 = $[2];
  }
  const lastWorkIndex = t2;
  let t3;
  if ($[3] !== active || $[4] !== blocks || $[5] !== durationMs || $[6] !== fileWriteStream || $[7] !== lastWorkIndex || $[8] !== thinking) {
    t3 = <div className="flex min-w-0 flex-col gap-4">{blocks.map((block_0, index_0) => block_0.type === "text" ? <div key={index_0} className={`min-w-0 max-w-full text-ed-chat font-normal leading-[1.65] text-ed-foreground/80 ${WRAP_ANYWHERE_CLASS}`}>{<ChatText value={block_0.text} />}</div> : <SavedActivityAccordion key={index_0} activity={block_0.items} durationMs={index_0 === lastWorkIndex ? durationMs : void 0} active={active && index_0 === lastWorkIndex} fileWriteStream={active && index_0 === lastWorkIndex ? fileWriteStream : null} thinking={active && index_0 === lastWorkIndex ? thinking : false} />)}</div>;
    $[3] = active;
    $[4] = blocks;
    $[5] = durationMs;
    $[6] = fileWriteStream;
    $[7] = lastWorkIndex;
    $[8] = thinking;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
}
function _temp7$2(lastIndex, block, index) {
  return block.type === "work" ? index : lastIndex;
}
function ToolResultBadge(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const { t } = useTranslation("editor");
  const {
    result,
    store,
    onSelect,
    chatId,
    onTroubleshoot,
    onFeedback
  } = t0;
  if (result.recoveryIssue) return <ChatRecoveryNotice code={result.recoveryIssue} contextId={chatId} onTroubleshoot={onTroubleshoot} />;
  const payload = result.payload;
  const clickableId = result.createdElementId || result.createdElementIds?.[0] || (result.type === "replace_with_component" ? payload.elementId : void 0);
  let t1;
  if (true) {
    const element = clickableId ? getById(store, clickableId) : null;
    const canNavigate = !!element && result.type !== "delete_element";
    const isComponent = !!payload.componentRegistered || element?.type === "component" || result.type === "replace_with_component";
    const isCanvasElement = ["add_jsx", "update_jsx", "delete_element", "replace_with_component"].includes(result.type);
    const hasError = !!payload.error || payload.success === false;
    const actionColor = hasError || result.type === "delete_element" || result.type === "Delete" ? "text-ed-destructive" : ["add_jsx", "update_jsx", "Write", "Edit"].includes(result.type) ? "text-ed-success" : "text-ed-muted-foreground";
    let t2;
    if ($[16] !== actionColor) {
      t2 = cn$2("size-3.5 shrink-0", actionColor);
      $[16] = actionColor;
      $[17] = t2;
    } else t2 = $[17];
    const actionIconClass = t2;
    let t3;
    if ($[18] !== actionIconClass || $[19] !== hasError || $[20] !== payload.componentRegistered || $[21] !== result.type) {
      t3 = () => {
        if (hasError) return <WarningIcon$1 width={14} height={14} className={actionIconClass} />;
        switch (result.type) {
          case "add_jsx":
            return <PlusIcon width={14} height={14} className={actionIconClass} />;
          case "update_jsx":
            return <CursorIcon width={14} height={14} className={actionIconClass} />;
          case "delete_element":
          case "Delete":
            return <TrashIcon width={14} height={14} className={actionIconClass} />;
          case "replace_with_component":
            return <ArrowClockwiseIcon width={14} height={14} className={actionIconClass} />;
          case "Read":
            return <FileCodeIcon width={14} height={14} className={actionIconClass} />;
          case "Write":
            return payload.componentRegistered ? <PlusIcon width={14} height={14} className={actionIconClass} /> : <FileIcon width={14} height={14} className={actionIconClass} />;
          case "Edit":
            return <PencilIcon width={14} height={14} className={actionIconClass} />;
          case "LS":
            return <FolderOpenIcon width={14} height={14} className={actionIconClass} />;
          case "Glob":
            return <SearchIcon width={14} height={14} className={actionIconClass} />;
          default:
            return <FileIcon width={14} height={14} className={actionIconClass} />;
        }
      };
      $[18] = actionIconClass;
      $[19] = hasError;
      $[20] = payload.componentRegistered;
      $[21] = result.type;
      $[22] = t3;
    } else t3 = $[22];
    const getIcon = t3;
    const getLabel = () => {
      if (result.type === "add_jsx") {
        const count = result.createdElementIds?.length || payload.actionCount || payload.elements?.length || 1;
        if (count > 1) return t("chat.resultElements", { count });
        return element ? getElementLabel(element) : t("chat.resultElement");
      }
      if (result.type === "update_jsx") return element ? getElementLabel(element) : t("chat.resultElement");
      if (result.type === "delete_element") return t("chat.resultElement");
      if (result.type === "replace_with_component") return element ? getElementLabel(element) : payload.componentName || t("chat.resultComponent");
      if (result.type === "Read") return payload.path || t("chat.resultFile");
      if (result.type === "Write" || result.type === "Edit" || result.type === "Delete") {
        if (payload.componentRegistered) return element ? getElementLabel(element) : payload.componentName;
        return (payload.path || t("chat.resultFile")).split("/").slice(-2).join("/");
      }
      if (result.type === "LS") return payload.path || ".";
      if (result.type === "Glob") return t("chat.resultFiles", { count: payload.files?.length || 0 });
      return t("chat.resultAction");
    };
    let t4;
    if ($[23] !== hasError || $[24] !== payload.componentRegistered || $[25] !== payload.success || $[26] !== result.type) {
      t4 = () => {
        if (hasError) switch (result.type) {
          case "add_jsx":
            return t("chat.actionAddFailed");
          case "update_jsx":
            return t("chat.actionUpdateFailed");
          case "delete_element":
          case "Delete":
            return t("chat.actionDeleteFailed");
          case "replace_with_component":
            return t("chat.actionReplaceFailed");
          case "Read":
            return t("chat.actionReadFailed");
          case "Write":
            return t("chat.actionWriteFailed");
          case "Edit":
            return t("chat.actionEditFailed");
          case "LS":
            return t("chat.actionListFailed");
          case "Glob":
            return t("chat.actionSearchFailed");
          default:
            return t("chat.actionFailed");
        }
        switch (result.type) {
          case "add_jsx":
            return t("chat.actionAdded");
          case "update_jsx":
            return t("chat.actionUpdated");
          case "delete_element":
            return t("chat.actionDeleted");
          case "replace_with_component":
            return t("chat.actionReplaced");
          case "Read":
            return t("chat.actionReading");
          case "Write":
            return payload.componentRegistered ? t("chat.actionAdded") : payload.success ? t("chat.actionWrote") : t("chat.actionFailed");
          case "Edit":
            return payload.success ? t("chat.actionEdited") : t("chat.actionFailed");
          case "Delete":
            return payload.success ? t("chat.actionDeletedFile") : t("chat.actionFailed");
          case "LS":
            return t("chat.actionListed");
          case "Glob":
            return t("chat.actionFound");
          default:
            return "";
        }
      };
      $[23] = hasError;
      $[24] = payload.componentRegistered;
      $[25] = payload.success;
      $[26] = result.type;
      $[27] = t4;
    } else t4 = $[27];
    const getAction = t4;
    let t5;
    if ($[28] !== getIcon) {
      t5 = getIcon();
      $[28] = getIcon;
      $[29] = t5;
    } else t5 = $[29];
    const t6 = getAction();
    let t7;
    if ($[30] !== t5 || $[31] !== t6) {
      t7 = <span className="inline-flex shrink-0 items-center gap-1.5 border-r border-ed-border py-1 pl-1 pr-2 text-ed-chat leading-4 text-ed-muted-foreground">{t5}{t6}</span>;
      $[30] = t5;
      $[31] = t6;
      $[32] = t7;
    } else t7 = $[32];
    const action = t7;
    const t8 = hasError && "text-ed-destructive";
    let t9;
    if ($[33] !== t8) {
      t9 = cn$2("flex w-fit min-w-0 max-w-full items-stretch overflow-hidden rounded-[5px] border border-ed-border bg-transparent", t8);
      $[33] = t8;
      $[34] = t9;
    } else t9 = $[34];
    let t10;
    if ($[35] !== action || $[36] !== chatId || $[37] !== hasError || $[38] !== onFeedback || $[39] !== onTroubleshoot || $[40] !== result) {
      t10 = hasError ? <ToolFailureDetails report={toolFailureReport(result, chatId)} onTroubleshoot={onTroubleshoot} onFeedback={onFeedback}>{action}</ToolFailureDetails> : action;
      $[35] = action;
      $[36] = chatId;
      $[37] = hasError;
      $[38] = onFeedback;
      $[39] = onTroubleshoot;
      $[40] = result;
      $[41] = t10;
    } else t10 = $[41];
    t1 = <div data-slot="tool-result" className={t9}>{t10}{isCanvasElement || isComponent ? <CanvasContextChip variant="segment" element={element} label={getLabel()} component={isComponent} title={result.type === "delete_element" ? t("chat.deletedElement") : void 0} onClick={canNavigate && clickableId ? () => onSelect(clickableId) : void 0} /> : <ContextChip variant="segment" icon={FileCodeIcon} label={getLabel()} />}</div>;
    $[0] = chatId;
    $[1] = clickableId;
    $[2] = onFeedback;
    $[3] = onSelect;
    $[4] = onTroubleshoot;
    $[5] = payload.actionCount;
    $[6] = payload.componentName;
    $[7] = payload.componentRegistered;
    $[8] = payload.elements?.length;
    $[9] = payload.error;
    $[10] = payload.files?.length;
    $[11] = payload.path;
    $[12] = payload.success;
    $[13] = result;
    $[14] = store;
    $[15] = t1;
  } else t1 = $[15];
  return t1;
}
function ScreenshotChips(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const { t } = useTranslation("editor");
  const {
    screenshots,
    onOpen
  } = t0;
  if (!screenshots.length) return null;
  let t1;
  if (true) {
    let t2;
    if (true) {
      t2 = (shot, index) => <ImageContextChip key={index} src={shot.dataUrl} label={screenshots.length === 1 ? t("chat.screenshotName") : t("chat.screenshotNumber", { number: index + 1 })} onClick={() => onOpen(shot.dataUrl)} />;
      $[3] = onOpen;
      $[4] = screenshots.length;
      $[5] = t2;
    } else t2 = $[5];
    t1 = screenshots.map(t2);
    $[0] = onOpen;
    $[1] = screenshots;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[6] !== t1) {
    t2 = <div className="flex min-w-0 flex-wrap gap-1.5">{t1}</div>;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function UserMessage(t0) {
  return typeof t0.message.content === "string" ? <InlineUserMessage {...t0} /> : <ChatText value={t0.message.content} />;
}
function InlineUserMessage(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    message,
    store,
    variant,
    onSelectElement
  } = t0;
  let t1;
  let t2;
  let t3;
  if ($[0] !== message.content || $[1] !== message.inlineRefs || $[2] !== message.referenceMentions || $[3] !== onSelectElement || $[4] !== store || $[5] !== variant) {
    const refs = message.inlineRefs ?? [];
    const {
      parts,
      remaining
    } = splitInlineChatReferences(message.content, refs, message.referenceMentions);
    const t4 = variant === "sidebar-v2" ? "max-w-[85%] shrink-0" : "max-w-full";
    if ($[9] !== t4) {
      t1 = cn$2("flex min-w-0 flex-col items-end gap-1.5", t4);
      $[9] = t4;
      $[10] = t1;
    } else t1 = $[10];
    t2 = remaining.length > 0 && <div className="flex max-w-full flex-wrap justify-end gap-1">{remaining.map(ref => <ChatReferenceChip key={ref.id} reference={ref} store={store} onSelectElement={onSelectElement} />)}</div>;
    t3 = message.content && <div className={cn$2("min-w-0 max-w-full overflow-hidden rounded-md bg-ed-chat-surface", variant === "sidebar-v2" ? "px-3 py-2" : "border border-ed-border px-2.5 py-2")}>{<div className={cn$2(`min-w-0 max-w-full whitespace-pre-wrap text-ed-chat ${WRAP_ANYWHERE_CLASS}`, variant === "sidebar-v2" ? "leading-[1.5] text-ed-foreground/80" : "leading-[1.55] text-ed-foreground")}>{parts.map(part => typeof part === "string" ? part : <ChatReferenceChip key={part.offset} reference={part.reference} store={store} onSelectElement={onSelectElement} className="ed-inline-chat-reference" />)}</div>}</div>;
    $[0] = message.content;
    $[1] = message.inlineRefs;
    $[2] = message.referenceMentions;
    $[3] = onSelectElement;
    $[4] = store;
    $[5] = variant;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
  } else {
    t1 = $[6];
    t2 = $[7];
    t3 = $[8];
  }
  let t4;
  if ($[11] !== t1 || $[12] !== t2 || $[13] !== t3) {
    t4 = <div className={t1}>{t2}{t3}</div>;
    $[11] = t1;
    $[12] = t2;
    $[13] = t3;
    $[14] = t4;
  } else t4 = $[14];
  return t4;
}
function MessageActivity({ message: msg }) {
  if (!Array.isArray(msg.activity)) throw new Error("CHAT_ACTIVITY_INVALID");
  if (msg.activity.length === 0) return null;
  return msg.activity.some(_temp8$2) ? <SequentialAssistantActivity activity={msg.activity} durationMs={msg.workDurationMs} /> : <SavedActivityAccordion activity={msg.activity} durationMs={msg.workDurationMs} />;
}
function ChatMessageContent({ message: msg, store, variant, activeChatId, onSelectElement, onFeedback, onTroubleshoot, onOpenScreenshot, onReload }) {
  const hasTextActivity = Array.isArray(msg.activity) && msg.activity.some(item => item?.type === "text");
  const body = <div className={`min-w-0 max-w-full text-ed-chat font-normal leading-[1.65] text-ed-foreground/80 ${WRAP_ANYWHERE_CLASS}`}><ChatText value={msg.content} /></div>;
  return <div className={`flex min-w-0 max-w-full gap-2.5 ${msg.role === "user" ? "flex-row-reverse items-center justify-between" : "items-start"}`}>
    {msg.role === "user" ? <UserMessage message={msg} store={store} variant={variant} onSelectElement={onSelectElement} /> : <div className="flex min-w-0 max-w-full flex-col gap-3">
      {msg.activity != null && <ChatRecoveryBoundary resetKey={msg} contextId={`${activeChatId}:${msg.id}:activity`} onReload={onReload} onTroubleshoot={onTroubleshoot} fallbackContent={hasTextActivity ? body : null}>
        <MessageActivity message={msg} />
      </ChatRecoveryBoundary>}
      {msg.content && !hasTextActivity && body}
      {msg.screenshots && <ScreenshotChips screenshots={msg.screenshots} onOpen={onOpenScreenshot} />}
      {msg.toolResults != null && <div className="flex min-w-0 max-w-full flex-col gap-2">
        {getDisplayToolResults(msg.toolResults, id => getById(store, id)).map((result, i) => <ChatRecoveryBoundary key={i}
          resetKey={msg.toolResults} contextId={`${activeChatId}:${msg.id}:tool:${i}`} onReload={onReload} onTroubleshoot={onTroubleshoot}>
          <ToolResultBadge store={store} result={result} onSelect={onSelectElement} chatId={activeChatId} onFeedback={onFeedback} onTroubleshoot={onTroubleshoot} />
        </ChatRecoveryBoundary>)}
      </div>}
    </div>}
  </div>;
}

function RecoverableChatMessage({ message, ...props }) {
  const backend = useBackendOptional();
  const [replacement, setReplacement] = import_react.useState(null);
  // A fresh stream update always wins over an older manually reloaded snapshot.
  const shown = replacement?.source === message ? replacement.value : message;
  const current = import_react.useRef(message);
  current.current = message;
  const reload = backend?.getChatMessage && typeof message?.id === "string" ? async () => {
    const source = message;
    const value = await backend.getChatMessage(props.activeChatId, source.id);
    if (!value || value.id !== source.id) throw new Error("CHAT_MESSAGE_RELOAD_FAILED");
    if (current.current === source) setReplacement({ source, value });
  } : undefined;
  return <ChatMessageContext.Provider value={{ chatId: props.activeChatId, messageId: message?.id, reload }}>
    <ChatRecoveryBoundary resetKey={shown} contextId={`${props.activeChatId}:${message?.id ?? "unknown"}`} onReload={reload} onTroubleshoot={props.onTroubleshoot}>
      <ChatMessageContent {...props} message={shown} onReload={reload} />
    </ChatRecoveryBoundary>
  </ChatMessageContext.Provider>;
}
function ChatTranscript({ messages, ...props }) {
  if (!Array.isArray(messages)) return <ChatRecoveryNotice code="CHAT_MESSAGES_INVALID" contextId={props.activeChatId} onTroubleshoot={props.onTroubleshoot} />;
  return <>{messages.map((message, index) => <RecoverableChatMessage key={`${props.activeChatId}:${typeof message?.id === "string" ? message.id : index}`} {...props} message={message} />)}</>;
}
/**
* Resolve a `sourceInfo.filePath` against the captured page's project root.
*
* Source maps from different bundler/monorepo combos emit paths with
* different anchors:
*  - Vite, plain Next-Turbopack → already absolute (`/Users/.../src/foo.tsx`)
*  - Next + webpack → `./src/foo.tsx` relative to webpack rootDir
*  - Nx + Next + webpack → `../../libs/foo.tsx` (escapes the app root into
*     workspace `libs/`)
*
* `root` should be the WEBPACK ROOTDIR (where `next dev` runs from), not
* the workspace root — that's what `./` and `../` resolve from. The capture
* pipeline auto-detects this when possible (`detectProjectRoot`); when it
* falls back to the manual picker, we trust the user's pick as the anchor.
*
* Already-absolute paths pass through unchanged.
*/
function _temp9$2(item_0) {
  return item_0.type === "text";
}
function _temp8$2(item) {
  return item.type === "text";
}
function resolveAgainstRoot(filePath, root) {
  if (!filePath) return filePath;
  if (root && filePath.startsWith(root + "/")) return filePath;
  if (isLikelyFilesystemPath(filePath)) return filePath;
  if (!root) return filePath;
  let rel = filePath;
  if (rel.startsWith("/")) rel = rel.slice(1);
  if (rel.startsWith("./")) rel = rel.slice(2);
  let base = root.replace(/[\\/]+$/, "");
  while (rel.startsWith("../")) {
    rel = rel.slice(3);
    const slash = Math.max(base.lastIndexOf("/"), base.lastIndexOf("\\"));
    if (slash <= 0) break;
    base = base.slice(0, slash);
  }
  return `${base}/${rel}`;
}
/**
* Mirrors `isLikelyFilesystemPath` in `fiberExtract.ts`. Duplicated here to
* avoid importing the whole capture-utils module just for one regex.
*/
function isLikelyFilesystemPath(p) {
  if (!p) return false;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  return /^\/(?:Users|home|root|opt|srv|usr|var|tmp|private|Volumes|mnt|data)\//.test(p);
}
/**
* Seed text for the "Import design system" entry points (chat suggestion,
* Components panel). Prefilled into the composer, never auto-sent; the user
* still has to point the AI at their codebase.
*/
var IMPORT_DESIGN_SYSTEM_PROMPT = "Import my design system from my local codebase (colours, typography, spacing, icons and components) into this file.";
/** Compact chat list date: relative for recent, short date otherwise. */
function formatChatDate(dateStr, locale) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  if (Math.abs(Date.now() - d.getTime()) < 7 * 864e5) return formatRelativeTime(d, locale);
  return formatDate(d, locale, { month: "short", day: "numeric" });
}
/** "mcp__notion__notion-create-pages" → "notion: notion-create-pages"; built-in tools keep their name. */
function describeApprovalTool(toolName) {
  const m = /^mcp__(.+?)__(.+)$/.exec(toolName);
  if (!m) return toolName;
  return `${m[1].split(":").pop() ?? m[1]}: ${m[2]}`;
}
function summarizeApprovalArgs(toolName, args) {
  if (toolName === "Bash" && typeof args?.command === "string") return args.command;
  let text;
  try {
    text = JSON.stringify(args ?? {}, null, 1);
  } catch {
    text = String(args);
  }
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}
var ChatPanelContent = (0, import_react.forwardRef)(function ChatPanel({
  store,
  selectedElementIds,
  componentIndex,
  activeTabInfo,
  contextPages,
  focusedComponent,
  messages,
  onMessagesChange,
  onSelectElement,
  iconLibraryNames,
  activeChatId,
  chatList,
  onNewChat,
  onSwitchChat,
  onArchiveChat,
  onArchiveAllChats,
  onOpenArchivedChats,
  onStreamStart,
  onStreamEnd,
  onRunComplete,
  onProjectFilesEdited,
  onPlanLimit,
  onFeedback,
  chatColor,
  chatColors,
  onOpenProjectSettings,
  variant = "default",
  allowedPaths,
  onAddAllowedPath,
  onRemoveAllowedPath,
  onClearAllowedPaths
}, ref) {
  const { t, i18n } = useTranslation("editor");
  const currentLocale = i18n.resolvedLanguage === "zh-CN" ? "zh-CN" : "en";
  const backend = useBackendOptional();
  const resolveAsset = useAssetResolver();
  const selectedElements = Array.from(selectedElementIds).map(id => getById(store, id)).filter(Boolean);
  const hasButtonComponent = Object.entries(componentIndex).some(([name, entry]) => name.toLowerCase() === "button" || String(entry?.exportName || "").toLowerCase() === "button");
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const workStartedAtRef = (0, import_react.useRef)(null);
  const [workElapsedMs, setWorkElapsedMs] = (0, import_react.useState)(0);
  const [error, setError] = (0, import_react.useState)(null);
  const localAgents = useLocalAgents({ includeModels: true });
  const selectedModel = localAgents.selectedModel;
  const selectedEffort = CLAUDE_EFFORT_LEVELS.includes(localAgents.selectedEffort) ? localAgents.selectedEffort : "high";
  const [showChatList, setShowChatList] = (0, import_react.useState)(false);
  const [lightboxUrl, setLightboxUrl] = (0, import_react.useState)(null);
  const [autoApprove, setAutoApprove] = (0, import_react.useState)(() => {
    try {
      const saved_0 = localStorage.getItem("bingo-auto-approve");
      return saved_0 === null ? true : saved_0 === "1";
    } catch {
      return true;
    }
  });
  const [hasComposerContent, setHasComposerContent] = (0, import_react.useState)(false);
  const claudeStatus = useClaudeStatus();
  const [setupOpen, setSetupOpen] = (0, import_react.useState)(false);
  const showClaudeSetup = localAgents.selectedAgent === "claude" && claudeStatus.isDesktop && !claudeStatus.loading && !!claudeStatus.status && !isClaudeSetUp(claudeStatus.status);
  const autoApproveRef = (0, import_react.useRef)(autoApprove);
  const cliSessionIdRef = (0, import_react.useRef)(crypto.randomUUID());
  const cliMessageCountRef = (0, import_react.useRef)(0);
  const {
    viewportRef: messagesScrollRef,
    contentRef: messagesContentRef,
    atBottom: messagesAtBottom,
    scrollToBottom: scrollMessagesToBottom
  } = useChatScroll();
  const inputRef = (0, import_react.useRef)(null);
  const abortControllerRef = (0, import_react.useRef)(null);
  const oneShotModelRef = (0, import_react.useRef)(null);
  const updateComposerContentState = (0, import_react.useCallback)(() => {
    const input = inputRef.current;
    if (!input) {
      setHasComposerContent(false);
      return;
    }
    setHasComposerContent(Boolean(input.textContent?.trim() || input.querySelector("[data-ref-id]")));
  }, []);
  const onTroubleshoot = (0, import_react.useCallback)(report => {
    const input_0 = inputRef.current;
    if (!input_0) return;
    const prompt = t("chat.prompts.troubleshoot", { report });
    input_0.append(document.createTextNode(`${input_0.textContent ? "\n\n" : ""}${prompt}`));
    updateComposerContentState();
    requestAnimationFrame(() => {
      input_0.focus();
      const range = document.createRange();
      range.selectNodeContents(input_0);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, [t, updateComposerContentState]);
  (0, import_react.useEffect)(() => {
    if (variant !== "sidebar-v2") return;
    const input_1 = inputRef.current;
    if (!input_1) return;
    const pane = input_1.closest("[data-state]");
    const focusIfVisible = () => {
      if (input_1.closest(".hidden")) return;
      if (pane?.getAttribute("data-state") === "inactive") return;
      requestAnimationFrame(() => input_1.focus());
    };
    focusIfVisible();
    if (!pane) return;
    const observer = new MutationObserver(focusIfVisible);
    observer.observe(pane, {
      attributes: true,
      attributeFilter: ["data-state"]
    });
    return () => observer.disconnect();
  }, [variant]);
  (0, import_react.useEffect)(() => {
    if (!isLoading) return;
    const updateElapsed = () => {
      setWorkElapsedMs(workStartedAtRef.current ? Date.now() - workStartedAtRef.current : 0);
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1e3);
    return () => window.clearInterval(timer);
  }, [isLoading]);
  const applyComposerSuggestion = (0, import_react.useCallback)(suggestion => {
    const input_2 = inputRef.current;
    if (!input_2) return;
    input_2.textContent = suggestion;
    updateComposerContentState();
    requestAnimationFrame(() => {
      input_2.focus();
      const range_0 = document.createRange();
      range_0.selectNodeContents(input_2);
      range_0.collapse(false);
      const selection_0 = window.getSelection();
      selection_0?.removeAllRanges();
      selection_0?.addRange(range_0);
    });
  }, [updateComposerContentState]);
  const inlineComposerRef = (0, import_react.useRef)(null);
  const [referenceMounts, setReferenceMounts] = (0, import_react.useState)([]);
  const contextRefs = referenceMounts.map(mount => mount.reference);
  const [pendingAttachments, setPendingAttachments] = (0, import_react.useState)(0);
  const addContextRef = (0, import_react.useCallback)(ref_0 => {
    inlineComposerRef.current?.insertSelection([ref_0], false);
    updateComposerContentState();
  }, [updateComposerContentState]);
  const removeContextRef = (0, import_react.useCallback)(id_0 => {
    inlineComposerRef.current?.removeReferences(id_0);
  }, []);
  const selectedRefs = selectedElements.map(elementReference);
  const [dismissedSelection, setDismissedSelection] = (0, import_react.useState)(null);
  const selectionRefs = selectedRefs.filter(ref_1 => !(dismissedSelection?.selection === selectedElementIds && dismissedSelection.ids.has(ref_1.id)) && !contextRefs.some(inline => inline.id === ref_1.id));
  const removeSelectionItem = id_1 => {
    setDismissedSelection(previous => ({
      selection: selectedElementIds,
      ids: new Set([...(previous?.selection === selectedElementIds ? previous.ids : []), id_1])
    }));
  };
  (0, import_react.useLayoutEffect)(() => {
    if (!inputRef.current) return;
    const composer = inlineComposerRef.current ?? new InlineChatComposer(inputRef.current, true);
    inlineComposerRef.current = composer;
    composer.connect();
    const syncComposer = () => {
      syncInlineReferenceSpacing(inputRef.current);
      updateComposerContentState();
      const mounts = composer.getReferenceMounts();
      setReferenceMounts(previous_0 => previous_0.length === mounts.length && previous_0.every((mount_0, index) => mount_0 === mounts[index]) ? previous_0 : mounts);
    };
    syncComposer();
    const observer_0 = new MutationObserver(syncComposer);
    observer_0.observe(inputRef.current, {
      childList: true,
      characterData: true,
      subtree: true
    });
    return () => {
      composer.dispose();
      observer_0.disconnect();
    };
  }, [updateComposerContentState]);
  /** ⌘L inserts the current selection where the user last left the text cursor. */
  const pinSelection = (0, import_react.useCallback)(() => {
    inlineComposerRef.current?.insertSelection(selectedRefs, false);
    updateComposerContentState();
  }, [selectedRefs, updateComposerContentState]);
  const [slashQuery, setSlashQuery] = (0, import_react.useState)(null);
  const [slashIndex, setSlashIndex] = (0, import_react.useState)(0);
  const [slashCommands, setSlashCommands] = (0, import_react.useState)(null);
  const slashOpenRef = (0, import_react.useRef)(false);
  /** Query the user dismissed with Escape; the menu stays closed while they keep typing that token. */
  const slashDismissedRef = (0, import_react.useRef)(null);
  const slashCwd = allowedPaths?.[0];
  /** The `/query` token when the caret sits right after one and nothing but whitespace precedes it. */
  const readSlashToken = (0, import_react.useCallback)(() => {
    const input_3 = inputRef.current;
    const selection_1 = window.getSelection();
    if (!input_3 || !selection_1 || !selection_1.isCollapsed || selection_1.rangeCount === 0) return null;
    const node = selection_1.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE || !input_3.contains(node)) return null;
    const offset = selection_1.anchorOffset;
    const before = document.createRange();
    before.setStart(input_3, 0);
    before.setEnd(node, offset);
    const contents = before.cloneContents();
    contents.querySelectorAll("[data-ref-id]").forEach(chip => chip.remove());
    const m = /^\s*\/([\w:-]*)$/.exec(contents.textContent ?? "");
    if (!m) return null;
    return {
      node,
      start: offset - m[1].length - 1,
      end: offset,
      query: m[1]
    };
  }, []);
  const closeSlashMenu = (0, import_react.useCallback)(() => {
    slashOpenRef.current = false;
    setSlashQuery(null);
  }, []);
  const syncSlashMenu = (0, import_react.useCallback)(() => {
    if (!claudeStatus.isDesktop) return;
    const token = readSlashToken();
    if (!token) {
      slashDismissedRef.current = null;
      if (slashOpenRef.current) closeSlashMenu();
      return;
    }
    const dismissed = slashDismissedRef.current;
    if (dismissed !== null) {
      if (token.query.startsWith(dismissed)) return;
      slashDismissedRef.current = null;
    }
    if (!slashOpenRef.current) {
      slashOpenRef.current = true;
      fetchSlashCommands(slashCwd).then(setSlashCommands);
    }
    setSlashQuery(token.query);
  }, [claudeStatus.isDesktop, readSlashToken, closeSlashMenu, slashCwd]);
  (0, import_react.useEffect)(() => {
    setSlashIndex(0);
  }, [slashQuery]);
  const slashOpen = slashQuery !== null;
  const filteredSlash = slashOpen ? [...filterSlashCommands(BINGO_COMMANDS, slashQuery), ...(slashCommands ? filterSlashCommands(slashCommands, slashQuery) : [])] : [];
  const applySlashCommand = (0, import_react.useCallback)(command => {
    const token_0 = readSlashToken();
    if (!token_0) return;
    const range_1 = document.createRange();
    range_1.setStart(token_0.node, token_0.start);
    range_1.setEnd(token_0.node, token_0.end);
    range_1.deleteContents();
    const text = document.createTextNode(`/${command.name} `);
    range_1.insertNode(text);
    range_1.setStartAfter(text);
    range_1.collapse(true);
    const selection_2 = window.getSelection();
    selection_2?.removeAllRanges();
    selection_2?.addRange(range_1);
    closeSlashMenu();
    updateComposerContentState();
  }, [readSlashToken, closeSlashMenu, updateComposerContentState]);
  const mentions = useContextMentions(inputRef, componentIndex, contextPages ?? (activeTabInfo ? [activeTabInfo] : []), addContextRef, updateComposerContentState, slashCwd);
  const {
    sync: syncMentions,
    close: closeMentions
  } = mentions;
  const syncComposerMenus = (0, import_react.useCallback)(() => {
    syncSlashMenu();
    syncMentions();
  }, [syncSlashMenu, syncMentions]);
  const handleComposerInput = (0, import_react.useCallback)(() => {
    updateComposerContentState();
    syncComposerMenus();
  }, [updateComposerContentState, syncComposerMenus]);
  const [composerFocused, setComposerFocused] = (0, import_react.useState)(false);
  const handleComposerFocus = (0, import_react.useCallback)(() => {
    setComposerFocused(true);
    syncComposerMenus();
  }, [syncComposerMenus]);
  const handleComposerBlur = (0, import_react.useCallback)(() => {
    setComposerFocused(false);
    closeSlashMenu();
    closeMentions();
  }, [closeSlashMenu, closeMentions]);
  /** "Skills" in the + menu: start the message with `/` so the picker opens. */
  const openSkillsMenu = (0, import_react.useCallback)(() => {
    const input_4 = inputRef.current;
    if (!input_4) return;
    input_4.focus();
    const walker = document.createTreeWalker(input_4, NodeFilter.SHOW_TEXT);
    let node_0 = walker.nextNode();
    while (node_0 && !node_0.data.trim()) node_0 = walker.nextNode();
    const token_1 = node_0 && /^\s*\/[\w:-]*/.exec(node_0.data);
    let offset_0;
    if (node_0 && token_1) offset_0 = token_1[0].length;else {
      node_0 = document.createTextNode(input_4.textContent?.trim() ? "/ " : "/");
      input_4.prepend(node_0);
      offset_0 = 1;
    }
    const range_2 = document.createRange();
    range_2.setStart(node_0, offset_0);
    range_2.collapse(true);
    const selection_3 = window.getSelection();
    selection_3?.removeAllRanges();
    selection_3?.addRange(range_2);
    updateComposerContentState();
    slashDismissedRef.current = null;
    syncSlashMenu();
  }, [updateComposerContentState, syncSlashMenu]);
  const canSend = pendingAttachments === 0 && (hasComposerContent || contextRefs.length > 0 || selectionRefs.length > 0);
  const hasFolder = claudeStatus.isDesktop && (allowedPaths?.length ?? 0) > 0;
  const parseInput = (0, import_react.useCallback)(() => {
    if (!inputRef.current) return {
      text: "",
      refs: []
    };
    const draft = inlineComposerRef.current?.parseInput() ?? {
      text: "",
      refs: [],
      mentions: []
    };
    return {
      ...draft,
      refs: [...draft.refs, ...selectionRefs.filter(ref_2 => !draft.refs.some(inline_0 => inline_0.id === ref_2.id))]
    };
  }, [selectionRefs]);
  const streamingContentRef = (0, import_react.useRef)("");
  const persistedAssistantMessageIdRef = (0, import_react.useRef)(null);
  const [activityTimeline, _setActivityTimeline] = (0, import_react.useState)([]);
  const commitActivityTimeline = useBackgroundVisualCommit(_setActivityTimeline);
  const activityTimelineRef = (0, import_react.useRef)([]);
  const setActivityTimeline = (0, import_react.useCallback)(val => {
    const next = typeof val === "function" ? val(activityTimelineRef.current) : val;
    activityTimelineRef.current = next;
    commitActivityTimeline(next, next.length === 0);
  }, [commitActivityTimeline]);
  const thinkingOffsetRef = (0, import_react.useRef)(0);
  const [streamingScreenshots, _setStreamingScreenshots] = (0, import_react.useState)([]);
  const streamingScreenshotsRef = (0, import_react.useRef)([]);
  const setStreamingScreenshots = (0, import_react.useCallback)(val_0 => {
    const next_0 = typeof val_0 === "function" ? val_0(streamingScreenshotsRef.current) : val_0;
    streamingScreenshotsRef.current = next_0;
    _setStreamingScreenshots(next_0);
  }, []);
  const [fileWriteStream, setFileWriteStream] = (0, import_react.useState)(null);
  const [thinking, setThinking] = (0, import_react.useState)(false);
  const [pendingApprovals, setPendingApprovals] = (0, import_react.useState)([]);
  const [debugMessages, setDebugMessages] = (0, import_react.useState)([]);
  const [folderAccessRequest, setFolderAccessRequest] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!new URLSearchParams(window.location.search).has("projectTab") || !activeChatId) return;
    const source = `chat:${activeChatId}`;
    window.api.send("project-tabs:status", { source,
      status: pendingApprovals.length || folderAccessRequest ? "attention" : isLoading ? "running" : error ? "error" : "idle" });
    return () => window.api.send("project-tabs:status", { source, status: "idle" });
  }, [activeChatId, pendingApprovals.length, folderAccessRequest, isLoading, error]);
  const answerFolderAccess = (0, import_react.useCallback)((ids, granted, path) => {
    setFolderAccessRequest(null);
    const invoke = window.api?.invoke;
    if (typeof invoke !== "function") return;
    for (const requestId of ids) invoke("folder_access_response", {
      requestId,
      granted,
      path
    }).catch(() => {});
  }, []);
  (0, import_react.useEffect)(() => {
    if (!folderAccessRequest) return;
    const {
      ids: ids_0
    } = folderAccessRequest;
    return subscribeFolderShared(path_0 => answerFolderAccess(ids_0, true, path_0));
  }, [folderAccessRequest, answerFolderAccess]);
  const writeStreamPath = fileWriteStream?.path;
  (0, import_react.useEffect)(() => {
    publishAiWriteTarget(writeStreamPath && activeChatId ? {
      chatId: activeChatId,
      path: writeStreamPath
    } : null);
    return () => publishAiWriteTarget(null);
  }, [writeStreamPath, activeChatId]);
  const handleApproval = (approvalId, approved) => {
    setPendingApprovals(prev => prev.filter(a => a.approvalId !== approvalId));
    if (typeof window !== "undefined" && window.api?.invoke) window.api.invoke("mcp_tool_approval", {
      approvalId,
      approved
    });
  };
  const toggleAutoApprove = on => {
    setAutoApprove(on);
    autoApproveRef.current = on;
    try {
      localStorage.setItem("bingo-auto-approve", on ? "1" : "0");
    } catch {}
  };
  const handleSubmit = (0, import_react.useCallback)(async () => {
    const overrideModel = oneShotModelRef.current;
    const {
      text: text_0,
      refs,
      mentions: mentions_0
    } = parseInput();
    if (!text_0 && refs.length === 0) return;
    if (isLoading || pendingAttachments > 0 || localAgents.loading || localAgents.saving) return;
    if (localAgents.error || !localAgents.selectedAgent) {
      setError({ code: "not_installed", title: t("agent.noInstalled", { ns: "settings" }), message: t(localAgents.error ? "agent.detectError" : "agent.setupHint", { ns: "settings" }) });
      return;
    }
    if (!activeChatId) {
      setError({
        code: "no_active_chat",
        title: "No active chat",
        message: "Create or select a chat before sending."
      });
      return;
    }
    if (showClaudeSetup) {
      setSetupOpen(true);
      return;
    }
    oneShotModelRef.current = null;
    const submitModel = overrideModel ?? selectedModel;
    if (overrideModel !== null) {
      localAgents.selectModel(overrideModel);
    }
    const userMessage = {
      id: generateMessageId(),
      role: "user",
      content: text_0,
      inlineRefs: refs.length > 0 ? refs : void 0,
      referenceMentions: mentions_0
    };
    const requestId = crypto.randomUUID();
    const newMessages = [...messages, userMessage];
    scrollMessagesToBottom();
    onMessagesChange(newMessages);
    const run = {
      durationMs: 0,
      outcome: "completed",
      canvasWrites: 0,
      codeWrites: 0
    };
    if (inputRef.current) inlineComposerRef.current?.reset([]);
    updateComposerContentState();
    workStartedAtRef.current = Date.now();
    setWorkElapsedMs(0);
    setIsLoading(true);
    if (activeChatId) onStreamStart?.(activeChatId);
    setActivityTimeline([]);
    thinkingOffsetRef.current = 0;
    streamingContentRef.current = "";
    persistedAssistantMessageIdRef.current = null;
    setFileWriteStream(null);
    setThinking(false);
    setPendingApprovals([]);
    setFolderAccessRequest(null);
    setDebugMessages([]);
    setError(null);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const toolResultsWithIds = [];
    try {
      const attachedElements = refs.filter(r => r.type === "element").map(r_0 => {
        if (!getById(store, r_0.id)) return null;
        return {
          id: r_0.id,
          el: storeSubtreeToLegacyNested(store, r_0.id)
        };
      }).filter(p => p !== null);
      const inlineRefsForContext = refs.flatMap(r_1 => r_1.type === "connection" || r_1.type === "folder" || r_1.type === "component" || r_1.type === "page" ? [] : [{
        type: r_1.type,
        id: r_1.id,
        name: r_1.name,
        data: r_1.data,
        elementKind: r_1.elementKind
      }]);
      if (attachedElements.length > 0) {
        const shotResults = await Promise.all(attachedElements.slice(0, 3).map(async ({
          id: id_2
        }) => {
          const dataUrl = await captureElementScreenshot(id_2);
          return dataUrl ? {
            id: id_2,
            dataUrl
          } : null;
        }));
        for (const shot of shotResults) {
          if (!shot) continue;
          const imgId = `ref-shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          inlineRefsForContext.push({
            type: "image",
            id: imgId,
            name: t("chat.screenshotOfElement", { id: shot.id }),
            data: shot.dataUrl
          });
        }
        const imageUrls = [];
        for (const {
          id: id_3
        } of attachedElements) imageUrls.push(...extractImageUrlsFromSubtree(store, id_3, resolveAsset));
        const imageResults = await Promise.all(imageUrls.slice(0, 5).map(async ({
          url,
          name: name_0
        }) => {
          const dataUrl_0 = await fetchImageAsDataUrl(url);
          return dataUrl_0 ? {
            name: name_0,
            dataUrl: dataUrl_0
          } : null;
        }));
        for (const result of imageResults) if (result) {
          const imgId_0 = `canvas-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          inlineRefsForContext.push({
            type: "image",
            id: imgId_0,
            name: result.name,
            data: result.dataUrl
          });
        }
      }
      const chatMessages = newMessages.flatMap(m_0 => {
        if (!m_0.content && m_0.role !== "user" && !m_0.toolResults) return [];
        let content = m_0.content || "";
        if (m_0.role === "assistant" && m_0.toolResults && m_0.toolResults.length > 0) {
          const actionLines = m_0.toolResults.map(r_2 => {
            const id_4 = r_2.createdElementId || r_2.createdElementIds?.[0] || r_2.payload?.elementId || "";
            if (r_2.type === "add_jsx") return `  → Added: ${r_2.createdElementIds?.join(", ") || id_4 || "element"}`;
            if (r_2.type === "update_jsx") return `  → Updated: ${r_2.payload?.elementId || id_4}`;
            if (r_2.type === "delete_element") return `  → Deleted: ${r_2.payload?.elementId || id_4}`;
            if (r_2.type === "replace_with_component") return `  → Replaced ${r_2.payload?.elementId} with ${r_2.payload?.componentName}`;
            if (r_2.type === "Read") return `  → Read: ${r_2.payload?.path}`;
            if (r_2.type === "Write") return `  → Wrote: ${r_2.payload?.path}${r_2.payload?.componentRegistered ? ` (registered ${r_2.payload.componentName})` : ""}`;
            if (r_2.type === "Glob") return `  → Found: ${r_2.payload?.matches?.length || 0} files`;
            return null;
          }).filter(Boolean);
          if (actionLines.length > 0) content = (content || "") + "\n[Actions]\n" + actionLines.join("\n");
          if (!content) content = "[Applied changes]\n" + actionLines.join("\n");
        }
        if (m_0.role === "user" && m_0.inlineRefs && m_0.inlineRefs.length > 0) {
          content = inlineChatPrompt(content, m_0.inlineRefs, m_0.referenceMentions);
          const refLines = [];
          const connectionNames = [];
          for (const ref_3 of m_0.inlineRefs) {
            const projectLine = projectReferenceLine(ref_3);
            if (projectLine) refLines.push(projectLine);else if (ref_3.type === "connection") connectionNames.push(ref_3.name);else if (ref_3.type === "element") refLines.push(`  → Element: ${ref_3.name} (${ref_3.id})`);else if (ref_3.type === "folder") refLines.push(`  → Folder (this request only): ${JSON.stringify(ref_3.path)}`);else if (ref_3.type === "image") refLines.push(`  → Image: ${ref_3.name}`);else refLines.push(`  → File: ${ref_3.name}`);
          }
          if (refLines.length > 0) content += "\n[References]\n" + refLines.join("\n");
          content += buildConnectionPrompt(connectionNames);
        }
        return content ? [{
          role: m_0.role,
          content
        }] : [];
      });
      let fullText = "";
      if (backend) {
        const generator = backend.chat(chatMessages, [], {
          elements: toWire(store),
          componentIndex,
          attachedElements: attachedElements.length > 0 ? attachedElements.map(p_0 => p_0.el) : void 0,
          iconLibraryNames,
          agent: localAgents.selectedAgent,
          model: submitModel || undefined,
          effort: submitModel && localAgents.selectedAgent === "claude" ? resolveClaudeEffort(submitModel, selectedEffort) : undefined,
          selectedElementIds: Array.from(selectedElementIds),
          inlineRefs: inlineRefsForContext,
          promptFolders: refs.flatMap(ref_4 => ref_4.type === "folder" && ref_4.path ? [ref_4.path] : []),
          activeTabInfo,
          focusedComponent,
          autoApprove: autoApproveRef.current,
          cliMessageIndex: cliMessageCountRef.current,
          chatTabId: activeChatId,
          requestId,
          userMessage,
          chatTitle: chatList?.find(chat => chat.id === activeChatId)?.title ?? void 0,
          signal: abortController.signal
        });
        for await (const event of generator) {
          if (abortController.signal.aborted) break;
          if (event.type === "run_started") {
            persistedAssistantMessageIdRef.current = event.assistantMessageId ?? null;
          } else if (event.type === "persistence_error") {
            setError({
              code: "chat_not_saved",
              title: "Chat not saved",
              message: event.message || "The response is visible but could not be saved."
            });
          } else if (event.type === "run_saved") {
          } else if (event.type === "thinking") {
            setThinking(true);
            const newText = event.text || "";
            setActivityTimeline(prev => {
              const last = prev[prev.length - 1];
              const segment = newText.slice(thinkingOffsetRef.current);
              if (!segment) return prev;
              if (last?.type === "thinking") return [...prev.slice(0, -1), {
                type: "thinking",
                text: last.text + segment
              }];
              return [...prev, {
                type: "thinking",
                text: segment
              }];
            });
            thinkingOffsetRef.current = newText.length;
          } else if (event.type === "thinking_progress") setThinking(true);else if (event.type === "text") {
            setThinking(false);
            fullText += event.text;
            streamingContentRef.current = fullText;
            setActivityTimeline(prev => {
              const last = prev[prev.length - 1];
              if (last?.type === "text") return [...prev.slice(0, -1), {
                type: "text",
                text: last.text + event.text
              }];
              return [...prev, {
                type: "text",
                text: event.text
              }];
            });
          } else if (event.type === "tool_use") {
            thinkingOffsetRef.current = 0;
            setThinking(false);
            const path = event.input?.file_path || event.input?.path;
            const content = event.input?.content || event.input?.new_string;
            if (isFileWriteActivity(event.name) && typeof content === "string") setFileWriteStream({
              path: typeof path === "string" && path ? path : "file",
              content
            });
            setActivityTimeline(prev => upsertPendingTool(prev, event));
          } else if (event.type === "tool_approval") {
            if (autoApproveRef.current && event.origin !== "cli") {
              if (typeof window !== "undefined" && window.api?.invoke) window.api.invoke("mcp_tool_approval", {
                approvalId: event.approvalId,
                approved: true
              });
            } else setPendingApprovals(prev => [...prev, {
              approvalId: event.approvalId,
              toolName: event.toolName,
              args: event.args,
              origin: event.origin ?? "bingo"
            }]);
          } else if (event.type === "folder_access_needed") setFolderAccessRequest(prev => prev ? {
            ids: [...prev.ids, event.requestId],
            path: prev.path ?? event.path
          } : {
            ids: [event.requestId],
            path: event.path
          });else if (event.type === "mcp_tool_result") {
            if (isFileWriteActivity(event.name)) setFileWriteStream(null);
            setActivityTimeline(prev => {
              const next = [...prev];
              const resultOperationId = event.operation?.operationId;
              for (let i = next.length - 1; i >= 0; i--) {
                const item = next[i];
                if (resultOperationId && item.id && item.id !== resultOperationId) continue;
                if (item.type === "tool" && item.pending === true && getBaseToolName(item.name || "") === getBaseToolName(event.name)) {
                  next[i] = {
                    ...item,
                    pending: false,
                    input: {
                      ...item.input,
                      ...slimToolInput(event.args)
                    }
                  };
                  return next;
                }
              }
              return prev;
            });
            if (event.reason && isPlanLimitReason(event.reason)) {
              const message = event.error || "This action is over the limit for your plan.";
              onPlanLimit?.({
                reason: event.reason,
                message
              });
              setError({
                code: "plan_limit",
                title: planLimitTitle(event.reason),
                message
              });
            }
            const toolResult = normalizeToolResult({ ...event, type: event.name });
            if (!["Write", "Edit", "Delete", "add_jsx", "update_jsx", "delete_element"].includes(toolResult.type)) continue;
            toolResultsWithIds.push(toolResult);
            if (event.success) {
              if (event.name.startsWith("canvas_")) run.canvasWrites++;else run.codeWrites++;
            }
            if (event.success && onProjectFilesEdited && (event.name === "project_write" || event.name === "project_edit") && typeof event.args?.file_path === "string") onProjectFilesEdited([event.args.file_path]);
          } else if (event.type === "screenshot") setStreamingScreenshots(prev => [...prev, {
            dataUrl: event.dataUrl,
            elementId: event.elementId
          }]);else if (event.type === "error") {
            setActivityTimeline([]);
            thinkingOffsetRef.current = 0;
            setStreamingScreenshots([]);
            setFileWriteStream(null);
            if (event.errorInfo) setError(event.errorInfo);else setError(classifyFrontendError(new Error(event.error)));
            run.outcome = "errored";
            return;
          }
        }
      } else {
        setError(classifyFrontendError(new Error("AI chat is not available — no backend configured")));
        return;
      }
      if (abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const savedActivity = activityTimelineRef.current.length > 0 ? activityTimelineRef.current.map(item_0 => {
        if (item_0.type === "thinking") return {
          type: "thinking",
          text: item_0.text
        };
        if (item_0.type === "text") return {
          type: "text",
          text: item_0.text
        };
        return {
          type: "tool",
          name: item_0.name,
          input: slimToolInput(item_0.input)
        };
      }) : void 0;
      const savedScreenshots = streamingScreenshotsRef.current.length > 0 ? [...streamingScreenshotsRef.current] : void 0;
      const savedToolResults = toolResultsWithIds.length > 0 ? getDisplayToolResults(toolResultsWithIds, id => getById(store, id)) : void 0;
      streamingContentRef.current = "";
      setActivityTimeline([]);
      thinkingOffsetRef.current = 0;
      setStreamingScreenshots([]);
      setFileWriteStream(null);
      const assistantMessage = {
        id: persistedAssistantMessageIdRef.current ?? generateMessageId(),
        role: "assistant",
        content: fullText,
        toolResults: savedToolResults,
        workTargets: chatWorkTargets(toolResultsWithIds),
        activity: savedActivity,
        workDurationMs: workStartedAtRef.current ? Date.now() - workStartedAtRef.current : void 0,
        screenshots: savedScreenshots
      };
      onMessagesChange([...newMessages, assistantMessage]);
      cliMessageCountRef.current++;
    } catch (err) {
      run.outcome = err instanceof DOMException && err.name === "AbortError" ? "cancelled" : "errored";
      if (err instanceof DOMException && err.name === "AbortError") {
        const partialText = streamingContentRef.current;
        const partialActivity = activityTimelineRef.current.length > 0 ? activityTimelineRef.current.map(item => ({
          ...item
        })) : void 0;
        const partialScreenshots = streamingScreenshotsRef.current.length > 0 ? [...streamingScreenshotsRef.current] : void 0;
        streamingContentRef.current = "";
        setActivityTimeline([]);
        thinkingOffsetRef.current = 0;
        setStreamingScreenshots([]);
        setFileWriteStream(null);
        if (partialText || partialActivity?.length) {
          const partialMessage = {
            id: persistedAssistantMessageIdRef.current ?? generateMessageId(),
            role: "assistant",
            content: partialText,
            workTargets: chatWorkTargets(toolResultsWithIds),
            activity: partialActivity,
            screenshots: partialScreenshots,
            workDurationMs: workStartedAtRef.current ? Date.now() - workStartedAtRef.current : void 0
          };
          onMessagesChange([...newMessages, partialMessage]);
        }
      } else {
        setActivityTimeline([]);
        thinkingOffsetRef.current = 0;
        setStreamingScreenshots([]);
        setFileWriteStream(null);
        const errObj = err;
        if (errObj.errorInfo) setError(errObj.errorInfo);else setError(classifyFrontendError(err));
      }
    } finally {
      abortControllerRef.current = null;
      setFolderAccessRequest(null);
      setIsLoading(false);
      run.durationMs = workStartedAtRef.current ? Date.now() - workStartedAtRef.current : 0;
      workStartedAtRef.current = null;
      inputRef.current?.focus();
      if (activeChatId) onStreamEnd?.(activeChatId);
      onRunComplete?.(run);
    }
  }, [localAgents.selectedAgent, localAgents.selectModel, localAgents.loading, localAgents.saving, localAgents.error, t, isLoading, scrollMessagesToBottom, pendingAttachments, activeChatId, showClaudeSetup, selectedModel, selectedEffort, messages, onMessagesChange, store, componentIndex, iconLibraryNames, selectedElementIds, activeTabInfo, focusedComponent, backend, resolveAsset, parseInput, updateComposerContentState, setActivityTimeline, setStreamingScreenshots, onStreamEnd, onRunComplete, onProjectFilesEdited, onPlanLimit, onStreamStart, chatList]);
  const attachFiles = (0, import_react.useCallback)(async items => {
    if (items.length === 0) return;
    inlineComposerRef.current?.prepareInsertion();
    setPendingAttachments(count => count + items.length);
    const results = await Promise.allSettled(items.map(readPromptAttachment));
    setPendingAttachments(count_0 => count_0 - items.length);
    const failures = [];
    for (const result_0 of results) if (result_0.status === "fulfilled") addContextRef(result_0.value);else failures.push(result_0.reason instanceof Error ? result_0.reason.message : String(result_0.reason));
    if (failures.length > 0) setError({
      code: "attach_failed",
      title: "Could not attach",
      message: failures.join("\n")
    });
  }, [addContextRef]);
  (0, import_react.useImperativeHandle)(ref, () => ({
    attachDroppedFiles: data => {
      attachFiles(getDroppedAttachments(data));
    },
    addSelectedElements: elementIds => {
      if (elementIds) {
        const references = elementIds.flatMap(id_5 => {
          const element = getById(store, id_5);
          return element ? [elementReference(element)] : [];
        });
        inlineComposerRef.current?.insertSelection(references, false);
        updateComposerContentState();
      } else pinSelection();
      inputRef.current?.focus();
    },
    setInputText: text_1 => {
      const input_6 = inputRef.current;
      if (!input_6) return;
      input_6.textContent = text_1;
      updateComposerContentState();
      requestAnimationFrame(() => {
        input_6.focus();
        const range_3 = document.createRange();
        range_3.selectNodeContents(input_6);
        range_3.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range_3);
      });
    },
    sendMessage: (text_2, model) => {
      const input_7 = inputRef.current;
      if (!input_7) return;
      oneShotModelRef.current = model ?? null;
      input_7.textContent = text_2;
      updateComposerContentState();
      setTimeout(() => {
        handleSubmit();
      }, 0);
    },
    setSaveToCodePrompt: (descriptions, sourceUrl, _componentNames, _capturedElementId, canvasId, screenshotDataUrl, projectRoot, componentEdit) => {
      const input_8 = inputRef.current;
      if (!input_8) return;
      const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const codeOps = descriptions.filter(d => !d.canvasOnly);
      const astOps = codeOps.filter(d_0 => d_0.method === "ast");
      const aiOps = codeOps.filter(d_1 => d_1.method === "ai");
      const formatOp = d_2 => {
        let srcPart = "";
        if (d_2.sourceInfo?.filePath) {
          const resolved = resolveAgainstRoot(d_2.sourceInfo.filePath, projectRoot);
          srcPart = ` (${d_2.sourceInfo.lineNumber ? `${resolved}:${d_2.sourceInfo.lineNumber}` : resolved})`;
        }
        const summary = d_2.summary.replace(/\s+@\s+\S+:\d+/g, "");
        let line = `- [${d_2.op.type}] ${esc(d_2.componentName)}${esc(srcPart)}: ${esc(summary)}`;
        if (d_2.targetElementId && canvasId) line += ` → canvas_read canvas_id=${esc(canvasId)} element_id=${esc(d_2.targetElementId)}`;else if (d_2.targetElementId) line += ` → canvas_read element_id=${esc(d_2.targetElementId)}`;
        line += "\n";
        return line;
      };
      let opList = "";
      if (astOps.length > 0) {
        opList += `\n\n${t("chat.saveToCode.simpleEdits")}\n`;
        for (const d_3 of astOps) opList += formatOp(d_3);
      }
      if (aiOps.length > 0) {
        opList += `\n\n${t("chat.saveToCode.structuralEdits")}\n`;
        for (const d_4 of aiOps) opList += formatOp(d_4);
      }
      let html = !!componentEdit || sourceUrl.startsWith("component://") ? t("chat.saveToCode.applyComponentDefinition") : t("chat.saveToCode.applySource", { source: esc(sourceUrl) });
      if (componentEdit) {
        html += `<br>${t("chat.saveToCode.targetFile", { file: esc(componentEdit.path || componentEdit.componentName) })}`;
        html += `<br>${t("chat.saveToCode.component", { component: esc(componentEdit.componentName) })}`;
        html += `<br><br>${t("chat.saveToCode.liveSnapshot")}`;
        if (componentEdit.propsJson && componentEdit.propsJson !== "{}") html += `<br><br>${t("chat.saveToCode.instanceProps", { props: esc(componentEdit.propsJson) })}`;
      }
      if (projectRoot) html += `<br>${t("chat.saveToCode.projectRoot", { root: esc(projectRoot) })}`;
      if (screenshotDataUrl) html += `<br><br>${t("chat.saveToCode.screenshotAttached")}`;else html += `<br><br>${t("chat.saveToCode.takeScreenshotStep")}`;
      html += `<br><br>${t("chat.saveToCode.readCanvasStep", { step: screenshotDataUrl ? 1 : 2 })}`;
      html += `<br><br>${t("chat.saveToCode.editSourceStep", { step: screenshotDataUrl ? 2 : 3 })}`;
      if (opList) html += `<br><br>${t("chat.saveToCode.operations")}${opList.replace(/\n/g, "<br>")}`;
      if (aiOps.length > 0) html += `<br><br>${t("chat.saveToCode.askBeforeEditing")}`;
      if (descriptions.length > 0) {
        html += "<br>";
        for (const d_5 of descriptions) {
          const truncatedSummary = d_5.summary.length > 60 ? d_5.summary.slice(0, 60) + "…" : d_5.summary;
          const badgeColor = d_5.method === "ast" ? "#2563eb" : "#d97706";
          const badgeBg = d_5.method === "ast" ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)";
          const methodLabel = d_5.method === "ast" ? "AST" : "AI";
          html += `<span contenteditable="false" data-change-badge="true" style="display:inline-flex;align-items:center;gap:4px;font-size:var(--ed-chat-font-size);font-weight:500;color:${badgeColor};background-color:${badgeBg};border-radius:4px;padding:2px 8px;margin:2px;vertical-align:middle;user-select:none;"><span style="font-size:8px;font-weight:700;border-radius:2px;padding:0 3px;background:${badgeBg};color:${badgeColor};">${methodLabel}</span><span style="font-weight:600;flex-shrink:0;">${esc(d_5.componentName)}</span><span style="color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(truncatedSummary)}</span></span>`;
        }
      }
      input_8.innerHTML = html;
      if (screenshotDataUrl) addContextRef({
        type: "image",
        id: `save-to-code-screenshot-${Date.now()}`,
        name: t("chat.canvasScreenshot"),
        data: screenshotDataUrl
      });
      updateComposerContentState();
    }
  }), [pinSelection, addContextRef, attachFiles, updateComposerContentState, handleSubmit, store, t]);
  const handleStop = () => {
    abortControllerRef.current?.abort();
  };
  const handleKeyDown = e => {
    if (e.nativeEvent.isComposing) return;
    if (mentions.onKeyDown(e)) return;
    if (slashOpen) {
      const count_1 = filteredSlash.length;
      const current = filteredSlash[slashIndex];
      if (e.key === "ArrowDown" && count_1) {
        e.preventDefault();
        setSlashIndex(i => (i + 1) % count_1);
        return;
      }
      if (e.key === "ArrowUp" && count_1) {
        e.preventDefault();
        setSlashIndex(i_0 => (i_0 - 1 + count_1) % count_1);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        slashDismissedRef.current = slashQuery;
        closeSlashMenu();
        return;
      }
      if (current && (e.key === "Tab" || e.key === "Enter" && !e.shiftKey && current.name !== slashQuery)) {
        e.preventDefault();
        applySlashCommand(current);
        return;
      }
      if (e.key === "Enter") closeSlashMenu();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (isAddToPromptShortcut(e)) {
      e.preventDefault();
      e.stopPropagation();
      pinSelection();
    }
  };
  const handlePaste = e_0 => {
    const items_0 = e_0.clipboardData?.items;
    if (!items_0) return;
    for (const item_1 of Array.from(items_0)) if (item_1.type.startsWith("image/")) {
      e_0.preventDefault();
      const file = item_1.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        addContextRef({
          type: "image",
          id: `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: t("chat.screenshotName"),
          data: base64
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    const pastedText = e_0.clipboardData?.getData("text/plain") || "";
    if (pastedText.startsWith("data:image/")) {
      e_0.preventDefault();
      addContextRef({
        type: "image",
        id: `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: t("chat.pastedImageName"),
        data: pastedText
      });
      return;
    }
    const imgMatch = (e_0.clipboardData?.getData("text/html") || "").match(/<img[^>]+src="(data:image\/[^"]+)"/);
    if (imgMatch) {
      e_0.preventDefault();
      addContextRef({
        type: "image",
        id: `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: t("chat.pastedImageName"),
        data: imgMatch[1]
      });
      return;
    }
  };
  const handleDrop = e_1 => {
    if (!e_1.dataTransfer.types.includes("Files")) return;
    e_1.preventDefault();
    e_1.stopPropagation();
    attachFiles(getDroppedAttachments(e_1.dataTransfer));
  };
  const attachInputRef = (0, import_react.useRef)(null);
  const localizedError = localizeChatError(t, error);
  return <div className={cn$2("flex h-full flex-col overflow-hidden bg-ed-background", variant === "default" && "pt-1")} onDrop={handleDrop} onDragOver={handleAttachmentDragOver}>{variant === "default" && <div className="flex min-w-0 items-center gap-2 px-3 pb-2 border-b border-ed-border">{chatColor ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
        backgroundColor: chatColor
      }} /> : <BingoLogo className="size-4 shrink-0" />}{chatList && chatList.length > 0 ? <div className="min-w-0 flex-1 overflow-hidden">{<Root2$2 open={showChatList} onOpenChange={setShowChatList}>{<Trigger$1 asChild={true}>{<Button type="button" variant="ghost" size="text" isChildText={false} className="flex w-full min-w-0 max-w-full shrink items-center justify-start gap-1 overflow-hidden text-ed-chat font-medium text-ed-foreground hover:text-ed-foreground/80">{<span className="min-w-0 truncate">{chatList.find(c => c.id === activeChatId)?.title || t("chat.newChat")}</span>}{<CaretDownIcon width={12} height={12} className="text-ed-muted-foreground shrink-0" />}</Button>}</Trigger$1>}{<Content2 align="start" side="bottom" sideOffset={4} collisionPadding={8} onOpenAutoFocus={e_2 => e_2.preventDefault()} onCloseAutoFocus={e_3 => e_3.preventDefault()} className="w-72 bg-ed-background border border-ed-border rounded-lg shadow-lg z-50">{<ScrollArea viewportClassName="max-h-80 p-1">{chatList.map(chat => <div key={chat.id} className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] ${chat.id === activeChatId ? "bg-ed-muted text-ed-foreground" : "text-ed-muted-foreground hover:bg-ed-muted/50 hover:text-ed-foreground"}`}>{<Button variant="ghost" className="absolute inset-0 h-full w-full rounded-md bg-transparent hover:bg-transparent" aria-label={t("chat.openChat", { name: chat.title || t("chat.newChat") })} onClick={() => {
                  onSwitchChat?.(chat.id);
                  setShowChatList(false);
                }} />}{<span className="pointer-events-none relative w-2 h-2 rounded-full flex-shrink-0" style={{
                  backgroundColor: chatList && chatList.length > 1 ? chatColors?.get(chat.id) || "#2563eb" : "transparent"
                }} />}{<span className="pointer-events-none relative truncate flex-1 min-w-0">{chat.title || t("chat.newChat")}</span>}{<span className="pointer-events-none relative text-ed-muted-foreground flex-shrink-0 tabular-nums">{formatChatDate(chat.createdAt || chat.updatedAt, currentLocale)}</span>}{<IconBtn appearance="inline" className="relative shrink-0 text-ed-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" tooltip={t("chat.archiveChat", { name: chat.title || t("chat.newChat") })} label={t("chat.archiveChat", { name: chat.title || t("chat.newChat") })} disabled={!onArchiveChat || chat.id === activeChatId && isLoading} onClick={event => {
                  event.stopPropagation();
                  event.preventDefault();
                  onArchiveChat?.(chat.id);
                }}>{<ArchiveIcon />}</IconBtn>}</div>)}</ScrollArea>}</Content2>}</Root2$2>}</div> : <span className="min-w-0 flex-1 truncate text-ed-chat font-medium text-ed-foreground">{t("chat.assistant")}</span>}{<div className="ml-auto flex shrink-0 items-center gap-1.5">{onNewChat && <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => {
          onNewChat();
          cliSessionIdRef.current = crypto.randomUUID();
          cliMessageCountRef.current = 0;
        }} title={t("chat.newChat")} LeftIcon={PlusIcon} leftIconSize={14} />}{(onOpenProjectSettings || onArchiveAllChats || onOpenArchivedChats) && <DropdownMenu modal={false}>{<DropdownMenuTrigger asChild={true}>{<Button variant="ghost" size="icon-sm" className="h-6 w-6" title={t("chat.settings")} LeftIcon={SettingsIcon} leftIconSize={14} aria-label={t("chat.settings")} />}</DropdownMenuTrigger>}{<DropdownMenuContent align="end" sideOffset={4}>{onOpenArchivedChats && <DropdownMenuItem onSelect={onOpenArchivedChats}>{t("chat.archivedChats")}</DropdownMenuItem>}{onArchiveAllChats && <DropdownMenuItem disabled={!chatList || chatList.length === 0} onSelect={onArchiveAllChats}>{t("chat.archiveAllChats")}</DropdownMenuItem>}{onOpenProjectSettings && (onArchiveAllChats || onOpenArchivedChats) && <DropdownMenuSeparator />}{onOpenProjectSettings && <DropdownMenuItem onSelect={onOpenProjectSettings}>{t("chat.settings")}</DropdownMenuItem>}</DropdownMenuContent>}</DropdownMenu>}</div>}</div>}{<ScrollArea className="flex-1 bg-ed-background" viewportClassName="select-text px-3 pt-3 pb-5" viewportRef={messagesScrollRef}>{<div ref={messagesContentRef} className={cn$2("relative flex flex-col", variant === "sidebar-v2" ? "gap-5" : "gap-4")}>{messages.length === 0 && showClaudeSetup && <PanelEmptyState icon={<TerminalIcon width={24} height={24} className="text-ed-muted-foreground" />} title={t("chat.setupTitle")} description={t("chat.setupDescription")} actions={<Button size={variant === "sidebar-v2" ? "xs" : "default"} className="w-full" onClick={() => setSetupOpen(true)}>{t("chat.setupAction")}</Button>} />}{messages.length === 0 && !showClaudeSetup && (variant === "sidebar-v2" ? <div className="flex flex-1 items-center justify-center py-12">{<div className="flex w-full max-w-64 flex-col gap-1.5">{<span className="mb-1 text-center text-ed-chat text-ed-muted-foreground/60">{t("chat.tryAsking")}</span>}{[{
              label: t("chat.importDesignSystem"),
              prompt: t("chat.importDesignSystemPrompt")
            }, {
              label: t("chat.designProfileCard")
            }, {
              label: hasButtonComponent ? t("chat.showButtonVariants") : t("chat.makeButton")
            }, {
              label: t("chat.makeHeroVariations")
            }].map(({
              label,
              prompt: prompt_0
            }) => <Button key={label} type="button" size="xs" variant="secondary" isChildText={false} className="w-full justify-start px-3 font-normal text-ed-muted-foreground shadow-none hover:text-ed-foreground" onClick={() => applyComposerSuggestion(prompt_0 ?? label)}>{<span className="truncate">{label}</span>}</Button>)}</div>}</div> : <div className="flex flex-col items-center justify-center text-ed-muted-foreground text-ed-chat py-12 gap-2">{<p>{t("chat.askForDesignHelp")}</p>}{<p className="text-ed-chat text-ed-muted-foreground/60">{t("chat.selectionHint")}</p>}{<div className="mt-3 flex items-center gap-2 text-ed-chat">{<span className="text-ed-muted-foreground/70">{t("chat.approvals")}</span>}{<Tabs value={autoApprove ? "auto" : "ask"} onValueChange={value => toggleAutoApprove(value === "auto")} className="w-auto">{<TabsList size="xs" className="h-7 w-auto rounded-lg border border-ed-border bg-ed-muted/40">{<TabsTrigger value="ask" className="px-2">{t("chat.askFirst")}</TabsTrigger>}{<TabsTrigger value="auto" className="px-2">{t("chat.automatic")}</TabsTrigger>}</TabsList>}</Tabs>}</div>}</div>)}{<ChatTranscript messages={messages} store={store} variant={variant} activeChatId={activeChatId} onSelectElement={onSelectElement} onFeedback={onFeedback} onTroubleshoot={onTroubleshoot} onOpenScreenshot={setLightboxUrl} />}{isLoading && <div className="flex min-w-0 max-w-full items-start gap-2.5">{<div className="min-w-0 max-w-full">{activityTimeline.length > 0 ? <SequentialAssistantActivity activity={activityTimeline} durationMs={workElapsedMs} active={true} fileWriteStream={fileWriteStream} thinking={thinking} /> : <div className="flex items-center gap-1.5 text-ed-chat text-ed-muted-foreground/55">{<SpinnerIcon width={12} height={12} className="shrink-0 animate-spin" />}{<span>{t("chat.working", { duration: workElapsedMs >= 1e3 ? ` ${formatWorkDuration(workElapsedMs)}` : "" })}</span>}</div>}{streamingScreenshots.length > 0 && <div className="mt-2">{<ScreenshotChips screenshots={streamingScreenshots} onOpen={setLightboxUrl} />}</div>}{pendingApprovals.length > 0 && <div className="flex flex-col gap-2 mt-2">{pendingApprovals.map(approval => {
                const filePath = approval.args?.file_path || "";
                const shortPath = filePath ? filePath.split("/").slice(-2).join("/") : "file";
                const isFileTool = /write|edit|delete/i.test(approval.toolName);
                const actionKey = approval.toolName.includes("delete") || approval.toolName === "Delete" ? "deleteFile" : approval.toolName.includes("write") || approval.toolName === "Write" ? "writeFile" : "editFile";
                const title = approval.origin === "cli" && !isFileTool ? describeApprovalTool(approval.toolName) : t(`chat.${actionKey}`, { file: shortPath });
                return <div key={approval.approvalId} className="border border-ed-border rounded-lg p-2.5 bg-ed-muted/50">{<div className="flex items-center gap-1.5 text-ed-chat font-medium text-ed-foreground mb-1.5">{<WarningIcon$1 width={13} height={13} className="text-yellow-500 shrink-0" />}{<span className="truncate">{title}</span>}</div>}{approval.origin === "cli" && !isFileTool && <pre className="text-[11px] font-mono bg-ed-background rounded p-1.5 mb-1.5 max-h-24 overflow-y-auto border border-ed-border whitespace-pre-wrap break-all">{summarizeApprovalArgs(approval.toolName, approval.args)}</pre>}{(approval.toolName.includes("edit") || approval.toolName === "Edit") && approval.args?.old_string && <div className="text-[11px] font-mono bg-ed-background rounded p-1.5 mb-1.5 max-h-24 overflow-y-auto border border-ed-border">{<div className="text-red-400 line-through">{approval.args.old_string.slice(0, 200)}{approval.args.old_string.length > 200 ? "..." : ""}</div>}{<div className="text-emerald-400 mt-0.5">{approval.args.new_string?.slice(0, 200)}{(approval.args.new_string?.length || 0) > 200 ? "..." : ""}</div>}</div>}{(approval.toolName.includes("write") || approval.toolName === "Write") && <div className="text-ed-chat text-ed-muted-foreground mb-1.5">{approval.args?.content ? t("chat.lineCount", { count: approval.args.content.split("\n").length }) : t("chat.newFile")}</div>}{<div className="flex gap-1.5">{<Button type="button" onClick={() => handleApproval(approval.approvalId, true)} size="xs" className="gap-1 bg-emerald-600 px-2 text-ed-chat font-medium text-white hover:bg-emerald-500" LeftIcon={CheckIcon} leftIconSize={11}>{t("chat.approve")}</Button>}{<Button type="button" onClick={() => handleApproval(approval.approvalId, false)} variant="outline" size="xs" className="gap-1 border border-ed-border bg-ed-muted px-2 text-ed-chat font-medium text-ed-muted-foreground hover:bg-ed-muted/80" LeftIcon={XIcon} leftIconSize={11}>{t("chat.reject")}</Button>}</div>}</div>;
            })}</div>}</div>}</div>}{debugMessages.length > 0 && <div className="text-[11px] text-ed-muted-foreground/40 font-mono px-4 py-1 space-y-0.5">{debugMessages.map((msg, i_1) => <div key={i_1}>[debug] {msg}</div>)}</div>}{localizedError && <div className={cn$2("mx-3 my-2 rounded-lg border border-ed-destructive/30 bg-ed-destructive/5 p-3", variant === "sidebar-v2" ? "text-ed-chat" : "text-ed-chat")}>{<div className="flex items-start gap-2">{<WarningIcon$1 width={14} height={14} className="text-ed-destructive shrink-0 mt-0.5" />}{<div className="flex-1 min-w-0">{<div className="font-medium text-ed-destructive">{localizedError.title}</div>}{<div className="text-ed-muted-foreground mt-0.5">{localizedError.message}</div>}{localizedError.action && <div className="text-ed-foreground/70 mt-1.5 bg-ed-muted rounded px-2 py-1.5 font-mono text-[11px] leading-relaxed">{localizedError.action}</div>}</div>}{<Button type="button" onClick={() => setError(null)} variant="ghost" size="icon-xs" className="shrink-0 text-ed-muted-foreground hover:text-ed-foreground" LeftIcon={XIcon} leftIconSize={12} aria-label={t("chat.dismissError")} />}</div>}</div>}{folderAccessRequest && <div className="border border-ed-border rounded-lg p-2.5 bg-ed-muted/50">{<div className="flex items-center gap-1.5 text-ed-chat font-normal text-ed-foreground mb-1.5">{<FolderOpenIcon width={13} height={13} className="text-ed-muted-foreground shrink-0" />}{<span>{t("chat.folderRequest")}</span>}</div>}{folderAccessRequest.path && <div className="text-[11px] font-mono text-ed-muted-foreground truncate mb-1.5">{folderAccessRequest.path}</div>}{<div className="flex gap-1.5">{<Button type="button" size="xs" variant="outline" className="border border-ed-border bg-ed-background px-2 text-[11px] font-medium" onClick={async () => {
              const path_1 = await pickFolder();
              if (!path_1) return;
              onAddAllowedPath?.(path_1);
              answerFolderAccess(folderAccessRequest.ids, true, path_1);
            }} disabled={!onAddAllowedPath}>{t("chat.addLocalFolder")}</Button>}{<Button type="button" size="xs" variant="ghost" className="px-2 text-[11px] font-medium text-ed-muted-foreground" onClick={() => answerFolderAccess(folderAccessRequest.ids, false)}>{t("actions.cancel", { ns: "common" })}</Button>}</div>}</div>}</div>}</ScrollArea>}{<div className={cn$2("relative -mt-2", variant === "sidebar-v2" ? "px-3 pb-3" : "px-2 pb-2")}>{variant === "sidebar-v2" && !messagesAtBottom && !slashOpen && !mentions.open && <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 h-10">{<Button type="button" variant="outline" size="icon-xs" isChildText={false} className="pointer-events-auto absolute bottom-2 right-3 size-6 border-ed-border bg-ed-background p-0 text-ed-muted-foreground shadow-sm hover:bg-ed-ghost-hover" onClick={() => scrollMessagesToBottom("smooth")} aria-label={t("chat.scrollToNewest")} title={t("chat.scrollToNewest")}>{<CaretDownIcon width={12} height={12} className="size-3" />}</Button>}</div>}{<div className="relative">{mentions.open && <ContextMentionMenu id={mentions.id} options={mentions.options} selectedIndex={mentions.selectedIndex} onHover={mentions.setIndex} onSelect={mentions.select} loading={mentions.loading} />}{slashOpen && <SlashCommandMenu commands={filteredSlash} selectedIndex={slashIndex} onHover={setSlashIndex} onSelect={applySlashCommand} loading={slashCommands === null} />}{<div className={cn$2("relative z-10 flex flex-col border bg-ed-card shadow-[0_3px_12px_rgba(0,0,0,0.05)]", slashOpen || mentions.open ? "rounded-b-md" : "rounded-md", variant === "sidebar-v2" ? "gap-2 px-2 py-2" : "gap-1.5 p-2.5")} style={{
          borderColor: composerFocused || slashOpen || mentions.open ? "var(--ed-menu-border)" : "var(--ed-border)"
        }}>{(hasFolder || selectionRefs.length > 0) && <div className={cn$2("flex flex-wrap items-center gap-1 border-b border-ed-border pb-2", variant === "sidebar-v2" ? "-mx-2 px-2" : "-mx-2.5 px-2.5")}>{hasFolder && <FolderChip folders={allowedPaths ?? []} onAdd={onAddAllowedPath} onRemove={onRemoveAllowedPath} onClear={onClearAllowedPaths} />}{selectionRefs.length > 0 && <SelectionContextChip elements={selectionRefs.map(ref_5 => getById(store, ref_5.id)).filter(element_0 => !!element_0)} onRemove={removeSelectionItem} onClear={() => setDismissedSelection({
              selection: selectedElementIds,
              ids: new Set(selectedElementIds)
            })} />}</div>}{<div className="relative min-w-0">{!hasComposerContent && <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0 text-ed-chat leading-5 text-ed-muted-foreground/50">{t("chat.composerHint")}</span>}{<div ref={inputRef} contentEditable={true} role="combobox" aria-label={t("chat.message")} aria-autocomplete="list" aria-expanded={mentions.open} aria-controls={mentions.open ? mentions.id : void 0} aria-activedescendant={mentions.open && mentions.options.length ? `${mentions.id}-option-${mentions.selectedIndex}` : void 0} onInput={handleComposerInput} onKeyDown={handleKeyDown} onKeyUp={syncComposerMenus} onClick={syncComposerMenus} onFocus={handleComposerFocus} onBlur={handleComposerBlur} onPaste={handlePaste} data-placeholder={t("chat.composerHint")} className={cn$2(`ed-chat-composer w-full min-w-0 max-w-full max-h-[300px] overflow-y-auto whitespace-pre-wrap bg-transparent px-0.5 text-ed-foreground focus:outline-none ${WRAP_ANYWHERE_CLASS}`, variant === "sidebar-v2" ? "min-h-6.5 text-ed-chat" : "min-h-[28px] text-ed-chat", "leading-5")} />}{referenceMounts.map(mount_1 => (0, import_react_dom.createPortal)(<ChatReferenceChip reference={mount_1.reference} store={store} onSelectElement={onSelectElement} onRemove={() => inlineComposerRef.current?.removeReference(mount_1.key)} />, mount_1.node, mount_1.key))}</div>}{<div className="-ml-1 flex min-w-0 items-center justify-between gap-2">{<div className="flex min-w-0 items-center gap-1">{<AgentPicker catalog={localAgents} disabled={isLoading} autoApprove={autoApprove} onAutoApproveChange={toggleAutoApprove} />}</div>}{<div className="flex shrink-0 items-center gap-0.5">{<input ref={attachInputRef} type="file" accept={CHAT_ATTACHMENT_ACCEPT} multiple={true} className="hidden" onChange={e_4 => {
                const files = e_4.target.files;
                if (!files) return;
                attachFiles(Array.from(files, file_0 => ({
                  file: file_0,
                  isDirectory: false
                })));
                e_4.target.value = "";
              }} />}{<ContextMenu folders={allowedPaths ?? []} onAddFolder={onAddAllowedPath} onRemoveFolder={onRemoveAllowedPath} onAttach={() => attachInputRef.current?.click()} onPinSelection={selectedRefs.length > 0 ? pinSelection : void 0} onOpenSkills={openSkillsMenu} selectedConnections={contextRefs.flatMap(ref_6 => ref_6.type === "connection" ? [ref_6.name] : [])} onConnectionChange={(connection, selected) => {
                const id_6 = `connection:${connection.name}`;
                if (selected) addContextRef({
                  type: "connection",
                  id: id_6,
                  name: connection.name,
                  displayName: connectionDisplayName(connection)
                });else {
                  removeContextRef(id_6);
                  inputRef.current?.focus();
                }
              }} />}{isLoading ? <IconBtn label={t("chat.stopResponse")} onClick={handleStop} variant="outline" className="text-ed-muted-foreground">{<StopIcon />}</IconBtn> : <IconBtn label={t("chat.sendMessage")} onClick={handleSubmit} variant="secondary" aria-disabled={!canSend} className={cn$2(!canSend && "text-ed-muted-foreground")}>{<ArrowUpIcon />}</IconBtn>}</div>}</div>}</div>}</div>}</div>}{lightboxUrl && <div className="fixed inset-0 flex items-center justify-center bg-black/70" style={{
      zIndex: 99999,
      WebkitAppRegion: "no-drag"
    }} onClick={() => setLightboxUrl(null)} onKeyDown={e_5 => e_5.key === "Escape" && setLightboxUrl(null)} tabIndex={0} ref={el => el?.focus()}>{<Button type="button" onClick={e_6 => {
        e_6.stopPropagation();
        setLightboxUrl(null);
      }} variant="ghost" size="icon-sm" className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 hover:text-white" LeftIcon={XIcon} leftIconSize={20} aria-label={t("chat.closeScreenshot")} />}{<img src={lightboxUrl} alt={t("chat.screenshot")} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />}</div>}{<ClaudeCodeSetupModal open={setupOpen} onOpenChange={next_1 => {
      setSetupOpen(next_1);
      if (!next_1) claudeStatus.refresh();
    }} onConsent={claudeStatus.refresh} />}</div>;
});

const ChatPanel = (0, import_react.forwardRef)(function RecoverableChatPanel(props, ref) {
  return <ChatRecoveryBoundary resetKey={props.activeChatId} contextId={props.activeChatId}>
    <ChatPanelContent {...props} ref={ref} />
  </ChatRecoveryBoundary>;
});

export { ChatPanel, IMPORT_DESIGN_SYSTEM_PROMPT };
