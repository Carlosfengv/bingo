/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/clipboard.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "./idUtils";

var SKIP_TAGS = new Set(["script", "style", "meta", "link", "head", "title", "noscript", "template", "iframe", "object", "embed"]);
var VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var ATTR_MAP = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  crossorigin: "crossOrigin",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  srcset: "srcSet",
  frameborder: "frameBorder",
  contenteditable: "contentEditable"
};
function cssPropToCamelCase(prop) {
  return (prop.startsWith("-") ? prop.slice(1) : prop).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function styleStringToJsx(styleStr) {
  const entries = [];
  for (const decl of styleStr.split(";")) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (prop && value) {
      const camelProp = cssPropToCamelCase(prop);
      const numVal = Number(value);
      const jsVal = !isNaN(numVal) && String(numVal) === value ? value : `"${value.replace(/"/g, "\\\"")}"`;
      entries.push(`${camelProp}: ${jsVal}`);
    }
  }
  return `{{ ${entries.join(", ")} }}`;
}
function escapeJsxText(text) {
  return text.replace(/[{}<>]/g, c => {
    if (c === "{") return "&#123;";
    if (c === "}") return "&#125;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    return c;
  });
}
var SVG_NS = "http://www.w3.org/2000/svg";
function svgAttrName(name) {
  if (name === "class") return "className";
  if (name === "xlink:href") return "href";
  return name;
}
function domNodeToJsx(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const collapsed = (node.textContent || "").replace(/\s*\n\s*/g, " ");
    if (!collapsed.trim()) return "";
    return escapeJsxText(collapsed);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node;
  const isSvg = el.namespaceURI === SVG_NS;
  const tag = isSvg ? el.tagName : el.tagName.toLowerCase();
  if (!isSvg && SKIP_TAGS.has(tag)) return "";
  if (!isSvg && (tag === "html" || tag === "body")) return Array.from(el.childNodes).map(domNodeToJsx).join("");
  const attrs = [];
  for (const attr of Array.from(el.attributes)) {
    const lowerName = attr.name.toLowerCase();
    if (lowerName.startsWith("on")) continue;
    if (lowerName === "style") {
      attrs.push(`style=${styleStringToJsx(attr.value)}`);
      continue;
    }
    const jsxName = isSvg ? svgAttrName(attr.name) : ATTR_MAP[lowerName] || lowerName;
    attrs.push(`${jsxName}="${attr.value.replace(/"/g, "&quot;")}"`);
  }
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  if (!isSvg && VOID_ELEMENTS.has(tag)) return `<${tag}${attrStr} />`;
  return `<${tag}${attrStr}>${Array.from(el.childNodes).map(domNodeToJsx).join("")}</${tag}>`;
}
/**
* Convert an HTML string to valid JSX using DOMParser.
* Handles class→className, style strings→objects, self-closing tags, etc.
* Returns a JSX string ready for parseJSX().
*/
function htmlToJsx(html) {
  const cleaned = html.replace(/<!--StartFragment-->/g, "").replace(/<!--EndFragment-->/g, "");
  const body = new DOMParser().parseFromString(cleaned, "text/html").body;
  if (!body || !body.childNodes.length) return "";
  return Array.from(body.childNodes).map(domNodeToJsx).join("");
}
/**
* Check if a string looks like HTML (has at least one HTML tag).
*/
function looksLikeHTML(text) {
  return /<[a-zA-Z][^>]*>/.test(text);
}
/** MIME type set when dragging a composition from the assets panel. */
var COMPOSITION_DRAG_MIME = "application/x-bingo-composition";
/** MIME type set when dragging a component or HTML element from a panel. */
var ELEMENT_DRAG_MIME = "application/x-bingo-element";
function isCompositionDataTransfer(dataTransfer) {
  return dataTransfer?.getData(COMPOSITION_DRAG_MIME) === "1";
}
function isElementDragDataTransfer(dataTransfer) {
  return dataTransfer?.getData(ELEMENT_DRAG_MIME) === "1";
}
/** True when a panel drag should insert at canvas root at the drop position. */
function isCanvasInsertDrag(dataTransfer) {
  return isCompositionDataTransfer(dataTransfer) || isElementDragDataTransfer(dataTransfer);
}
function createElementDragPayload(element) {
  return JSON.stringify({
    __bingo: true,
    element
  });
}
function createCompositionDragPayload(elements) {
  return JSON.stringify({
    __bingo: true,
    __multi: true,
    elements
  });
}
var PANEL_DRAG_PREVIEW_SELECTOR = "[data-panel-drag-preview]";
function isHiddenDragPreview(el) {
  const style = getComputedStyle(el);
  if (style.opacity === "0" || style.visibility === "hidden" || style.display === "none") return true;
  const rect = el.getBoundingClientRect();
  return rect.width === 0 || rect.height === 0 || rect.left < -500;
}
/** Use a dedicated child preview node so the drag image excludes scrollbars and row chrome. */
function setPanelDragPreview(e, selector = PANEL_DRAG_PREVIEW_SELECTOR) {
  const root = e.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const previewEl = root.querySelector(selector);
  if (!(previewEl instanceof HTMLElement)) return;
  const previewRect = previewEl.getBoundingClientRect();
  const offsetX = Math.min(Math.max(e.clientX - previewRect.left, 0), previewRect.width);
  const offsetY = Math.min(Math.max(e.clientY - previewRect.top, 0), previewRect.height);
  if (!isHiddenDragPreview(previewEl)) {
    e.dataTransfer.setDragImage(previewEl, offsetX, offsetY);
    return;
  }
  const clone = previewEl.cloneNode(true);
  clone.style.cssText = "position:fixed;top:-10000px;left:0;margin:0;pointer-events:none;z-index:-1;opacity:1;";
  document.body.appendChild(clone);
  const cloneRect = clone.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const anchorOffsetX = Math.min(Math.max(e.clientX - rootRect.left, 0), cloneRect.width);
  const anchorOffsetY = Math.min(Math.max(e.clientY - rootRect.top, 0), cloneRect.height);
  e.dataTransfer.setDragImage(clone, anchorOffsetX, anchorOffsetY);
  requestAnimationFrame(() => clone.remove());
}
/** True for a panel drag, read from the MIME list rather than the payload.
*  `dragover` runs in protected mode where getData() returns '', so
*  isCanvasInsertDrag cannot answer this mid-flight — only the types can. */
function isCanvasInsertDragType(dataTransfer) {
  const types = dataTransfer?.types;
  if (!types) return false;
  return types.includes("application/x-bingo-composition") || types.includes("application/x-bingo-element");
}
/**
* The element a panel drag is carrying, parked here for the length of the drag.
*
* The drop outline has to ask the same question the drop asks — "can this host
* accept THIS child?" — or it points at containers the drop then refuses, which
* is the defect in LUN-282 with the sign flipped. The payload is unreadable
* during dragover, so the drag start leaves it here instead.
*/
var pendingPanelDragElement = null;
function getPendingPanelDragElement() {
  return pendingPanelDragElement;
}
/** dragend fires on the source for both a completed drop and an Esc cancel. */
function beginPanelDrag(element) {
  pendingPanelDragElement = element;
  window.addEventListener("dragend", () => {
    pendingPanelDragElement = null;
  }, {
    once: true
  });
}
function setElementDragData(e, element) {
  e.stopPropagation();
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData("text/plain", createElementDragPayload(element));
  e.dataTransfer.setData(ELEMENT_DRAG_MIME, "1");
  beginPanelDrag(element);
  setPanelDragPreview(e);
}
function setCompositionDragData(e, jsx, elements) {
  e.stopPropagation();
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData("text/plain", elements?.length ? createCompositionDragPayload(elements) : jsx);
  e.dataTransfer.setData(COMPOSITION_DRAG_MIME, "1");
  beginPanelDrag(elements?.[0] ?? null);
  setPanelDragPreview(e);
}
var MAX_IMAGE_SIZE_BYTES = 5242880;
var MAX_DIMENSION = 2e3;
var JPEG_QUALITY = .85;
/**
* Compress an image using Canvas API
* Resizes to max dimension and converts to JPEG
*/
async function compressImage(dataUrl, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let {
        width,
        height
      } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round(height * MAX_DIMENSION / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round(width * MAX_DIMENSION / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";
      const quality = outputType === "image/jpeg" ? JPEG_QUALITY : void 0;
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}
/**
* Get the size of a base64 data URL in bytes
*/
function getDataUrlSizeBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || dataUrl;
  return Math.round(base64.length * 3 / 4);
}
/**
* Convert an image file to a data URL
*/
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/**
* Convert an image file to a URL (uploaded via uploadFn) or data URL fallback.
* If uploadFn is provided, tries to upload; falls back to base64 data URL on failure.
* Automatically compresses large images before upload.
*/
async function fileToUrl(file, uploadFn) {
  let dataUrl;
  try {
    dataUrl = await fileToDataUrl(file);
  } catch {
    return {
      src: null,
      error: "read_failed",
      errorMessage: "Failed to read file."
    };
  }
  const sizeBytes = getDataUrlSizeBytes(dataUrl);
  if (file.type.startsWith("image/") && sizeBytes > MAX_IMAGE_SIZE_BYTES) try {
    dataUrl = await compressImage(dataUrl, file.type);
  } catch (err) {
    console.error("Image compression failed:", err);
    return {
      src: null,
      error: "compression_failed",
      errorMessage: "Failed to compress image. Try a smaller image."
    };
  }
  if (uploadFn) try {
    const result = await uploadFn(dataUrl, file.type);
    if (result.url) return {
      src: result.url
    };
  } catch (err) {
    console.warn("[fileToUrl] Upload failed, using data URL fallback:", err);
  }
  return {
    src: dataUrl
  };
}
/**
* Create an image element from a src URL or data URL
*/
function createImageElement(src, position) {
  return {
    id: generatePrefixedId("img"),
    type: "html",
    tag: "img",
    props: {
      src,
      alt: "Image"
    },
    styles: {
      width: 400,
      objectFit: "cover",
      display: "block"
    },
    canvasPosition: position ?? {
      x: 100,
      y: 100
    }
  };
}
/**
* Create a video element from a src URL or data URL
*/
function createVideoElement(src, position) {
  return {
    id: generatePrefixedId("video"),
    type: "html",
    tag: "video",
    props: {
      src,
      controls: true
    },
    styles: {
      width: 400,
      objectFit: "cover",
      display: "block"
    },
    canvasPosition: position ?? {
      x: 100,
      y: 100
    }
  };
}
/**
* Extract image from a drop event.
* Returns the image source (uploaded URL, external URL, or data URL fallback).
* If uploadFn is provided, uploads local files via that function.
*/
async function getImageFromDropEvent(e, uploadFn) {
  const imageFile = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"));
  if (imageFile) return await fileToUrl(imageFile, uploadFn);
  const urlMatch = e.dataTransfer.getData("text/html")?.match(/<img[^>]+src="([^"]+)"/);
  if (urlMatch) return {
    src: urlMatch[1]
  };
  const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
  if (url && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)) return {
    src: url
  };
  return {
    src: null
  };
}
/**
* Copy an element to the system clipboard
*/
async function copyElementToClipboard(element) {
  const clipboardData = {
    __bingo: true,
    element
  };
  try {
    await navigator.clipboard.writeText(JSON.stringify(clipboardData));
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}
/**
* Read element from the system clipboard.
* Returns null if clipboard doesn't contain valid Bingo data or images.
* If uploadFn is provided, uploads pasted images via that function; otherwise uses data URL.
*/
async function readElementFromClipboard(uploadFn) {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find(type => type.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        const result = await fileToUrl(new File([blob], "pasted-image", {
          type: imageType
        }), uploadFn);
        if (result.error) return {
          element: null,
          error: result.error,
          errorMessage: result.errorMessage
        };
        if (result.src) return {
          element: createImageElement(result.src)
        };
      }
    }
  } catch {}
  let clipboardText;
  try {
    clipboardText = await navigator.clipboard.readText();
  } catch (err) {
    console.error("Failed to read from clipboard:", err);
    return {
      element: null
    };
  }
  let clipboardData;
  try {
    clipboardData = JSON.parse(clipboardText);
  } catch {
    return {
      element: null
    };
  }
  if (!clipboardData.__bingo || !clipboardData.element) return {
    element: null
  };
  return {
    element: clipboardData.element
  };
}

export { COMPOSITION_DRAG_MIME, copyElementToClipboard, createCompositionDragPayload, createImageElement, createVideoElement, fileToUrl, getImageFromDropEvent, getPendingPanelDragElement, htmlToJsx, isCanvasInsertDrag, isCanvasInsertDragType, looksLikeHTML, readElementFromClipboard, setCompositionDragData, setElementDragData };
