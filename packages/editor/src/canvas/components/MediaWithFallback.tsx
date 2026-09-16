/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/MediaWithFallback.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { MediaUploadPlaceholder } from "./MediaUploadPlaceholder";
import { normalizeReactAttrs } from "@bingo/compiler";
import { ImageBrokenIcon, ImageIcon, SpinnerIcon, VideoCameraIcon } from "@bingo/ui";
import { VideoCameraSlash as c$4 } from "@phosphor-icons/react/dist/icons/VideoCameraSlash";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var PLACEHOLDER_ICON = {
  img: {
    empty: ImageIcon,
    error: ImageBrokenIcon,
    loading: SpinnerIcon
  },
  video: {
    empty: VideoCameraIcon,
    error: c$4,
    loading: SpinnerIcon
  }
};
function MediaWithFallback(t0) {
  const $ = (0, import_compiler_runtime.c)(21);
  const {
    tag,
    elementProps,
    style,
    commonProps,
    children,
    onCommitSource
  } = t0;
  const src = elementProps.src;
  const [errored, setErrored] = (0, import_react.useState)(false);
  const [seenSrc, setSeenSrc] = (0, import_react.useState)(src);
  if (src !== seenSrc) {
    setSeenSrc(src);
    if (errored) setErrored(false);
  }
  const hasSource = isNonEmptyString(src) || tag === "video" && hasChildren(children);
  const isUploading = elementProps["data-uploading"] === "true";
  const previewSrc = elementProps["data-upload-preview"];
  if (isUploading && !errored && isNonEmptyString(previewSrc)) {
    let t1;
    if ($[0] !== commonProps || $[1] !== previewSrc || $[2] !== style) {
      t1 = renderUploadingPreview(previewSrc, style, commonProps);
      $[0] = commonProps;
      $[1] = previewSrc;
      $[2] = style;
      $[3] = t1;
    } else t1 = $[3];
    return t1;
  }
  if (!hasSource || errored) {
    if (!errored && !isUploading && onCommitSource) {
      let t1;
      if ($[4] !== commonProps || $[5] !== onCommitSource || $[6] !== style || $[7] !== tag) {
        t1 = (0, import_react.createElement)(MediaUploadPlaceholder, {
          tag,
          style,
          commonProps,
          onCommitSource
        });
        $[4] = commonProps;
        $[5] = onCommitSource;
        $[6] = style;
        $[7] = tag;
        $[8] = t1;
      } else t1 = $[8];
      return t1;
    }
    const state = errored ? "error" : isUploading ? "loading" : "empty";
    let t1;
    if ($[9] !== commonProps || $[10] !== state || $[11] !== style || $[12] !== tag) {
      t1 = renderPlaceholder(tag, state, style, commonProps);
      $[9] = commonProps;
      $[10] = state;
      $[11] = style;
      $[12] = tag;
      $[13] = t1;
    } else t1 = $[13];
    return t1;
  }
  let t1;
  if ($[14] !== children || $[15] !== commonProps || $[16] !== elementProps || $[17] !== style || $[18] !== tag) {
    let t2;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = () => setErrored(true);
      $[20] = t2;
    } else t2 = $[20];
    t1 = (0, import_react.createElement)(tag, {
      ...normalizeReactAttrs(elementProps),
      style,
      ...commonProps,
      draggable: false,
      onError: t2
    }, tag === "video" ? children : void 0);
    $[14] = children;
    $[15] = commonProps;
    $[16] = elementProps;
    $[17] = style;
    $[18] = tag;
    $[19] = t1;
  } else t1 = $[19];
  return t1;
}
function renderPlaceholder(tag, state, style, commonProps) {
  const Icon = PLACEHOLDER_ICON[tag][state];
  const sizeStyle = {
    width: style?.width ?? 200,
    height: style?.height ?? 150
  };
  return (0, import_react.createElement)("div", {
    ...commonProps,
    style: sizeStyle,
    "data-media-placeholder": state,
    className: "box-border flex items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed border-border bg-muted text-muted-foreground"
  }, (0, import_react.createElement)(Icon, {
    width: 36,
    height: 36,
    className: state === "loading" ? "animate-spin" : void 0
  }));
}
function renderUploadingPreview(previewSrc, style, commonProps) {
  const sizeStyle = {
    width: style?.width ?? 200,
    height: style?.height ?? 150
  };
  return (0, import_react.createElement)("div", {
    ...commonProps,
    style: sizeStyle,
    "data-media-placeholder": "loading",
    className: "relative box-border flex items-center justify-center overflow-hidden bg-muted"
  }, (0, import_react.createElement)("img", {
    src: previewSrc,
    draggable: false,
    "aria-hidden": true,
    className: "absolute inset-0 h-full w-full scale-110 object-cover blur-md brightness-75"
  }), (0, import_react.createElement)(SpinnerIcon, {
    width: 32,
    height: 32,
    className: "relative animate-spin text-white drop-shadow"
  }));
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
function hasChildren(children) {
  return Array.isArray(children) ? children.length > 0 : children != null;
}

export { MediaWithFallback };
