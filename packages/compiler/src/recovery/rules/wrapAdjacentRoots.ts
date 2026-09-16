import type { JsxRecoveryRule } from "../types";

export const wrapAdjacentRootsRule: JsxRecoveryRule = {
  id: "jsx.wrap-adjacent-roots",
  version: 1,
  matches(context) {
    return (context.operation === "canvas_add" || context.operation === "canvas_insert")
      && context.input.trimStart().startsWith("<")
      && context.error.reasonCode === "UnwrappedAdjacentJSXElements";
  },
  propose(context) {
    const normalized = context.input.trim().replace(/;+\s*$/, "");
    if (!normalized || !normalized.startsWith("<")) return null;
    return {
      candidate: `<>\n${normalized}\n</>`,
      summary: "Wrapped adjacent JSX roots in a layout-neutral Fragment."
    };
  }
};
