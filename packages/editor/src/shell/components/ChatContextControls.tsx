/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatContextControls.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { connectionDisplayName, fetchClaudeConnections } from "../hooks/useClaudeContext";
import { IconBtn } from "./panels/styles/primitives";
import { getClaudeEffortLevels, resolveClaudeEffort } from "@bingo/compiler";
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, FolderIcon, FolderPlusIcon, LockIcon, OverflowSettingsIcon, PaperclipIcon, PinIcon, PlugsIcon, PlusIcon, SparkleIcon, XIcon, cn$2 } from "@bingo/ui";
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Shared look for the context chips above the composer text. */
var CHIP_CLASS = "inline-flex h-6 max-w-full items-center gap-1 rounded-[5px] border border-ed-border bg-transparent text-ed-chat font-normal text-ed-foreground";
function LocalizedChatText({ id }) {
  const { t } = useTranslation("editor");
  return <>{t(`chat.${id}`)}</>;
}
function AddToMessageButton() {
  const { t } = useTranslation("editor");
  return <IconBtn label={t("chat.addToMessage")}><PlusIcon /></IconBtn>;
}
var CHAT_MODELS = [{
  id: "claude-fable-5-1",
  label: "Fable 5.1",
  featured: true
}, {
  id: "claude-fable-5",
  label: "Fable 5"
}, {
  id: "claude-opus-5",
  label: "Opus 5",
  featured: true
}, {
  id: "claude-opus-4-8",
  label: "Opus 4.8"
}, {
  id: "claude-opus-4-7",
  label: "Opus 4.7"
}, {
  id: "claude-opus-4-6",
  label: "Opus 4.6"
}, {
  id: "claude-sonnet-5",
  label: "Sonnet 5",
  featured: true
}, {
  id: "claude-sonnet-4-6",
  label: "Sonnet 4.6"
}, {
  id: "claude-sonnet-4-5",
  label: "Sonnet 4.5"
}, {
  id: "claude-haiku-4-5",
  label: "Haiku 4.5",
  featured: true
}];
function folderLabel(path) {
  return path.split("/").filter(Boolean).pop() ?? path;
}
async function pickFolder() {
  try {
    const result = await window.api?.invoke?.("pick_folder");
    return typeof result?.path === "string" ? result.path : null;
  } catch {
    return null;
  }
}
function ContextChipRemoveButton(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    label,
    onRemove
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <XIcon className="size-2.5" />;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== label || $[2] !== onRemove) {
    t2 = <IconBtn appearance="inline" label={label} className="ed-context-chip-remove relative z-10 -mr-1 size-4" onClick={onRemove}>{t1}</IconBtn>;
    $[1] = label;
    $[2] = onRemove;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
/** One item of message context: a canvas selection, a pinned element, a file, an image. */
function ContextChip(t0) {
  const $ = (0, import_compiler_runtime.c)(38);
  const { t } = useTranslation("editor");
  const {
    icon: Icon,
    iconContent,
    label,
    title,
    onClick,
    onRemove,
    className,
    variant: t1
  } = t0;
  const variant = t1 === void 0 ? "default" : t1;
  let content;
  let t2;
  let t3;
  let t4;
  if (true) {
    t4 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const chipClassName = cn$2(className, variant === "segment" && "ed-context-chip-segment");
      let t5;
      if ($[12] !== Icon || $[13] !== iconContent) {
        t5 = (iconContent || Icon) && <span className="ed-context-chip-icon inline-flex shrink-0">{iconContent ?? (Icon && <Icon width={14} height={14} className="size-3.5 shrink-0 text-ed-muted-foreground" />)}</span>;
        $[12] = Icon;
        $[13] = iconContent;
        $[14] = t5;
      } else t5 = $[14];
      let t6;
      if ($[15] !== label) {
        t6 = <span className="min-w-0 truncate">{label}</span>;
        $[15] = label;
        $[16] = t6;
      } else t6 = $[16];
      let t7;
      if ($[17] !== t5 || $[18] !== t6) {
        t7 = <>{t5}{t6}</>;
        $[17] = t5;
        $[18] = t6;
        $[19] = t7;
      } else t7 = $[19];
      content = t7;
      if (onClick && onRemove) {
        const t8 = title ?? label;
        const t9 = title || label;
        let t10;
        if ($[20] !== onClick || $[21] !== t8 || $[22] !== t9) {
          t10 = <Button type="button" variant="ghost" size="xs" isChildText={false} className="absolute inset-0 h-full w-full rounded-[inherit] bg-transparent! hover:bg-transparent! active:bg-transparent!" title={t8} aria-label={t9} onClick={onClick} />;
          $[20] = onClick;
          $[21] = t8;
          $[22] = t9;
          $[23] = t10;
        } else t10 = $[23];
        let t11;
        if ($[24] !== content) {
          t11 = <span className="pointer-events-none relative inline-flex min-w-0 items-center gap-1">{content}</span>;
          $[24] = content;
          $[25] = t11;
        } else t11 = $[25];
        const t12 = t("chat.removeContext", { name: label });
        let t13;
        if ($[26] !== onRemove || $[27] !== t12) {
          t13 = <ContextChipRemoveButton label={t12} onRemove={onRemove} />;
          $[26] = onRemove;
          $[27] = t12;
          $[28] = t13;
        } else t13 = $[28];
        t4 = <span data-removable={true} className={cn$2(CHIP_CLASS, "ed-context-chip ed-context-chip-interactive relative", chipClassName)}>{t10}{t11}{t13}</span>;
        break bb0;
      }
      if (onClick) {
        t4 = <Button type="button" variant="ghost" size="xs" isChildText={false} className={cn$2(CHIP_CLASS, "ed-context-chip ed-context-chip-interactive", chipClassName)} title={title ?? label} aria-label={title || label} onClick={onClick}>{content}</Button>;
        break bb0;
      }
      t2 = onRemove ? true : void 0;
      t3 = cn$2(CHIP_CLASS, "ed-context-chip", chipClassName);
    }
    $[0] = Icon;
    $[1] = className;
    $[2] = iconContent;
    $[3] = label;
    $[4] = onClick;
    $[5] = onRemove;
    $[6] = title;
    $[7] = variant;
    $[8] = content;
    $[9] = t2;
    $[10] = t3;
    $[11] = t4;
  } else {
    content = $[8];
    t2 = $[9];
    t3 = $[10];
    t4 = $[11];
  }
  if (t4 !== Symbol.for("react.early_return_sentinel")) return t4;
  const t5 = title ?? label;
  let t6;
  if ($[29] !== label || $[30] !== onRemove) {
    t6 = onRemove && <ContextChipRemoveButton label={`Remove ${label}`} onRemove={onRemove} />;
    $[29] = label;
    $[30] = onRemove;
    $[31] = t6;
  } else t6 = $[31];
  let t7;
  if ($[32] !== content || $[33] !== t2 || $[34] !== t3 || $[35] !== t5 || $[36] !== t6) {
    t7 = <span data-removable={t2} className={t3} title={t5}>{content}{t6}</span>;
    $[32] = content;
    $[33] = t2;
    $[34] = t3;
    $[35] = t5;
    $[36] = t6;
    $[37] = t7;
  } else t7 = $[37];
  return t7;
}
function AddLocalFolderMenuItem(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const {
    onAdd
  } = t0;
  let t1;
  if ($[0] !== onAdd) {
    t1 = async () => {
      const path = await pickFolder();
      if (path) onAdd?.(path);
    };
    $[0] = onAdd;
    $[1] = t1;
  } else t1 = $[1];
  const handleAdd = t1;
  let t2;
  if ($[2] !== handleAdd) {
    t2 = () => void handleAdd();
    $[2] = handleAdd;
    $[3] = t2;
  } else t2 = $[3];
  const t3 = !onAdd;
  let t4;
  let t5;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <FolderPlusIcon />;
    t5 = <span><LocalizedChatText id="addLocalFolderMenu" /></span>;
    $[4] = t4;
    $[5] = t5;
  } else {
    t4 = $[4];
    t5 = $[5];
  }
  let t6;
  if ($[6] !== t2 || $[7] !== t3) {
    t6 = <DropdownMenuItem className="gap-2" onSelect={t2} disabled={t3}>{t4}{t5}</DropdownMenuItem>;
    $[6] = t2;
    $[7] = t3;
    $[8] = t6;
  } else t6 = $[8];
  return t6;
}
/** Attached folders and their controls in the add menu. */
function FolderMenuItems(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const {
    folders,
    onAdd,
    onRemove
  } = t0;
  let t1;
  if ($[0] !== folders || $[1] !== onRemove) {
    t1 = folders.length > 0 && <>{folders.map(path => <DropdownMenuItem key={path} className="group/folder gap-2" onSelect={_temp$20} title={path}>{<FolderIcon />}{<span className="min-w-0 flex-1 truncate">{folderLabel(path)}</span>}{onRemove && <IconBtn appearance="inline" label={`Remove ${folderLabel(path)}`} className="-mr-1 text-ed-muted-foreground opacity-0 group-hover/folder:opacity-100 group-focus-visible/folder:opacity-100 focus-visible:opacity-100" onClick={e_0 => {
          e_0.stopPropagation();
          onRemove(path);
        }}>{<XIcon />}</IconBtn>}</DropdownMenuItem>)}{<DropdownMenuSeparator />}</>;
    $[0] = folders;
    $[1] = onRemove;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== onAdd) {
    t2 = <AddLocalFolderMenuItem onAdd={onAdd} />;
    $[3] = onAdd;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <div className="max-w-56 px-2 pb-1 pt-1.5 leading-snug text-ed-muted-foreground"><LocalizedChatText id="localFoldersAccess" /></div>;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t1 || $[7] !== t2) {
    t4 = <>{t1}{t2}{t3}</>;
    $[6] = t1;
    $[7] = t2;
    $[8] = t4;
  } else t4 = $[8];
  return t4;
}
/** One chip opens setup for all attached folders; its separate X clears the group. */
function _temp$20(e) {
  return e.preventDefault();
}
function FolderChip(t0) {
  const $ = (0, import_compiler_runtime.c)(26);
  const { t } = useTranslation("editor");
  const {
    folders,
    onAdd,
    onRemove,
    onClear
  } = t0;
  if (folders.length === 0) return null;
  let t1;
  if ($[0] !== folders[0]) {
    t1 = folderLabel(folders[0]);
    $[0] = folders[0];
    $[1] = t1;
  } else t1 = $[1];
  const label = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = cn$2(CHIP_CLASS, "pr-1.5 hover:bg-ed-chat-surface/80");
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== folders) {
    t3 = folders.join("\n");
    $[3] = folders;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <FolderIcon className="size-3.5 shrink-0 text-ed-muted-foreground" />;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== label) {
    t5 = <span className="min-w-0 truncate">{label}</span>;
    $[6] = label;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== folders.length) {
    t6 = folders.length > 1 && <span className="shrink-0 text-ed-muted-foreground">+{folders.length - 1}</span>;
    $[8] = folders.length;
    $[9] = t6;
  } else t6 = $[9];
  let t7;
  if (true) {
    t7 = <DropdownMenuTrigger asChild={true}>{<Button type="button" variant="ghost" size="xs" isChildText={false} className="h-full min-w-0 shrink justify-start hover:bg-transparent has-[>svg]:pl-1 has-[>svg]:pr-0" aria-label={t("chat.localFolders")} title={t3}>{t4}{t5}{t6}</Button>}</DropdownMenuTrigger>;
    $[10] = t3;
    $[11] = t5;
    $[12] = t6;
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] !== folders || $[15] !== onAdd || $[16] !== onRemove) {
    t8 = <DropdownMenuContent restoreFocusOnPointerDismiss={false} align="start" side="top" sideOffset={4} className="min-w-48">{<FolderMenuItems folders={folders} onAdd={onAdd} onRemove={onRemove} />}</DropdownMenuContent>;
    $[14] = folders;
    $[15] = onAdd;
    $[16] = onRemove;
    $[17] = t8;
  } else t8 = $[17];
  let t9;
  if ($[18] !== t7 || $[19] !== t8) {
    t9 = <DropdownMenu>{t7}{t8}</DropdownMenu>;
    $[18] = t7;
    $[19] = t8;
    $[20] = t9;
  } else t9 = $[20];
  let t10;
  if (true) {
    t10 = onClear && <ContextChipRemoveButton label={t("chat.removeLocalFolders")} onRemove={onClear} />;
    $[21] = onClear;
    $[22] = t10;
  } else t10 = $[22];
  let t11;
  if ($[23] !== t10 || $[24] !== t9) {
    t11 = <span className={t2}>{t9}{t10}</span>;
    $[23] = t10;
    $[24] = t9;
    $[25] = t11;
  } else t11 = $[25];
  return t11;
}
/** The composer's `+` menu: things you add to this message. */
function ContextMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(31);
  const {
    folders,
    onAddFolder,
    onRemoveFolder,
    onAttach,
    onPinSelection,
    onOpenSkills,
    selectedConnections,
    onConnectionChange
  } = t0;
  const openSkillsOnClose = (0, import_react.useRef)(false);
  const manageConnectionsOnClose = (0, import_react.useRef)(false);
  const connectionOnClose = (0, import_react.useRef)(null);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <DropdownMenuTrigger asChild={true}><AddToMessageButton /></DropdownMenuTrigger>;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== onConnectionChange || $[2] !== onOpenSkills) {
    t2 = event => {
      if (manageConnectionsOnClose.current) {
        manageConnectionsOnClose.current = false;
        event.preventDefault();
        window.dispatchEvent(new Event("bingo-manage-connections"));
        return;
      }
      const pendingConnection = connectionOnClose.current;
      if (pendingConnection) {
        connectionOnClose.current = null;
        event.preventDefault();
        onConnectionChange(pendingConnection.connection, pendingConnection.selected);
        return;
      }
      if (!openSkillsOnClose.current) return;
      openSkillsOnClose.current = false;
      event.preventDefault();
      onOpenSkills();
    };
    $[1] = onConnectionChange;
    $[2] = onOpenSkills;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  let t4;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <PaperclipIcon />;
    t4 = <span><LocalizedChatText id="addAttachment" /></span>;
    $[4] = t3;
    $[5] = t4;
  } else {
    t3 = $[4];
    t4 = $[5];
  }
  let t5;
  if ($[6] !== onAttach) {
    t5 = <DropdownMenuItem className="gap-2" onSelect={onAttach}>{t3}{t4}</DropdownMenuItem>;
    $[6] = onAttach;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== folders || $[9] !== onAddFolder || $[10] !== onRemoveFolder) {
    t6 = folders.length === 0 ? <AddLocalFolderMenuItem onAdd={onAddFolder} /> : <DropdownMenuSub>{<DropdownMenuSubTrigger className="gap-2">{<FolderIcon />}{<span><LocalizedChatText id="localFolders" /></span>}</DropdownMenuSubTrigger>}{<DropdownMenuSubContent className="min-w-48">{<FolderMenuItems folders={folders} onAdd={onAddFolder} onRemove={onRemoveFolder} />}</DropdownMenuSubContent>}</DropdownMenuSub>;
    $[8] = folders;
    $[9] = onAddFolder;
    $[10] = onRemoveFolder;
    $[11] = t6;
  } else t6 = $[11];
  const t7 = !onPinSelection;
  let t10;
  let t8;
  let t9;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <PinIcon />;
    t9 = <span className="min-w-0 flex-1"><LocalizedChatText id="insertSelection" /></span>;
    t10 = <DropdownMenuShortcut>⌘L</DropdownMenuShortcut>;
    $[12] = t10;
    $[13] = t8;
    $[14] = t9;
  } else {
    t10 = $[12];
    t8 = $[13];
    t9 = $[14];
  }
  let t11;
  if ($[15] !== onPinSelection || $[16] !== t7) {
    t11 = <DropdownMenuItem className="gap-2" onSelect={onPinSelection} disabled={t7}>{t8}{t9}{t10}</DropdownMenuItem>;
    $[15] = onPinSelection;
    $[16] = t7;
    $[17] = t11;
  } else t11 = $[17];
  let t12;
  let t13;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <DropdownMenuItem className="gap-2" onSelect={() => {
      openSkillsOnClose.current = true;
    }}>{<SparkleIcon />}{<span className="min-w-0 flex-1"><LocalizedChatText id="skills" /></span>}{<DropdownMenuShortcut>/</DropdownMenuShortcut>}</DropdownMenuItem>;
    t13 = <DropdownMenuSeparator />;
    $[18] = t12;
    $[19] = t13;
  } else {
    t12 = $[18];
    t13 = $[19];
  }
  let t14;
  if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = () => {
      manageConnectionsOnClose.current = true;
    };
    $[20] = t14;
  } else t14 = $[20];
  let t15;
  if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = (connection, selected) => {
      connectionOnClose.current = {
        connection,
        selected
      };
    };
    $[21] = t15;
  } else t15 = $[21];
  let t16;
  if ($[22] !== folders || $[23] !== selectedConnections) {
    t16 = <ConnectionsMenu folders={folders} onManage={t14} selectedConnections={selectedConnections} onConnectionChange={t15} />;
    $[22] = folders;
    $[23] = selectedConnections;
    $[24] = t16;
  } else t16 = $[24];
  let t17;
  if ($[25] !== t11 || $[26] !== t16 || $[27] !== t2 || $[28] !== t5 || $[29] !== t6) {
    t17 = <DropdownMenu>{t1}{<DropdownMenuContent restoreFocusOnPointerDismiss={false} align="start" side="top" sideOffset={4} className="min-w-48" onCloseAutoFocus={t2}>{t5}{t6}{t11}{t12}{t13}{t16}</DropdownMenuContent>}</DropdownMenu>;
    $[25] = t11;
    $[26] = t16;
    $[27] = t2;
    $[28] = t5;
    $[29] = t6;
    $[30] = t17;
  } else t17 = $[30];
  return t17;
}
function AgentPicker({ catalog, disabled, ...settings }) {
  const { t } = useTranslation("settings");
  const { agents, selectedAgent, loading, saving, error, refresh, selectAgent,
    models, modelsLoading, modelsError, refreshModels, selectedModel, selectModel,
    selectedEffort, selectEffort } = catalog;
  const installed = agents.filter(entry => entry.installed);
  const label = agents.find(entry => entry.agent === selectedAgent)?.displayName;
  return <>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="xs" className="min-w-0 px-1 text-ed-muted-foreground" disabled={disabled || saving} aria-label={t("agent.field")}>
        <span className="truncate">{loading ? t("agent.detecting") : error ? t("agent.unknown") : label || t("agent.noInstalled")}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="top" className="min-w-48 max-w-72">
      {!loading && !error && <DropdownMenuRadioGroup value={selectedAgent ?? ""} onValueChange={value => void selectAgent(value)}>
        {installed.map(entry => <DropdownMenuRadioItem key={entry.agent} value={entry.agent}>{entry.displayName}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>}
      {!loading && (error || installed.length === 0) && <div role="status" className="px-2 py-2 text-xs text-ed-muted-foreground">{t(error ? "agent.detectError" : "agent.setupHint")}</div>}
      <DropdownMenuItem disabled={loading || saving} onSelect={() => void refresh()}>{t(loading ? "agent.detecting" : "agent.refresh")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <PermissionsMenu {...settings} />
    </DropdownMenuContent>
  </DropdownMenu>
  <ModelPicker model={selectedModel}
    models={selectedAgent === "claude" ? undefined : models}
    loading={selectedAgent !== "claude" && modelsLoading}
    error={selectedAgent !== "claude" && modelsError}
    onRetry={refreshModels} onModelChange={selectModel}
    allowDefault={selectedAgent !== "claude"}
    disabled={disabled || loading || saving || !selectedAgent} />
  {selectedAgent === "claude" && <EffortPicker model={selectedModel} effort={selectedEffort} onEffortChange={selectEffort} />}
  </>;
}

var DEFAULT_MODEL_VALUE = "__agent_default__";
function ModelPicker({
  model,
  onModelChange,
  models = CHAT_MODELS,
  loading = false,
  error = false,
  onRetry,
  disabled = false,
  allowDefault = false
}) {
  const { t } = useTranslation("editor");
  const selectedValue = model || DEFAULT_MODEL_VALUE;
  const label = model ? models.find(entry => entry.id === model)?.label ?? model : t("chat.defaultModel");
  const displayLabel = loading && models.length === 0 ? t("chat.loadingModels") : label;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="xs" isChildText={false}
        className="min-w-0 shrink px-1 text-ed-muted-foreground" disabled={disabled}
        aria-label={t("chat.currentModel", { model: displayLabel })} title={t("chat.model")}>
        <span className="truncate">{displayLabel}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent restoreFocusOnPointerDismiss={false} align="start" side="top" sideOffset={4}
      className="max-h-80 min-w-48 overflow-y-auto" style={{ maxWidth: 320 }}>
      {!error && <DropdownMenuRadioGroup value={selectedValue} onValueChange={value => onModelChange(value === DEFAULT_MODEL_VALUE ? "" : value)}>
        {allowDefault && <DropdownMenuRadioItem value={DEFAULT_MODEL_VALUE} className="data-[state=checked]:bg-ed-accent">{t("chat.defaultModel")}</DropdownMenuRadioItem>}
        {models.map(entry => <DropdownMenuRadioItem key={entry.id} value={entry.id}
          className="data-[state=checked]:bg-ed-accent" title={entry.description}>
          {entry.label}
        </DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>}
      {loading && <div role="status" className="px-2 py-2 text-xs text-ed-muted-foreground">{t("chat.loadingModels")}</div>}
      {!loading && !error && models.length === 0 && <div role="status" className="px-2 py-2 text-xs text-ed-muted-foreground">{t("chat.noModels")}</div>}
      {error && <>
        <div role="alert" className="px-2 py-2 text-xs text-ed-muted-foreground">{t("chat.modelsUnavailable")}</div>
        <DropdownMenuItem disabled={!onRetry} onSelect={() => void onRetry?.()}>{t("chat.retryModels")}</DropdownMenuItem>
      </>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
var EFFORT_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Max",
  ultracode: "Ultracode"
};
var PERMISSION_MODES = [{
  value: "auto",
  label: "Auto",
  icon: SparkleIcon,
  description: "Approve routine actions automatically. Ask when needed."
}, {
  value: "ask",
  label: "Ask first",
  icon: LockIcon,
  description: "Ask before using tools that are not already allowed."
}];
function PermissionsMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const { t } = useTranslation("editor");
  const {
    autoApprove,
    onAutoApproveChange
  } = t0;
  const mode = PERMISSION_MODES[autoApprove ? 0 : 1];
  let t1;
  if (true) {
    t1 = <DropdownMenuSubTrigger>{t("chat.permissions")}</DropdownMenuSubTrigger>;
    $[0] = t1;
  } else t1 = $[0];
  const t2 = mode.value;
  let t3;
  if ($[1] !== onAutoApproveChange) {
    t3 = value => onAutoApproveChange(value === "auto");
    $[1] = onAutoApproveChange;
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if (true) {
    t4 = PERMISSION_MODES.map(({ value, icon: Icon }) => <DropdownMenuRadioItem key={value} value={value} className="h-auto items-start gap-2 py-2 data-[state=checked]:bg-ed-accent">{<div className="flex min-w-0 items-start gap-2">{<Icon className="size-4 shrink-0 text-ed-muted-foreground" />}{<div className="min-w-0 leading-4">{<div>{t(value === "auto" ? "chat.autoPermission" : "chat.askPermission")}</div>}{<div className="mt-0.5 text-ed-muted-foreground">{t(value === "auto" ? "chat.autoPermissionDescription" : "chat.askPermissionDescription")}</div>}</div>}</div>}</DropdownMenuRadioItem>);
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if (true) {
    t5 = <DropdownMenuSub>{t1}{<DropdownMenuSubContent className="w-64">{<DropdownMenuRadioGroup aria-label={t("chat.permissions")} value={t2} onValueChange={t3}>{t4}</DropdownMenuRadioGroup>}</DropdownMenuSubContent>}</DropdownMenuSub>;
    $[4] = mode.value;
    $[5] = t3;
    $[6] = t5;
  } else t5 = $[6];
  return t5;
}
function _temp6$4(t0) {
  const {
    value: value_0,
    label,
    icon: Icon,
    description
  } = t0;
  return <DropdownMenuRadioItem key={value_0} value={value_0} className="h-auto items-start gap-2 py-2 data-[state=checked]:bg-ed-accent">{<div className="flex min-w-0 items-start gap-2">{<Icon className="size-4 shrink-0 text-ed-muted-foreground" />}{<div className="min-w-0 leading-4">{<div>{label}</div>}{<div className="mt-0.5 text-ed-muted-foreground">{description}</div>}</div>}</div>}</DropdownMenuRadioItem>;
}
function EffortPicker(t0) {
  const $ = (0, import_compiler_runtime.c)(45);
  const { t } = useTranslation("editor");
  const {
    model,
    effort,
    onEffortChange
  } = t0;
  let T0;
  let T1;
  let T2;
  let t1;
  let t10;
  let t11;
  let t2;
  let t3;
  let t4;
  let t5;
  let t6;
  let t7;
  let t8;
  let t9;
  if (true) {
    t11 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const levels = getClaudeEffortLevels(model);
      let t12;
      if ($[17] !== effort || $[18] !== model) {
        t12 = resolveClaudeEffort(model, effort);
        $[17] = effort;
        $[18] = model;
        $[19] = t12;
      } else t12 = $[19];
      const effectiveEffort = t12;
      if (!effectiveEffort) {
        t11 = null;
        break bb0;
      }
      const effortKey = { low: "effortLow", medium: "effortMedium", high: "effortHigh", xhigh: "effortExtraHigh", max: "effortMax", ultracode: "effortUltracode" }[effectiveEffort];
      const label = t(`chat.${effortKey}`);
      T2 = DropdownMenu;
      const t13 = t("chat.currentEffort", { effort: label });
      let t14;
      if ($[20] !== label) {
        t14 = <span>{label}</span>;
        $[20] = label;
        $[21] = t14;
      } else t14 = $[21];
      if (true) {
        t10 = <DropdownMenuTrigger asChild={true}>{<Button type="button" variant="ghost" size="xs" isChildText={false} className="gap-1 px-1 text-ed-muted-foreground" aria-label={t13} title={t("chat.reasoningEffort")}>{t14}</Button>}</DropdownMenuTrigger>;
        $[22] = t13;
        $[23] = t14;
        $[24] = t10;
      } else t10 = $[24];
      T1 = DropdownMenuContent;
      t5 = false;
      t6 = "start";
      t7 = "top";
      t8 = 4;
      t9 = "min-w-40";
      T0 = DropdownMenuRadioGroup;
      t1 = t("chat.effort");
      t2 = effectiveEffort;
      if ($[25] !== onEffortChange) {
        t3 = value => onEffortChange(value);
        $[25] = onEffortChange;
        $[26] = t3;
      } else t3 = $[26];
      t4 = levels.map(level => {
        const key = { low: "effortLow", medium: "effortMedium", high: "effortHigh", xhigh: "effortExtraHigh", max: "effortMax", ultracode: "effortUltracode" }[level];
        return <DropdownMenuRadioItem key={level} value={level} className="data-[state=checked]:bg-ed-accent">{t(`chat.${key}`)}</DropdownMenuRadioItem>;
      });
    }
    $[0] = effort;
    $[1] = model;
    $[2] = onEffortChange;
    $[3] = T0;
    $[4] = T1;
    $[5] = T2;
    $[6] = t1;
    $[7] = t10;
    $[8] = t11;
    $[9] = t2;
    $[10] = t3;
    $[11] = t4;
    $[12] = t5;
    $[13] = t6;
    $[14] = t7;
    $[15] = t8;
    $[16] = t9;
  } else {
    T0 = $[3];
    T1 = $[4];
    T2 = $[5];
    t1 = $[6];
    t10 = $[7];
    t11 = $[8];
    t2 = $[9];
    t3 = $[10];
    t4 = $[11];
    t5 = $[12];
    t6 = $[13];
    t7 = $[14];
    t8 = $[15];
    t9 = $[16];
  }
  if (t11 !== Symbol.for("react.early_return_sentinel")) return t11;
  let t12;
  if ($[27] !== T0 || $[28] !== t1 || $[29] !== t2 || $[30] !== t3 || $[31] !== t4) {
    t12 = <T0 aria-label={t1} value={t2} onValueChange={t3}>{t4}</T0>;
    $[27] = T0;
    $[28] = t1;
    $[29] = t2;
    $[30] = t3;
    $[31] = t4;
    $[32] = t12;
  } else t12 = $[32];
  let t13;
  if ($[33] !== T1 || $[34] !== t12 || $[35] !== t5 || $[36] !== t6 || $[37] !== t7 || $[38] !== t8 || $[39] !== t9) {
    t13 = <T1 restoreFocusOnPointerDismiss={t5} align={t6} side={t7} sideOffset={t8} className={t9}>{t12}</T1>;
    $[33] = T1;
    $[34] = t12;
    $[35] = t5;
    $[36] = t6;
    $[37] = t7;
    $[38] = t8;
    $[39] = t9;
    $[40] = t13;
  } else t13 = $[40];
  let t14;
  if ($[41] !== T2 || $[42] !== t10 || $[43] !== t13) {
    t14 = <T2>{t10}{t13}</T2>;
    $[41] = T2;
    $[42] = t10;
    $[43] = t13;
    $[44] = t14;
  } else t14 = $[44];
  return t14;
}
/**
* Connections are read from the
* user's Claude Code config, so the list is the same one the terminal has.
*/
function _temp7$3(level) {
  return <DropdownMenuRadioItem key={level} value={level} className="data-[state=checked]:bg-ed-accent">{EFFORT_LABELS[level]}</DropdownMenuRadioItem>;
}
function ConnectionsMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const { t } = useTranslation("editor");
  const {
    folders,
    selectedConnections,
    onConnectionChange,
    onManage
  } = t0;
  const [connections, setConnections] = (0, import_react.useState)(null);
  const cwd = folders[0];
  let t1;
  if ($[0] !== cwd) {
    t1 = async () => {
      setConnections(await fetchClaudeConnections(cwd));
    };
    $[0] = cwd;
    $[1] = t1;
  } else t1 = $[1];
  const load = t1;
  let t2;
  if ($[2] !== load) {
    t2 = open => {
      if (open) load();
    };
    $[2] = load;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if (true) {
    t3 = <DropdownMenuSubTrigger className="gap-2">{<PlugsIcon />}{<span>{t("chat.connections")}</span>}</DropdownMenuSubTrigger>;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if (true) {
    t4 = connections === null ? <div className="px-2 py-1 text-ed-muted-foreground">{t("chat.readingClaudeConfig")}</div> : connections.length === 0 ? <div className="max-w-56 px-2 py-1 leading-snug text-ed-muted-foreground">{t("chat.noMcpServers")}</div> : connections.map(connection => <DropdownMenuCheckboxItem key={connection.name} checked={selectedConnections.includes(connection.name)} onCheckedChange={selected => onConnectionChange(connection, selected === true)} className="gap-2" title={connection.name}>{<span className="min-w-0 flex-1 truncate">{connectionDisplayName(connection)}</span>}</DropdownMenuCheckboxItem>);
    $[5] = connections;
    $[6] = onConnectionChange;
    $[7] = selectedConnections;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = <DropdownMenuSeparator />;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  let t7;
  if (true) {
    t6 = <OverflowSettingsIcon />;
    t7 = <span>{t("chat.manageConnections")}</span>;
    $[10] = t6;
    $[11] = t7;
  } else {
    t6 = $[10];
    t7 = $[11];
  }
  let t8;
  if ($[12] !== onManage) {
    t8 = <DropdownMenuItem className="gap-2" onSelect={onManage}>{t6}{t7}</DropdownMenuItem>;
    $[12] = onManage;
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if ($[14] !== t4 || $[15] !== t8) {
    t9 = <DropdownMenuSubContent className="min-w-48">{t4}{t5}{t8}</DropdownMenuSubContent>;
    $[14] = t4;
    $[15] = t8;
    $[16] = t9;
  } else t9 = $[16];
  let t10;
  if ($[17] !== t2 || $[18] !== t9) {
    t10 = <DropdownMenuSub onOpenChange={t2}>{t3}{t9}</DropdownMenuSub>;
    $[17] = t2;
    $[18] = t9;
    $[19] = t10;
  } else t10 = $[19];
  return t10;
}

export { AgentPicker, ContextChip, ContextMenu, EffortPicker, FolderChip, ModelPicker, pickFolder };
