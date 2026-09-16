/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/figmaExport.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var CSS_DEFAULTS = {
  alignContent: "normal",
  alignItems: "normal",
  alignSelf: "auto",
  aspectRatio: "auto",
  backdropFilter: "none",
  backgroundAttachment: "scroll",
  backgroundBlendMode: "normal",
  backgroundClip: "border-box",
  backgroundColor: "rgba(0, 0, 0, 0)",
  backgroundImage: "none",
  backgroundOrigin: "padding-box",
  backgroundPositionX: "0%",
  backgroundPositionY: "0%",
  backgroundRepeat: "repeat",
  backgroundSize: "auto",
  borderBottomColor: "rgb(0, 0, 0)",
  borderBottomLeftRadius: "0px",
  borderBottomRightRadius: "0px",
  borderBottomStyle: "none",
  borderBottomWidth: "0px",
  borderCollapse: "separate",
  borderImageOutset: "0",
  borderImageRepeat: "stretch",
  borderImageSlice: "100%",
  borderImageSource: "none",
  borderImageWidth: "1",
  borderLeftColor: "rgb(0, 0, 0)",
  borderLeftStyle: "none",
  borderLeftWidth: "0px",
  borderRightColor: "rgb(0, 0, 0)",
  borderRightStyle: "none",
  borderRightWidth: "0px",
  borderSpacing: "0px",
  borderTopColor: "rgb(0, 0, 0)",
  borderTopLeftRadius: "0px",
  borderTopRightRadius: "0px",
  borderTopStyle: "none",
  borderTopWidth: "0px",
  bottom: "auto",
  boxShadow: "none",
  boxSizing: "content-box",
  clip: "auto",
  clipPath: "none",
  clipRule: "nonzero",
  color: "rgb(0, 0, 0)",
  colorScheme: "normal",
  columnCount: "auto",
  columnFill: "balance",
  columnGap: "normal",
  columnRuleColor: "rgb(0, 0, 0)",
  columnRuleStyle: "none",
  columnRuleWidth: "0px",
  columnSpan: "none",
  columnWidth: "auto",
  contain: "none",
  containerType: "normal",
  content: "normal",
  contentVisibility: "visible",
  display: "",
  filter: "none",
  flexBasis: "auto",
  flexDirection: "row",
  flexGrow: "0",
  flexShrink: "1",
  flexWrap: "nowrap",
  fontFamily: "Times",
  fontFeatureSettings: "normal",
  fontKerning: "auto",
  fontOpticalSizing: "auto",
  fontPalette: "normal",
  fontSize: "16px",
  fontSizeAdjust: "none",
  fontStretch: "100%",
  fontStyle: "normal",
  fontWeight: "400",
  gridAutoColumns: "auto",
  gridAutoFlow: "row",
  gridAutoRows: "auto",
  gridColumnEnd: "auto",
  gridColumnStart: "auto",
  gridRowEnd: "auto",
  gridRowStart: "auto",
  gridTemplateAreas: "none",
  gridTemplateColumns: "none",
  gridTemplateRows: "none",
  height: "auto",
  isolation: "auto",
  justifyItems: "normal",
  justifySelf: "auto",
  justifyContent: "normal",
  left: "auto",
  letterSpacing: "normal",
  lineBreak: "auto",
  lineHeight: "normal",
  listStyleImage: "none",
  listStylePosition: "outside",
  listStyleType: "disc",
  marginBottom: "0px",
  marginLeft: "0px",
  marginRight: "0px",
  marginTop: "0px",
  maxHeight: "none",
  maxWidth: "none",
  minHeight: "0px",
  minWidth: "0px",
  mixBlendMode: "normal",
  objectFit: "fill",
  opacity: "1",
  outlineColor: "rgb(0, 0, 0)",
  outlineOffset: "0px",
  outlineStyle: "none",
  outlineWidth: "0px",
  overflow: "visible",
  overflowX: "visible",
  overflowY: "visible",
  position: "static",
  paddingBottom: "0px",
  paddingLeft: "0px",
  paddingRight: "0px",
  paddingTop: "0px",
  right: "auto",
  rowGap: "normal",
  strokeDasharray: "none",
  strokeDashoffset: "0px",
  strokeLinecap: "butt",
  strokeLinejoin: "miter",
  strokeMiterlimit: "4",
  strokeOpacity: "1",
  strokeWidth: "1px",
  textAlign: "start",
  textDecorationColor: "rgb(0, 0, 0)",
  textDecorationLine: "none",
  textDecorationStyle: "solid",
  textIndent: "0px",
  textShadow: "none",
  textTransform: "none",
  top: "auto",
  transform: "none",
  transformOrigin: "auto",
  translate: "none",
  transitionProperty: "all",
  verticalAlign: "baseline",
  visibility: "visible",
  whiteSpace: "normal",
  width: "auto",
  willChange: "auto",
  writingMode: "horizontal-tb",
  zIndex: "auto",
  rotate: "none",
  scale: "none"
};
var BORDER_GROUPS = [{
  style: "borderTopStyle",
  width: "borderTopWidth",
  color: "borderTopColor"
}, {
  style: "borderRightStyle",
  width: "borderRightWidth",
  color: "borderRightColor"
}, {
  style: "borderBottomStyle",
  width: "borderBottomWidth",
  color: "borderBottomColor"
}, {
  style: "borderLeftStyle",
  width: "borderLeftWidth",
  color: "borderLeftColor"
}];
var ALLOWED_ATTRIBUTES = new Set(["alt", "checked", "currentSrc", "disabled", "for", "href", "id", "multiple", "placeholder", "poster", "readonly", "rel", "required", "role", "selected", "target", "title", "type", "value"]);
var nodeIdCounter = 0;
function generateNodeId() {
  return `h2d-node-${++nodeIdCounter}`;
}
/**
* Convert modern CSS color formats (oklch, lab, color-mix, etc.) to rgba()
* that Figma's H2D parser understands.
*/
var colorConversionCtx = (() => {
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.getContext("2d", {
      willReadFrequently: true
    });
  } catch {
    return null;
  }
})();
function normalizeColor(value) {
  if (!value) return value;
  if (value === "transparent") return "rgba(0, 0, 0, 0)";
  if (!colorConversionCtx) return value;
  try {
    colorConversionCtx.clearRect(0, 0, 1, 1);
    colorConversionCtx.fillStyle = value;
    colorConversionCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = colorConversionCtx.getImageData(0, 0, 1, 1).data;
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return value;
  }
}
var COLOR_PROPS = new Set(["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "textDecorationColor", "columnRuleColor"]);
function getComputedStyleDiff(el) {
  const styles = {};
  const computed = window.getComputedStyle(el);
  for (const [prop, defaultVal] of Object.entries(CSS_DEFAULTS)) {
    let value = computed[prop];
    if (COLOR_PROPS.has(prop)) value = normalizeColor(value);
    if (value !== defaultVal) styles[prop] = value;
  }
  for (const group of BORDER_GROUPS) if (styles[group.width] == null) {
    delete styles[group.style];
    delete styles[group.color];
  }
  if (styles.outlineWidth == null) {
    delete styles.outlineStyle;
    delete styles.outlineColor;
  }
  return styles;
}
function getElementRect(el) {
  const {
    x,
    y,
    width,
    height
  } = el.getBoundingClientRect();
  let cssWidth = width;
  let cssHeight = height;
  if (el instanceof HTMLElement) {
    cssWidth = el.offsetWidth;
    cssHeight = el.offsetHeight;
  }
  return {
    x,
    y,
    width,
    height,
    cssWidth,
    cssHeight
  };
}
function getTextRect(nodes) {
  const range = document.createRange();
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  range.setStart(first, 0);
  if (last.nodeType === Node.TEXT_NODE) range.setEnd(last, last.length);else range.setEnd(last, last.childNodes.length);
  const {
    x,
    y,
    width,
    height
  } = range.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
  const lineCount = new Set(rects.map(r => Math.round(r.top))).size;
  range.detach();
  return {
    x,
    y,
    width,
    height,
    lineCount
  };
}
function getAttributes(el) {
  const attrs = {};
  for (const {
    name,
    value
  } of Array.from(el.attributes)) {
    const lower = name.toLowerCase();
    if (lower === "data-element-id") continue;
    if (lower === "data-iframe-overlay") continue;
    if (lower === "data-text-element") continue;
    if (lower === "data-h2d-ignore") continue;
    if (lower === "draggable") continue;
    if (value === "draggable" && lower === "aria-roledescription") continue;
    if (lower === "aria-describedby" && value?.startsWith("DndDescribedBy-")) continue;
    if (ALLOWED_ATTRIBUTES.has(lower) || lower.startsWith("aria-")) attrs[name] = value;
  }
  if (el instanceof HTMLImageElement && el.currentSrc) attrs.currentSrc = el.currentSrc;
  if (el instanceof HTMLVideoElement) {
    if (el.poster) attrs.poster = el.poster;
    if (el.currentSrc) attrs.currentSrc = el.currentSrc;
  }
  if (el instanceof HTMLInputElement && !attrs.type) attrs.type = el.type;
  return attrs;
}
function serializeSVG(svg) {
  const clone = svg.cloneNode(true);
  const computed = window.getComputedStyle(svg);
  const w = computed.getPropertyValue("width");
  const h = computed.getPropertyValue("height");
  if (w.endsWith("px") && h.endsWith("px")) {
    clone.setAttribute("width", w);
    clone.setAttribute("height", h);
  }
  return clone.outerHTML;
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new File([blob], "", {
      type: "application/octet-stream"
    }));
  });
}
/**
* Extract image data from an already-loaded <img> element by drawing it
* to a canvas. Works for same-origin and data-URL images. Returns null
* if the canvas is tainted (cross-origin without CORS).
*/
function captureImgElement(img) {
  const url = img.currentSrc || img.src;
  if (!url || !img.naturalWidth || !img.naturalHeight) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return {
      url,
      blob: {
        type: "image/png",
        base64Blob: canvas.toDataURL("image/png")
      }
    };
  } catch {
    return null;
  }
}
/**
* Resolve an API asset URL to the public R2 URL by asking the API,
* then fetch directly from R2 (public bucket, no credentials needed).
*/
async function fetchViaResolvedUrl(apiUrl) {
  try {
    const resolveUrl = `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}resolve=url`;
    const res = await fetch(resolveUrl, {
      credentials: "include"
    });
    if (!res.ok) throw new Error(`Resolve failed: HTTP ${res.status}`);
    const {
      publicUrl
    } = await res.json();
    if (!publicUrl) throw new Error("No publicUrl in response");
    const imgRes = await fetch(publicUrl);
    if (!imgRes.ok) throw new Error(`R2 fetch failed: HTTP ${imgRes.status}`);
    const blob = await imgRes.blob();
    const base64 = await blobToBase64(blob);
    return {
      url: apiUrl,
      blob: {
        type: blob.type,
        base64Blob: base64
      }
    };
  } catch (error) {
    console.warn("[figmaExport] Failed to fetch image:", apiUrl, error);
    return {
      url: apiUrl,
      blob: null,
      error: String(error)
    };
  }
}
function collectImages(el) {
  const seen = new Set();
  const results = [];
  const addImg = img => {
    const url = img.currentSrc || img.src;
    if (url && !seen.has(url)) {
      seen.add(url);
      results.push({
        url,
        imgElement: img
      });
    }
  };
  const addBgUrl = bgUrl => {
    if (!seen.has(bgUrl)) {
      seen.add(bgUrl);
      results.push({
        url: bgUrl
      });
    }
  };
  if (el instanceof HTMLImageElement) addImg(el);
  for (const child of el.querySelectorAll("img")) addImg(child);
  const checkBg = target => {
    const bg = window.getComputedStyle(target).backgroundImage;
    if (bg && bg !== "none") for (const [, url] of bg.matchAll(/url\("(.*?)"\)/g)) addBgUrl(url);
  };
  checkBg(el);
  for (const child of el.querySelectorAll("*")) checkBg(child);
  return results;
}
function serializeTextNodes(nodes) {
  const text = nodes.map(n => n.textContent || "").join("");
  const rect = getTextRect(nodes);
  return {
    nodeType: 3,
    id: generateNodeId(),
    text,
    rect
  };
}
function isEditorChrome(el) {
  if (el.getAttribute("data-iframe-overlay") === "true") return true;
  if (el.getAttribute("data-h2d-ignore") === "true") return true;
  return false;
}
function isDraggableWrapper(el) {
  return el.tagName === "DIV" && el.getAttribute("aria-roledescription") === "draggable";
}
function serializeElementNode(el) {
  const tag = el.tagName.toUpperCase();
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "HEAD") return null;
  if (isEditorChrome(el)) return null;
  if (isDraggableWrapper(el)) {
    const results = [];
    for (const child of iterateChildGroups(el)) {
      const node = serializeDOMNode(child);
      if (node) results.push(node);
    }
    if (results.length === 1) return results[0].nodeType === 1 ? results[0] : null;
    return results.length > 0 ? {
      nodeType: 1,
      id: generateNodeId(),
      tag: "DIV",
      attributes: {},
      styles: {
        display: "contents"
      },
      rect: getElementRect(el),
      childNodes: results
    } : null;
  }
  let content;
  const childNodes = [];
  if (el instanceof SVGElement && el.tagName.toLowerCase() === "svg") content = serializeSVG(el);else if (el instanceof HTMLCanvasElement) {} else {
    const root = el.shadowRoot ?? el;
    for (const child of iterateChildGroups(root)) {
      const node = serializeDOMNode(child);
      if (node) childNodes.push(node);
    }
  }
  const styles = getComputedStyleDiff(el);
  const rect = getElementRect(el);
  const attributes = getAttributes(el);
  return {
    nodeType: 1,
    id: generateNodeId(),
    tag,
    attributes,
    styles,
    rect,
    childNodes,
    content
  };
}
function* iterateChildGroups(el) {
  const children = el.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE) {
      const group = [child];
      let next = i + 1;
      while (next < children.length && children[next].nodeType === Node.TEXT_NODE) {
        group.push(children[next]);
        next++;
      }
      yield group;
      i = next - 1;
    } else yield child;
  }
}
function serializeDOMNode(nodeOrGroup) {
  if (Array.isArray(nodeOrGroup)) return serializeTextNodes(nodeOrGroup);
  const node = nodeOrGroup;
  if (node.nodeType === Node.TEXT_NODE) return serializeTextNodes([node]);
  if (node.nodeType === Node.ELEMENT_NODE) return serializeElementNode(node);
  return null;
}
/**
* Skip DraggableElement wrappers to find the actual content element.
* Handles both display:contents (most elements) and display:inline-block (img/video).
*/
function resolveVisibleElement(el) {
  if (isDraggableWrapper(el) && el.children.length > 0) return el.children[0];
  return el;
}
function findCanvasElementDOM(elementId) {
  const el = document.querySelector(`[data-element-id="${elementId}"]`);
  if (!el) return null;
  return resolveVisibleElement(el);
}
/**
* Scale all rects in an H2D tree to undo the canvas zoom transform.
* getBoundingClientRect() returns screen-space values, but we need
* design-space values (1:1 with CSS px at 100% zoom).
*/
function normalizeNodeRects(node, scale) {
  if (scale === 1) return;
  const inv = 1 / scale;
  if (node.nodeType === 1) {
    const el = node;
    el.rect = {
      x: el.rect.x * inv,
      y: el.rect.y * inv,
      width: el.rect.width * inv,
      height: el.rect.height * inv,
      cssWidth: el.rect.cssWidth * inv,
      cssHeight: el.rect.cssHeight * inv
    };
    for (const child of el.childNodes) normalizeNodeRects(child, scale);
  } else {
    const t = node;
    t.rect = {
      x: t.rect.x * inv,
      y: t.rect.y * inv,
      width: t.rect.width * inv,
      height: t.rect.height * inv,
      lineCount: t.rect.lineCount
    };
  }
}
async function buildPayload(domElements, canvasScale) {
  nodeIdCounter = 0;
  const inv = 1 / canvasScale;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of domElements) {
    const rect = el.getBoundingClientRect();
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  const docWidth = (maxX - minX) * inv;
  const docHeight = (maxY - minY) * inv;
  const serializedChildren = [];
  const allImages = [];
  for (const el of domElements) {
    const node = serializeElementNode(el);
    if (node) {
      normalizeNodeRects(node, canvasScale);
      serializedChildren.push(node);
    }
    for (const img of collectImages(el)) allImages.push(img);
  }
  const root = domElements.length === 1 && serializedChildren.length === 1 ? serializedChildren[0] : {
    nodeType: 1,
    id: generateNodeId(),
    tag: "DIV",
    attributes: {},
    styles: {
      display: "flex",
      flexDirection: "column",
      position: "relative"
    },
    rect: {
      x: minX * inv,
      y: minY * inv,
      width: docWidth,
      height: docHeight,
      cssWidth: docWidth,
      cssHeight: docHeight
    },
    childNodes: serializedChildren
  };
  const assets = {};
  const fetchPromises = [];
  for (const {
    url,
    imgElement
  } of allImages) {
    if (assets[url]) continue;
    if (imgElement) {
      const captured = captureImgElement(imgElement);
      if (captured?.blob) {
        assets[url] = captured;
        continue;
      }
    }
    fetchPromises.push(fetchViaResolvedUrl(url).then(asset => {
      assets[url] = asset;
    }));
  }
  await Promise.all(fetchPromises);
  return {
    root,
    documentRect: {
      x: 0,
      y: 0,
      width: docWidth,
      height: docHeight
    },
    viewportRect: {
      x: 0,
      y: 0,
      width: docWidth,
      height: docHeight
    },
    devicePixelRatio: window.devicePixelRatio,
    assets,
    fonts: {}
  };
}
async function encodeH2DPayload(payload) {
  return JSON.stringify(payload);
}
async function toBase64String(data) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new File([new TextEncoder().encode(data)], "", {
      type: "application/octet-stream"
    }));
  });
}
async function createH2DClipboardBlob(jsonString) {
  const dataUrl = await toBase64String(jsonString);
  const html = `<span data-h2d="<!--(figh2d)${dataUrl.slice(dataUrl.indexOf(",") + 1)}(/figh2d)-->"></span>`;
  return new Blob([html], {
    type: "text/html"
  });
}
/**
* Copy selected canvas elements to Figma's clipboard format.
* Elements are identified by their `data-element-id` in the DOM.
*
* @param elementIds - IDs of elements to export (from selectedElementIds)
* @param canvasScale - current canvas zoom level (1 = 100%). Rects are
*                      divided by this so Figma receives design-space sizes.
* @returns true if copy succeeded
*/
async function copyToFigma(elementIds, canvasScale = 1) {
  if (elementIds.length === 0) return false;
  const domElements = [];
  for (const id of elementIds) {
    const el = findCanvasElementDOM(id);
    if (el) domElements.push(el);
  }
  if (domElements.length === 0) {
    console.warn("[figmaExport] No DOM elements found for given IDs");
    return false;
  }
  try {
    const blobPromise = (async () => {
      const payload = await buildPayload(domElements, canvasScale);
      const assetEntries = Object.entries(payload.assets);
      const succeeded = assetEntries.filter(([, a]) => a.blob != null);
      const failed = assetEntries.filter(([, a]) => a.blob == null);
      console.log(`[figmaExport] ${domElements.length} elements, ${assetEntries.length} images (${succeeded.length} ok, ${failed.length} failed)`);
      console.log("[figmaExport] root tag:", payload.root.tag, "| children:", payload.root.childNodes.length, "| asset keys:", Object.keys(payload.assets));
      if (failed.length > 0) console.warn("[figmaExport] Failed images:", failed.map(([url, a]) => `${url}: ${a.error}`));
      return createH2DClipboardBlob(await encodeH2DPayload(payload));
    })();
    const item = new ClipboardItem({
      "text/html": blobPromise
    });
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    console.error("[figmaExport] Failed to copy to Figma:", error);
    return false;
  }
}

export { copyToFigma };
