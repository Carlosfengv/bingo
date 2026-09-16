/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/CommentThread.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useAssetResolver } from "../../shared/contexts/AssetContext";
import { useUploadImage } from "../../shared/hooks/useUploadImage";
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { getCamera, subscribeCamera } from "../utils/chatShortcuts";
import { Avatar, AvatarFallback, AvatarImage, Button, ConfettiIcon, DotsThreeIcon, HeartIcon, PencilIcon, ScrollArea, SmileyIcon, Text$4, ThumbsUpIcon, Tooltip, TrashIcon, XIcon } from "@bingo/ui";
import { CheckCircle as s$8 } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { formatRelativeTime, useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var QUICK_REACTIONS = [{
  emoji: "thumbsup",
  icon: ThumbsUpIcon,
  label: "like"
}, {
  emoji: "heart",
  icon: HeartIcon,
  label: "love"
}, {
  emoji: "smile",
  icon: SmileyIcon,
  label: "smile"
}, {
  emoji: "tada",
  icon: ConfettiIcon,
  label: "celebrate"
}];
var REACTION_DISPLAY = {
  thumbsup: ThumbsUpIcon,
  heart: HeartIcon,
  smile: SmileyIcon,
  tada: ConfettiIcon
};
function CommentItem(t0) {
  const $ = (0, import_compiler_runtime.c)(57);
  const { t, i18n } = useTranslation("editor");
  const locale = i18n.resolvedLanguage === "zh-CN" ? "zh-CN" : "en";
  const {
    comment,
    currentUserId,
    onDelete,
    onEdit,
    onReaction
  } = t0;
  const resolveAsset = useAssetResolver();
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [editValue, setEditValue] = (0, import_react.useState)(comment.body);
  const [showMenu, setShowMenu] = (0, import_react.useState)(false);
  const isAuthor = currentUserId === comment.authorId;
  const menuRef = (0, import_react.useRef)(null);
  const reactions = comment.reactions;
  const attachments = comment.attachments;
  const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt;
  let t1;
  let t2;
  if ($[0] !== showMenu) {
    t1 = () => {
      if (!showMenu) return;
      const handleClickOutside = e => {
        if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    };
    t2 = [showMenu];
    $[0] = showMenu;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  (0, import_react.useEffect)(t1, t2);
  let t3;
  if ($[3] !== comment.body || $[4] !== comment.id || $[5] !== editValue || $[6] !== onEdit) {
    t3 = () => {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== comment.body) onEdit(comment.id, trimmed);
      setEditing(false);
    };
    $[3] = comment.body;
    $[4] = comment.id;
    $[5] = editValue;
    $[6] = onEdit;
    $[7] = t3;
  } else t3 = $[7];
  const handleSaveEdit = t3;
  let t4;
  if (true) {
    t4 = comment.author.image && <AvatarImage src={comment.author.image} alt={comment.author.name || t("comments.user")} />;
    $[8] = comment.author.image;
    $[9] = comment.author.name;
    $[10] = t4;
  } else t4 = $[10];
  const t5 = comment.author.name || "?";
  let t6;
  if ($[11] !== t5[0]) {
    t6 = t5[0].toUpperCase();
    $[11] = t5[0];
    $[12] = t6;
  } else t6 = $[12];
  let t7;
  if ($[13] !== t6) {
    t7 = <AvatarFallback>{t6}</AvatarFallback>;
    $[13] = t6;
    $[14] = t7;
  } else t7 = $[14];
  let t8;
  if ($[15] !== t4 || $[16] !== t7) {
    t8 = <Avatar size="sm">{t4}{t7}</Avatar>;
    $[15] = t4;
    $[16] = t7;
    $[17] = t8;
  } else t8 = $[17];
  const t9 = comment.author.name || t("comments.unknownUser");
  let t10;
  if ($[18] !== t9) {
    t10 = <Text$4 size="xs" weight="semibold" className="text-ed-foreground">{t9}</Text$4>;
    $[18] = t9;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if (true) {
    t11 = formatRelativeTime(comment.createdAt, locale);
    $[20] = comment.createdAt;
    $[21] = t11;
  } else t11 = $[21];
  let t12;
  if ($[22] !== t11) {
    t12 = <Text$4 size="2xs" className="text-ed-muted-foreground ml-auto">{t11}</Text$4>;
    $[22] = t11;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if (true) {
    t13 = isAuthor && <div className="relative" ref={menuRef}>{<button onClick={() => setShowMenu(!showMenu)} className="opacity-0 group-hover/comment:opacity-100 hover:bg-ed-accent rounded p-0.5 text-ed-muted-foreground">{<DotsThreeIcon width={14} height={14} />}</button>}{showMenu && <div className="absolute right-0 top-full mt-1 z-50 min-w-[100px] bg-ed-popover border border-ed-border rounded-md shadow-lg py-1">{<button onClick={() => {
          setEditing(true);
          setShowMenu(false);
        }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-ed-accent text-left text-ed-foreground">{<PencilIcon width={12} height={12} />}{t("comments.edit")}</button>}{<button onClick={() => {
          onDelete(comment.id);
          setShowMenu(false);
        }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-ed-accent text-left text-ed-destructive">{<TrashIcon width={12} height={12} />}{t("comments.delete")}</button>}</div>}</div>;
    $[24] = comment.id;
    $[25] = isAuthor;
    $[26] = onDelete;
    $[27] = showMenu;
    $[28] = t13;
  } else t13 = $[28];
  let t14;
  if ($[29] !== t10 || $[30] !== t12 || $[31] !== t13 || $[32] !== t8) {
    t14 = <div className="flex items-center gap-2 mb-1">{t8}{t10}{t12}{t13}</div>;
    $[29] = t10;
    $[30] = t12;
    $[31] = t13;
    $[32] = t8;
    $[33] = t14;
  } else t14 = $[33];
  let t15;
  if (true) {
    t15 = editing ? <div className="mt-1">{<textarea value={editValue} onChange={e_0 => setEditValue(e_0.target.value)} onKeyDown={e_1 => {
        if (e_1.key === "Enter" && !e_1.nativeEvent.isComposing && (e_1.metaKey || e_1.ctrlKey)) handleSaveEdit();
        if (e_1.key === "Escape") setEditing(false);
      }} autoFocus={true} className="w-full px-2 py-1.5 text-sm bg-ed-background text-ed-foreground border border-ed-border rounded outline-none focus:border-ed-primary resize-none" rows={2} />}{<div className="flex gap-1 mt-1.5">{<Button size="xs" onClick={handleSaveEdit}>{t("comments.save")}</Button>}{<Button variant="ghost" size="xs" onClick={() => setEditing(false)}>{t("common:actions.cancel")}</Button>}</div>}</div> : <>{<Text$4 size="xs" className="text-ed-foreground whitespace-pre-wrap leading-relaxed">{comment.body}{isEdited && <span className="text-ed-muted-foreground text-[10px] ml-1">({t("comments.edited")})</span>}</Text$4>}{attachments && attachments.length > 0 && <div className="flex gap-1.5 mt-2 flex-wrap">{attachments.map((url, i) => {
          const resolved = resolveAsset ? resolveAsset(url) : url;
          return <a key={i} href={resolved} target="_blank" rel="noopener noreferrer">{<img src={resolved} alt={t("comments.attachment")} className="max-w-[200px] max-h-[120px] rounded border border-ed-border object-cover hover:opacity-80" />}</a>;
        })}</div>}</>;
    $[34] = attachments;
    $[35] = comment.body;
    $[36] = editValue;
    $[37] = editing;
    $[38] = handleSaveEdit;
    $[39] = isEdited;
    $[40] = resolveAsset;
    $[41] = t15;
  } else t15 = $[41];
  let t16;
  if ($[42] !== comment.id || $[43] !== currentUserId || $[44] !== onReaction || $[45] !== reactions) {
    t16 = reactions && Object.keys(reactions).length > 0 && <div className="flex gap-1 mt-1.5 flex-wrap">{Object.entries(reactions).map(t17 => {
        const [emoji, userIds] = t17;
        const IconComp = REACTION_DISPLAY[emoji];
        const isActive = currentUserId && userIds.includes(currentUserId);
        return <button key={emoji} onClick={() => onReaction(comment.id, emoji)} className={["flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border", isActive ? "border-ed-primary/50 bg-ed-primary/10 text-ed-primary" : "border-ed-border bg-transparent text-ed-muted-foreground hover:border-ed-muted-foreground"].join(" ")}>{IconComp ? <IconComp width={10} height={10} /> : emoji}{<span>{userIds.length}</span>}</button>;
      })}</div>;
    $[42] = comment.id;
    $[43] = currentUserId;
    $[44] = onReaction;
    $[45] = reactions;
    $[46] = t16;
  } else t16 = $[46];
  let t17;
  if (true) {
    t17 = QUICK_REACTIONS.map(t18 => {
      const {
        emoji: emoji_0,
        icon: Icon,
        label
      } = t18;
      const reactionLabel = t(`comments.${label}`);
      return <Tooltip key={emoji_0} content={reactionLabel}>{<button type="button" aria-label={reactionLabel} onClick={() => onReaction(comment.id, emoji_0)} className="p-1 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground">{<Icon width={12} height={12} />}</button>}</Tooltip>;
    });
    $[47] = comment.id;
    $[48] = onReaction;
    $[49] = t17;
  } else t17 = $[49];
  let t18;
  if ($[50] !== t17) {
    t18 = <div className="flex gap-0.5 mt-1 opacity-0 group-hover/comment:opacity-100">{t17}</div>;
    $[50] = t17;
    $[51] = t18;
  } else t18 = $[51];
  let t19;
  if ($[52] !== t14 || $[53] !== t15 || $[54] !== t16 || $[55] !== t18) {
    t19 = <div className="px-3 py-2.5 group/comment">{t14}{t15}{t16}{t18}</div>;
    $[52] = t14;
    $[53] = t15;
    $[54] = t16;
    $[55] = t18;
    $[56] = t19;
  } else t19 = $[56];
  return t19;
}
function CommentThread({
  comment,
  replies,
  currentUserId,
  onReply,
  onResolve,
  onUnresolve,
  onDelete,
  onEdit,
  onReaction,
  onClose
}) {
  const { t } = useTranslation("editor");
  const camera = (0, import_react.useSyncExternalStore)(subscribeCamera, getCamera, getCamera);
  const screenX = (comment.canvasX ?? 0) * camera.scale + camera.positionX;
  const screenY = (comment.canvasY ?? 0) * camera.scale + camera.positionY;
  const [replyValue, setReplyValue] = (0, import_react.useState)("");
  const [replyAttachments, setReplyAttachments] = (0, import_react.useState)([]);
  const [uploading, setUploading] = (0, import_react.useState)(false);
  const replyRef = (0, import_react.useRef)(null);
  const containerRef = (0, import_react.useRef)(null);
  const [flipLeft, setFlipLeft] = (0, import_react.useState)(false);
  const uploadImage = useUploadImage();
  const resolveAsset = useAssetResolver();
  const handleReplyPaste = async e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === "string") {
          setUploading(true);
          try {
            const result = await uploadImage(reader.result, file.type);
            if (result.url) setReplyAttachments(prev => [...prev, result.url]);
          } finally {
            setUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
      break;
    }
  };
  (0, import_react.useLayoutEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    const parent = el.closest("[data-overlay-container]");
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rightEdge = screenX + 20 + 320;
    setFlipLeft(rightEdge > parentRect.width);
  }, [screenX]);
  (0, import_react.useEffect)(() => {
    const handleKeyDown = e_0 => {
      if (matchesShortcut(e_0, LOCAL_SHORTCUTS.comments.closeThread)) onClose();
    };
    const handleClickOutside = e_1 => {
      if (containerRef.current && !containerRef.current.contains(e_1.target)) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  const handleReply = () => {
    const trimmed = replyValue.trim();
    if (!trimmed && replyAttachments.length === 0) return;
    onReply(trimmed, replyAttachments.length > 0 ? replyAttachments : void 0);
    setReplyValue("");
    setReplyAttachments([]);
  };
  return <div ref={containerRef} className="absolute pointer-events-auto" style={{
    left: flipLeft ? screenX - 340 : screenX + 20,
    top: screenY - 12,
    zIndex: 40
  }}>{<div className="w-[320px] max-h-[480px] bg-ed-popover border border-ed-border rounded-lg shadow-xl flex flex-col overflow-hidden">{<div className="flex items-center justify-between px-3 py-2 border-b border-ed-border">{<Text$4 size="xs" weight="semibold" className="text-ed-foreground">{t("comments.title")}</Text$4>}{<div className="flex items-center gap-1">{<Button variant={comment.resolved ? "default" : "outline"} size="xs" LeftIcon={s$8} onClick={comment.resolved ? onUnresolve : onResolve}>{t(comment.resolved ? "comments.resolved" : "comments.resolve")}</Button>}{<button onClick={onClose} className="p-1 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground">{<XIcon width={14} height={14} />}</button>}</div>}</div>}{<ScrollArea className="flex-1">{<CommentItem comment={comment} currentUserId={currentUserId} onDelete={onDelete} onEdit={onEdit} onReaction={onReaction} />}{replies.length > 0 && <div className="border-t border-ed-border">{replies.map(reply => <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onDelete={onDelete} onEdit={onEdit} onReaction={onReaction} />)}</div>}</ScrollArea>}{<div className="border-t border-ed-border p-2">{<textarea ref={replyRef} value={replyValue} onChange={e_2 => setReplyValue(e_2.target.value)} onKeyDown={e_3 => {
          if (e_3.key === "Enter" && !e_3.nativeEvent.isComposing && (e_3.metaKey || e_3.ctrlKey)) {
            e_3.preventDefault();
            handleReply();
          }
        }} onPaste={handleReplyPaste} placeholder={t("comments.replyPlaceholder")} rows={2} className="w-full px-2 py-1.5 text-sm bg-ed-background text-ed-foreground border border-ed-border rounded outline-none focus:border-ed-primary resize-none placeholder:text-ed-muted-foreground" />}{replyAttachments.length > 0 && <div className="flex gap-1 mt-1 flex-wrap">{replyAttachments.map((url, i) => <div key={i} className="relative group/img">{<img src={resolveAsset ? resolveAsset(url) : url} alt={t("comments.attachment")} className="w-10 h-10 rounded object-cover border border-ed-border" />}{<button onClick={() => setReplyAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ed-destructive text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100">{<XIcon width={8} height={8} />}</button>}</div>)}</div>}{uploading && <div className="text-xs text-ed-muted-foreground mt-1">{t("comments.uploading")}</div>}{<div className="flex justify-end mt-1.5">{<Button size="xs" onClick={handleReply} disabled={!replyValue.trim() && replyAttachments.length === 0}>{t("comments.reply")}</Button>}</div>}</div>}</div>}</div>;
}

export { CommentThread };
