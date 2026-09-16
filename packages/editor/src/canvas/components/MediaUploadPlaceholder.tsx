/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/MediaUploadPlaceholder.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useUploadImage } from "../../shared/hooks/useUploadImage";
import { fileToUrl } from "../../shared/utils/clipboard";
import { ArrowRightIcon, Button, FileImageIcon, FileVideoIcon, Input, SpinnerIcon, Text$4, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

function MediaUploadPlaceholder(t0) {
  const $ = (0, import_compiler_runtime.c)(62);
  const { t } = useTranslation("editor");
  const {
    tag,
    style,
    commonProps,
    onCommitSource
  } = t0;
  const uploadImage = useUploadImage();
  const fileInputRef = (0, import_react.useRef)(null);
  const [isDragOver, setIsDragOver] = (0, import_react.useState)(false);
  const [uploading, setUploading] = (0, import_react.useState)(false);
  const [previewUrl, setPreviewUrl] = (0, import_react.useState)(void 0);
  const [url, setUrl] = (0, import_react.useState)("");
  const isVideo = tag === "video";
  const mediaWord = t(isVideo ? "canvas.video" : "canvas.image");
  const accept = isVideo ? "video/*" : "image/*";
  const MediaIcon = isVideo ? FileVideoIcon : FileImageIcon;
  const t1 = style?.width ?? 200;
  const t2 = style?.height ?? 150;
  let t3;
  if ($[0] !== t1 || $[1] !== t2) {
    t3 = {
      width: t1,
      height: t2
    };
    $[0] = t1;
    $[1] = t2;
    $[2] = t3;
  } else t3 = $[2];
  const sizeStyle = t3;
  let t4;
  if ($[3] !== mediaWord || $[4] !== onCommitSource || $[5] !== uploadImage) {
    t4 = async file => {
      setUploading(true);
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : void 0;
      setPreviewUrl(preview);
      const result = await fileToUrl(file, uploadImage);
      if (result.error || !result.src) {
        if (preview) URL.revokeObjectURL(preview);
        setPreviewUrl(void 0);
        setUploading(false);
        toast.error(t("canvas.uploadMediaFailed", { media: mediaWord }), result.errorMessage ? { description: result.errorMessage } : void 0);
        return;
      }
      onCommitSource(result.src);
      if (preview) URL.revokeObjectURL(preview);
    };
    $[3] = mediaWord;
    $[4] = onCommitSource;
    $[5] = uploadImage;
    $[6] = t4;
  } else t4 = $[6];
  const handleFile = t4;
  let t5;
  if ($[7] !== handleFile) {
    t5 = e => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file_0 = e.dataTransfer.files?.[0];
      if (file_0) handleFile(file_0);
    };
    $[7] = handleFile;
    $[8] = t5;
  } else t5 = $[8];
  const handleDrop = t5;
  let t6;
  if ($[9] !== onCommitSource || $[10] !== url) {
    t6 = () => {
      const trimmed = url.trim();
      if (trimmed) onCommitSource(trimmed);
    };
    $[9] = onCommitSource;
    $[10] = url;
    $[11] = t6;
  } else t6 = $[11];
  const submitUrl = t6;
  let t7;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = {
      onPointerDown: stop$1,
      onMouseDown: stop$1,
      onClick: stop$1
    };
    $[12] = t7;
  } else t7 = $[12];
  const stopPointer = t7;
  if (uploading) {
    let t8;
    if ($[13] !== previewUrl) {
      t8 = previewUrl && <img src={previewUrl} aria-hidden={true} draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover blur-md brightness-75" />;
      $[13] = previewUrl;
      $[14] = t8;
    } else t8 = $[14];
    const t9 = previewUrl ? "text-white" : "text-card-foreground";
    let t10;
    if ($[15] !== t9) {
      t10 = cn$2("relative animate-spin", t9);
      $[15] = t9;
      $[16] = t10;
    } else t10 = $[16];
    let t11;
    if ($[17] !== t10) {
      t11 = <SpinnerIcon width={28} height={28} className={t10} />;
      $[17] = t10;
      $[18] = t11;
    } else t11 = $[18];
    let t12;
    if ($[19] !== commonProps || $[20] !== sizeStyle || $[21] !== t11 || $[22] !== t8) {
      t12 = <div {...commonProps} style={sizeStyle} data-media-placeholder="loading" className="relative box-border flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-card">{t8}{t11}</div>;
      $[19] = commonProps;
      $[20] = sizeStyle;
      $[21] = t11;
      $[22] = t8;
      $[23] = t12;
    } else t12 = $[23];
    return t12;
  }
  let t8;
  let t9;
  if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = e_0 => {
      e_0.preventDefault();
      e_0.stopPropagation();
      setIsDragOver(true);
    };
    t9 = e_1 => {
      e_1.preventDefault();
      setIsDragOver(false);
    };
    $[24] = t8;
    $[25] = t9;
  } else {
    t8 = $[24];
    t9 = $[25];
  }
  const t10 = isDragOver ? "border-foreground bg-accent" : "border-border bg-card";
  let t11;
  if ($[26] !== t10) {
    t11 = cn$2("relative box-border flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-[1.5px] border-dashed p-4 text-center", t10);
    $[26] = t10;
    $[27] = t11;
  } else t11 = $[27];
  let t12;
  if ($[28] !== handleFile) {
    t12 = e_2 => {
      const file_1 = e_2.target.files?.[0];
      e_2.target.value = "";
      if (file_1) handleFile(file_1);
    };
    $[28] = handleFile;
    $[29] = t12;
  } else t12 = $[29];
  let t13;
  if ($[30] !== accept || $[31] !== t12) {
    t13 = <input ref={fileInputRef} type="file" accept={accept} hidden={true} onChange={t12} />;
    $[30] = accept;
    $[31] = t12;
    $[32] = t13;
  } else t13 = $[32];
  let t14;
  if ($[33] !== MediaIcon) {
    t14 = <div className="relative">{<div className="relative text-muted-foreground">{<MediaIcon width={36} height={36} />}</div>}</div>;
    $[33] = MediaIcon;
    $[34] = t14;
  } else t14 = $[34];
  let t15;
  if (true) {
    t15 = <div className="flex flex-wrap items-center justify-center gap-1 leading-snug">{<Button type="button" variant="link" size="text" isChildText={false} {...stopPointer} onClick={e_3 => {
        stop$1(e_3);
        fileInputRef.current?.click();
      }}>{<Text$4 size="2xs" weight="semibold">{t("canvas.uploadMedia")}</Text$4>}</Button>}{<Text$4 size="2xs" variant="tertiary">{t("canvas.dragMedia")}</Text$4>}</div>;
    $[35] = t15;
  } else t15 = $[35];
  const t16 = t("canvas.pasteMediaUrl", { media: mediaWord });
  let t17;
  if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = e_4 => setUrl(e_4.target.value);
    $[36] = t17;
  } else t17 = $[36];
  let t18;
  if ($[37] !== submitUrl) {
    t18 = e_5 => {
      if (e_5.nativeEvent.isComposing) return;
      if (e_5.key === "Enter") {
        e_5.preventDefault();
        submitUrl();
      }
    };
    $[37] = submitUrl;
    $[38] = t18;
  } else t18 = $[38];
  let t19;
  if ($[39] !== t16 || $[40] !== t18 || $[41] !== url) {
    t19 = <Input type="text" size="xs" value={url} placeholder={t16} onChange={t17} onKeyDown={t18} className="flex-1 h-6" />;
    $[39] = t16;
    $[40] = t18;
    $[41] = url;
    $[42] = t19;
  } else t19 = $[42];
  const t20 = t("canvas.addMediaUrl", { media: mediaWord });
  let t21;
  if ($[43] !== url) {
    t21 = url.trim();
    $[43] = url;
    $[44] = t21;
  } else t21 = $[44];
  const t22 = !t21;
  let t23;
  if ($[45] !== submitUrl) {
    t23 = e_6 => {
      stop$1(e_6);
      submitUrl();
    };
    $[45] = submitUrl;
    $[46] = t23;
  } else t23 = $[46];
  let t24;
  if ($[47] !== t20 || $[48] !== t22 || $[49] !== t23) {
    t24 = <Button type="button" size="icon-xs" RightIcon={ArrowRightIcon} aria-label={t20} disabled={t22} {...stopPointer} onClick={t23} />;
    $[47] = t20;
    $[48] = t22;
    $[49] = t23;
    $[50] = t24;
  } else t24 = $[50];
  let t25;
  if ($[51] !== t19 || $[52] !== t24) {
    t25 = <div {...stopPointer} className="flex w-full max-w-[280px] items-center gap-1.5">{t19}{t24}</div>;
    $[51] = t19;
    $[52] = t24;
    $[53] = t25;
  } else t25 = $[53];
  let t26;
  if ($[54] !== commonProps || $[55] !== handleDrop || $[56] !== sizeStyle || $[57] !== t11 || $[58] !== t13 || $[59] !== t14 || $[60] !== t25) {
    t26 = <div {...commonProps} style={sizeStyle} data-media-placeholder="empty" onDragOver={t8} onDragLeave={t9} onDrop={handleDrop} className={t11}>{t13}{t14}{t15}{t25}</div>;
    $[54] = commonProps;
    $[55] = handleDrop;
    $[56] = sizeStyle;
    $[57] = t11;
    $[58] = t13;
    $[59] = t14;
    $[60] = t25;
    $[61] = t26;
  } else t26 = $[61];
  return t26;
}
function stop$1(e) {
  e.stopPropagation();
}

export { MediaUploadPlaceholder };
