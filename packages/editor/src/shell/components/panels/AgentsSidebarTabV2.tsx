import { useTranslation } from "@bingo/i18n";
import {
  ArchiveIcon,
  CaretLeftIcon,
  CrosshairIcon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  OverflowSettingsIcon,
  PlusIcon,
  ScrollArea,
  Text$4
} from "@bingo/ui";
import { ChatConversations } from "../ChatConversations";
import { ChatActivityIndicator, ChatListRow } from "../ChatListRow";
import { EditableChatTitle } from "../EditableChatTitle";
import { IconBtn } from "./styles/primitives";

const GROUP_ORDER = ["today", "yesterday", "week", "older"];
const EMPTY_CHAT_IDS = new Set();

function groupForDate(value) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const chatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor((today - chatDay) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "week";
  return "older";
}

function ChatHeaderActions({
  historyOpen,
  chats,
  runningChatIds = EMPTY_CHAT_IDS,
  loading,
  onNewChat,
  onOpenSettings,
  onArchiveAllChats,
  onOpenArchivedChats
}) {
  const { t } = useTranslation("editor");
  return <div className="flex shrink-0 items-center gap-1.5">
    {historyOpen && (onOpenSettings || onArchiveAllChats || onOpenArchivedChats) && <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <IconBtn label={t("chat.agentSettings")}><OverflowSettingsIcon /></IconBtn>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {onArchiveAllChats && <DropdownMenuItem disabled={chats.length === 0 || runningChatIds.size > 0} onSelect={onArchiveAllChats}>{t("chat.archiveAllChats")}</DropdownMenuItem>}
        {onOpenArchivedChats && <DropdownMenuItem onSelect={onOpenArchivedChats}>{t("chat.archivedChats")}</DropdownMenuItem>}
        {onOpenSettings && (onArchiveAllChats || onOpenArchivedChats) && <DropdownMenuSeparator />}
        {onOpenSettings && <DropdownMenuItem onSelect={onOpenSettings}>{t("chat.settings")}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>}
    <IconBtn label={t("chat.newChat")} disabled={loading} onClick={onNewChat}><PlusIcon /></IconBtn>
  </div>;
}

/** Switch between the current conversation and a full-height chat history. */
function AgentsSidebarTabV2({
  chats,
  activeChatId,
  historyOpen,
  onHistoryOpenChange,
  runningChatIds = EMPTY_CHAT_IDS,
  unreadChatIds = EMPTY_CHAT_IDS,
  loading = false,
  onNewChat,
  onOpenSettings,
  onSwitchChat,
  onArchiveChat,
  onRenameChat,
  onDropAttachments,
  onArchiveAllChats,
  onOpenArchivedChats,
  followAi = false,
  onFollowAiChange,
  onFocusLastResult,
  renderChat
}) {
  const { t } = useTranslation("editor");
  const groups = new Map();
  for (const chat of chats) {
    const group = groupForDate(chat.createdAt);
    const items = groups.get(group) ?? [];
    items.push(chat);
    groups.set(group, items);
  }
  const visibleGroups = GROUP_ORDER.flatMap(group => {
    const items = groups.get(group);
    return items?.length ? [{ group, items }] : [];
  });
  const activeChat = chats.find(chat => chat.id === activeChatId) ?? chats[0];
  const openChat = id => {
    onSwitchChat(id);
    onHistoryOpenChange(false);
  };
  const newChat = () => {
    onNewChat();
    onHistoryOpenChange(false);
  };
  const followLabel = (running, following) => running
    ? (following ? t("chat.stopFollowing") : t("chat.followAssistant"))
    : t("chat.showLastResult");
  const rowActions = (chat, active, running) => {
    const following = active && running && followAi;
    const actions = [];
    if (onFollowAiChange) actions.push({
      key: "follow",
      icon: <CrosshairIcon />,
      label: followLabel(running, following),
      active: following,
      onClick: () => {
        if (!active) onSwitchChat(chat.id);
        if (running) onFollowAiChange(!active || !followAi);
        else onFocusLastResult?.(chat.id);
      }
    });
    actions.push({
      key: "archive",
      icon: <ArchiveIcon />,
      label: t("chat.archiveNamedChat", { title: chat.title || t("chat.newChat") }),
      tooltip: t("chat.archiveChat", { name: chat.title || t("chat.newChat") }),
      disabled: running,
      onClick: () => onArchiveChat(chat.id)
    });
    return actions;
  };
  const handleDragOver = event => {
    if (historyOpen || !onDropAttachments || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = event => {
    if (historyOpen || !onDropAttachments || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    onDropAttachments(event.dataTransfer);
  };
  const groupLabels = {
    yesterday: t("chat.yesterday"),
    week: t("chat.previous7Days"),
    older: t("chat.older")
  };

  return <div className="flex h-full min-h-0 flex-col" onDragOver={handleDragOver} onDrop={handleDrop}>
    <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-ed-border px-3">
      {!historyOpen && <IconBtn label={t("chat.allChats")} onClick={() => onHistoryOpenChange(true)}><CaretLeftIcon /></IconBtn>}
      {historyOpen
        ? <span className="min-w-0 flex-1 truncate pl-1.5 text-ed-chat font-normal text-ed-foreground-secondary">{t("chat.allChats")}</span>
        : <EditableChatTitle key={activeChat?.id} title={activeChat?.title || t("chat.newChat")} animate={!!activeChat?.generatedTitle && activeChat.title === activeChat.generatedTitle} className="text-ed-foreground-secondary" onRename={activeChat && onRenameChat ? title => onRenameChat(activeChat.id, title) : undefined} />}
      {!historyOpen && activeChat && runningChatIds.has(activeChat.id) && <span className="flex size-6.5 shrink-0 items-center justify-center"><ChatActivityIndicator /></span>}
      {!historyOpen && activeChat && onFollowAiChange && <IconBtn label={followLabel(runningChatIds.has(activeChat.id), followAi)} active={runningChatIds.has(activeChat.id) && followAi} onClick={() => runningChatIds.has(activeChat.id) ? onFollowAiChange(!followAi) : onFocusLastResult?.(activeChat.id)}><CrosshairIcon /></IconBtn>}
      <ChatHeaderActions historyOpen={historyOpen} chats={chats} runningChatIds={runningChatIds} loading={loading} onNewChat={newChat} onOpenSettings={onOpenSettings} onArchiveAllChats={onArchiveAllChats} onOpenArchivedChats={onOpenArchivedChats} />
    </div>
    {historyOpen && <ScrollArea className="min-h-0 flex-1">
      <div className="flex w-full flex-col gap-4 py-2">
        {loading && chats.length === 0
          ? <Text$4 size="3xs" variant="secondary" className="px-3 py-2 text-ed-chat">{t("chat.loadingChats")}</Text$4>
          : visibleGroups.map(({ group, items }) => <div key={group} className="flex w-full flex-col gap-1">
            {groupLabels[group] && <div className="px-4.5 text-ed-chat font-normal leading-6 text-ed-muted-foreground/75">{groupLabels[group]}</div>}
            {items.map(chat => {
              const active = chat.id === activeChat?.id;
              const running = runningChatIds.has(chat.id);
              return <ChatListRow key={chat.id} title={chat.title || t("chat.newChat")} animateTitle={!!chat.generatedTitle && chat.title === chat.generatedTitle} active={active} status={running ? "running" : unreadChatIds.has(chat.id) ? "unread" : undefined} actions={rowActions(chat, active, running)} onSelect={() => openChat(chat.id)} onRename={onRenameChat ? title => onRenameChat(chat.id, title) : undefined} />;
            })}
          </div>)}
      </div>
    </ScrollArea>}
    <div className={historyOpen ? "hidden" : "min-h-0 flex-1"}>
      {loading && chats.length === 0 && <Text$4 size="3xs" variant="secondary" className="px-3 py-2 text-ed-chat">{t("chat.loadingChats")}</Text$4>}
      <ChatConversations chats={chats} activeChatId={activeChat?.id} renderChat={renderChat} />
    </div>
  </div>;
}

export { AgentsSidebarTabV2 };
