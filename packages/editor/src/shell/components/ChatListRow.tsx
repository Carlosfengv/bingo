/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatListRow.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { EditableChatTitle } from "./EditableChatTitle";
import { SIDEBAR_LIST_ROW_ACTIVE_CLASS, SIDEBAR_LIST_ROW_CLASS } from "./SidebarSectionHeader";
import { IconBtn } from "./panels/styles/primitives";
import { RippleLoader, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function ChatActivityIndicator() {
  const $ = (0, import_compiler_runtime.c)(1);
  const { t } = useTranslation("editor");
  let t0;
  if (true) {
    t0 = <span role="status" aria-label={t("shell.chatRunning")} className="inline-flex size-4 shrink-0 translate-y-px items-center justify-center text-ed-foreground">{<RippleLoader size={16} grid={11} variant="default" />}</span>;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
var ACTION_REVEAL_CLASS = "pointer-events-none opacity-0 group-hover/chat-row:pointer-events-auto group-hover/chat-row:opacity-100 group-focus-within/chat-row:pointer-events-auto group-focus-within/chat-row:opacity-100";
/**
* One row in a chat list: the All chats history and the archive share it so
* their spacing, type, hover, and action rail cannot drift. Callers only
* choose the title, the idle status, and which icon actions the row offers.
*/
function ChatListRow(t0) {
  const $ = (0, import_compiler_runtime.c)(24);
  const { t } = useTranslation("editor");
  const {
    title,
    animateTitle,
    active: t1,
    disabled: t2,
    status,
    actions: t3,
    onSelect,
    onRename
  } = t0;
  const active = t1 === void 0 ? false : t1;
  const disabled = t2 === void 0 ? false : t2;
  const actions = t3 === void 0 ? [] : t3;
  const [hovered, setHovered] = (0, import_react.useState)(false);
  const last = actions[actions.length - 1];
  const leading = actions.slice(0, -1);
  const slotCount = Math.max(actions.length, status ? 1 : 0);
  const railWidth = slotCount ? slotCount * 26 + 4 : 0;
  const firstVisibleAction = actions.findIndex(_temp$25);
  const visibleSlots = firstVisibleAction >= 0 ? actions.length - firstVisibleAction : status ? 1 : 0;
  const idleRailWidth = visibleSlots ? visibleSlots * 26 + 4 : 0;
  const renderAction = _temp2$17;
  const t4 = "group/chat-row relative mx-3 min-w-0";
  let t5;
  let t6;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = () => setHovered(true);
    t6 = () => setHovered(false);
    $[0] = t5;
    $[1] = t6;
  } else {
    t5 = $[0];
    t6 = $[1];
  }
  const t7 = active ? "true" : void 0;
  let t8;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = cn$2(SIDEBAR_LIST_ROW_CLASS, SIDEBAR_LIST_ROW_ACTIVE_CLASS, "flex w-full min-w-0 items-center gap-0 pr-0.5 text-ed-chat group-hover/chat-row:bg-ed-ghost-hover group-hover/chat-row:text-ed-foreground group-focus-within/chat-row:bg-ed-ghost-hover");
    $[2] = t8;
  } else t8 = $[2];
  let t9;
  if ($[3] !== animateTitle || $[4] !== disabled || $[5] !== hovered || $[6] !== onRename || $[7] !== onSelect || $[8] !== title) {
    t9 = <EditableChatTitle title={title} animate={animateTitle} marqueeActive={hovered} onSelect={onSelect} onRename={onRename} disabled={disabled} />;
    $[3] = animateTitle;
    $[4] = disabled;
    $[5] = hovered;
    $[6] = onRename;
    $[7] = onSelect;
    $[8] = title;
    $[9] = t9;
  } else t9 = $[9];
  const t10 = `${idleRailWidth}px`;
  const t11 = `${railWidth}px`;
  let t12;
  if ($[10] !== t10 || $[11] !== t11) {
    t12 = {
      "--chat-idle-width": t10,
      "--chat-action-width": t11
    };
    $[10] = t10;
    $[11] = t11;
    $[12] = t12;
  } else t12 = $[12];
  const t13 = t12;
  let t14;
  if ($[13] !== t13) {
    t14 = <span aria-hidden={true} className="w-[var(--chat-idle-width)] shrink-0 group-hover/chat-row:w-[var(--chat-action-width)] group-focus-within/chat-row:w-[var(--chat-action-width)]" style={t13} />;
    $[13] = t13;
    $[14] = t14;
  } else t14 = $[14];
  let t15;
  if ($[15] !== t14 || $[16] !== t7 || $[17] !== t9) {
    t15 = <div data-active={t7} className={t8}>{t9}{t14}</div>;
    $[15] = t14;
    $[16] = t7;
    $[17] = t9;
    $[18] = t15;
  } else t15 = $[18];
  const t16 = (actions.length > 0 || status) && <div className="pointer-events-none absolute inset-y-0 right-0.5 flex items-center">{leading.map(action_1 => renderAction(action_1))}{<div className="relative flex h-full w-6.5 items-center justify-center">{status === "running" ? <span className="flex items-center justify-center group-hover/chat-row:opacity-0 group-focus-within/chat-row:opacity-0">{<ChatActivityIndicator />}</span> : status === "unread" ? <span role="status" className="size-2 shrink-0 rounded-full bg-ed-canvas-selection group-hover/chat-row:opacity-0 group-focus-within/chat-row:opacity-0" aria-label={t("shell.unreadChat")} /> : null}{last && renderAction(last, "absolute text-ed-foreground-secondary")}</div>}</div>;
  let t17;
  if ($[19] !== t15 || $[20] !== t16 || $[21] !== t5 || $[22] !== t6) {
    t17 = <div className={t4} onMouseEnter={t5} onMouseLeave={t6}>{t15}{t16}</div>;
    $[19] = t15;
    $[20] = t16;
    $[21] = t5;
    $[22] = t6;
    $[23] = t17;
  } else t17 = $[23];
  return t17;
}
function _temp2$17(action_0, className) {
  return <IconBtn key={action_0.key} label={action_0.label} tooltip={action_0.tooltip} tooltipProps={{
    side: "right"
  }} active={action_0.active} appearance="inline" disabled={action_0.disabled} className={cn$2(ACTION_REVEAL_CLASS, "h-full w-6.5 rounded-none [&_svg]:translate-y-px", action_0.active && "pointer-events-auto opacity-100", className)} onClick={event => {
    event.stopPropagation();
    action_0.onClick();
  }}>{action_0.icon}</IconBtn>;
}
function _temp$25(action) {
  return action.active;
}

export { ChatActivityIndicator, ChatListRow };
