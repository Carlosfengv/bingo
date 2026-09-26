import { useEffect, useState } from "react";
import { componentStyleOverrides } from "../../../../compiler/src/store/componentEditing";
import { useVariableSnapshot } from "../../shared/theme/VariableContext";
import { unresolvedStyleVariables } from "../utils/componentVariableIssues";

/** Measure only the selected, verified roots; never mount a second component. */
export function useComponentVariableIssues(elements, componentIndex, store) {
  const variables = useVariableSnapshot();
  const targets = elements.flatMap(element => {
    const info = componentIndex?.[element.componentName];
    const entries = componentStyleOverrides(element, info).filter(entry => entry.active && typeof entry.value === "string" && entry.value.includes("var("));
    return entries.length && info?.editing?.rootTag ? [{ id: element.id, tag: info.editing.rootTag, entries }] : [];
  });
  const key = JSON.stringify(targets);
  const [result, setResult] = useState<{ key: string; issues: Record<string, string[]> }>({ key: "", issues: {} });
  useEffect(() => {
    if (!targets.length) return;
    const canvas = document.querySelector("[data-canvas-viewport] [data-canvas-content]");
    if (!canvas) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const issues: Record<string, string[]> = {};
      for (const target of targets) {
        const escaped = CSS.escape(target.id);
        const host = canvas.querySelector(`[data-component-root-host="${escaped}"]`);
        const root = host ? host.childElementCount === 1 ? host.firstElementChild : null : canvas.querySelector(`[data-element-id="${escaped}"]`);
        if (!root || root.tagName.toLowerCase() !== target.tag) continue;
        const computed = getComputedStyle(root);
        for (const entry of target.entries) {
          const missing = unresolvedStyleVariables(entry.value, name => computed.getPropertyValue(name));
          if (missing?.length) issues[entry.property] = [...new Set([...(issues[entry.property] ?? []), ...missing])];
        }
      }
      setResult(previous => previous.key === key && JSON.stringify(previous.issues) === JSON.stringify(issues) ? previous : { key, issues });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(canvas, { attributes: true, childList: true, subtree: true });
    for (let ancestor = canvas.parentElement; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor, { attributes: true });
    window.addEventListener("bingo-css-updated", schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("bingo-css-updated", schedule); };
  }, [key, store, variables]);
  return result.key === key ? result.issues : {};
}
