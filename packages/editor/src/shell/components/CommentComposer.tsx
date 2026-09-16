/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/CommentComposer.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useAssetResolver } from "../../shared/contexts/AssetContext";
import { useTranslation } from "@bingo/i18n";
import { useUploadImage } from "../../shared/hooks/useUploadImage";
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { getCamera, subscribeCamera } from "../utils/chatShortcuts";
import { Button, ImageIcon, Tooltip, XIcon } from "@bingo/ui";
import * as import_react from "react";

function CommentComposer({
  position,
  onSubmit,
  onCancel,
  placeholder
}) {
  const { t } = useTranslation("editor");
  const resolvedPlaceholder = placeholder ?? t("comments.placeholder");
  const camera = (0, import_react.useSyncExternalStore)(subscribeCamera, getCamera, getCamera);
  const screenX = position.canvasX * camera.scale + camera.positionX;
  const screenY = position.canvasY * camera.scale + camera.positionY;
  const [value, setValue] = (0, import_react.useState)("");
  const [attachments, setAttachments] = (0, import_react.useState)([]);
  const [uploading, setUploading] = (0, import_react.useState)(false);
  const textareaRef = (0, import_react.useRef)(null);
  const uploadImage = useUploadImage();
  const resolveAsset = useAssetResolver();
  (0, import_react.useEffect)(() => {
    textareaRef.current?.focus();
  }, []);
  (0, import_react.useEffect)(() => {
    const handleKeyDown = e => {
      if (matchesShortcut(e, LOCAL_SHORTCUTS.comments.cancelComposer)) {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);
  const handleUpload = async (dataUrl, mimeType) => {
    setUploading(true);
    try {
      const result = await uploadImage(dataUrl, mimeType);
      if (result.url) setAttachments(prev => [...prev, result.url]);
    } finally {
      setUploading(false);
    }
  };
  const handlePaste = e_0 => {
    const items = e_0.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) if (item.type.startsWith("image/")) {
      e_0.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") handleUpload(reader.result, file.type);
      };
      reader.readAsDataURL(file);
      break;
    }
  };
  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;
    onSubmit(trimmed, attachments.length > 0 ? attachments : void 0);
    setValue("");
    setAttachments([]);
  };
  const handleKeyDown_0 = e_1 => {
    if (e_1.nativeEvent.isComposing || e_1.keyCode === 229) return;
    if (e_1.key === "Enter" && (e_1.metaKey || e_1.ctrlKey)) {
      e_1.preventDefault();
      handleSubmit();
    }
  };
  return <div className="absolute pointer-events-auto" style={{
    left: screenX,
    top: screenY + 8,
    zIndex: 40
  }}>{<div className="w-[280px] bg-ed-popover border border-ed-border rounded-lg shadow-lg overflow-hidden">{<textarea ref={textareaRef} value={value} onChange={e_2 => setValue(e_2.target.value)} onKeyDown={handleKeyDown_0} onPaste={handlePaste} placeholder={resolvedPlaceholder} rows={3} className="w-full px-3 py-2.5 bg-transparent text-ed-foreground text-sm border-none outline-none resize-none placeholder:text-ed-muted-foreground" />}{attachments.length > 0 && <div className="flex gap-1 px-3 pb-2 flex-wrap">{attachments.map((url, i) => <div key={i} className="relative group/img">{<img src={resolveAsset ? resolveAsset(url) : url} alt={t("comments.attachment")} className="w-12 h-12 rounded object-cover border border-ed-border" />}{<button aria-label={t("comments.removeAttachment")} onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ed-destructive text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100">{<XIcon width={8} height={8} />}</button>}</div>)}</div>}{uploading && <div className="px-3 pb-2 text-xs text-ed-muted-foreground">{t("comments.uploading")}</div>}{<div className="flex items-center justify-between px-2 py-2 border-t border-ed-border">{<Tooltip content={t("comments.attachImage")}>{<label aria-label={t("comments.attachImage")} className="p-1 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground">{<ImageIcon width={14} height={14} />}{<input type="file" accept="image/*" className="hidden" onChange={e_3 => {
              const file_0 = e_3.target.files?.[0];
              if (!file_0) return;
              const reader_0 = new FileReader();
              reader_0.onload = () => {
                if (typeof reader_0.result === "string") handleUpload(reader_0.result, file_0.type);
              };
              reader_0.readAsDataURL(file_0);
              e_3.target.value = "";
            }} />}</label>}</Tooltip>}{<div className="flex gap-1.5">{<Button variant="ghost" size="xs" onClick={onCancel}>{t("comments.cancel")}</Button>}{<Button size="xs" onClick={handleSubmit} disabled={!value.trim() && attachments.length === 0}>{t("comments.submit")}</Button>}</div>}</div>}</div>}</div>;
}

export { CommentComposer };
