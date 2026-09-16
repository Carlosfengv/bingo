/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/toolElements.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "./idUtils";

var CONTAINER_BG = "rgba(59, 130, 246, 0.25)";
/** Default size for a click-without-drag insert, per tool. */
var DEFAULT_TOOL_SIZE = {
  frame: {
    width: 100,
    height: 100
  },
  "stack-h": {
    width: 100,
    height: 100
  },
  "stack-v": {
    width: 100,
    height: 100
  },
  grid: {
    width: 100,
    height: 100
  },
  image: {
    width: 100,
    height: 100
  },
  video: {
    width: 100,
    height: 100
  },
  html: {
    width: 100,
    height: 100
  }
};
/** Tools that create an element by drawing/clicking on the canvas. */
function isDrawableTool(tool) {
  return tool in DEFAULT_TOOL_SIZE || tool === "text";
}
/**
* Build the base element an armed insert tool should create at the given size.
* Placement (root `canvasPosition`, or nested `position`/`left`/`top`) is
* applied by the caller (see useCanvasDraw), since it depends on whether the
* element lands at the canvas root or inside a container.
*
* Frame is deliberately NOT `display: flex` — it is a freeform container whose
* children can sit `position: absolute` inside it. Stack H/V and Grid are the
* flex / grid layout containers.
*/
function createToolElement(tool, size) {
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  switch (tool) {
    case "frame":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "div",
        styles: {
          position: "absolute",
          width,
          height,
          backgroundColor: CONTAINER_BG
        },
        children: []
      };
    case "stack-h":
    case "stack-v":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "div",
        styles: {
          display: "flex",
          flexDirection: tool === "stack-h" ? "row" : "column",
          gap: "12px",
          padding: "16px",
          width,
          height,
          backgroundColor: CONTAINER_BG
        },
        children: []
      };
    case "grid":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "div",
        styles: {
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          padding: "16px",
          width,
          height,
          backgroundColor: CONTAINER_BG
        },
        children: []
      };
    case "image":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "img",
        props: {
          src: "",
          alt: "Image"
        },
        styles: {
          width,
          height,
          objectFit: "cover",
          backgroundColor: "#e5e7eb"
        }
      };
    case "video":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "video",
        props: {
          controls: true
        },
        styles: {
          width,
          height,
          backgroundColor: "#000000"
        },
        children: []
      };
    case "text":
      return {
        id: generatePrefixedId("text"),
        type: "text",
        tag: "span",
        text: "Text"
      };
    case "html":
      return {
        id: generatePrefixedId("html"),
        type: "html",
        tag: "div",
        styles: {
          display: "flex",
          flexDirection: "column",
          padding: "16px",
          width,
          height,
          backgroundColor: CONTAINER_BG
        },
        children: []
      };
    default:
      return null;
  }
}

export { CONTAINER_BG, DEFAULT_TOOL_SIZE, createToolElement, isDrawableTool };
