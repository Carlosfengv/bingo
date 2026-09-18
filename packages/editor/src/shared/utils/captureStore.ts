/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/captureStore.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { componentDisplayName, getById, getIndex, getParentId, walk } from "@bingo/compiler";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Capture Store — per-captured-container operation log.
*
* When a page is captured, an empty log is opened keyed by the container
* element ID. Every edit on that container's subtree gets recorded into
* the log via the useTabHistory onOperation hook. "Save to code" reads
* the squashed log to produce a prompt describing what changed.
*/
var operationLogs = new Map();
var logListeners = new Map();
function notifyLog(containerId) {
  const listeners = logListeners.get(containerId);
  if (listeners) for (const l of listeners) l();
}
function subscribeToLog(containerId, listener) {
  let set = logListeners.get(containerId);
  if (!set) {
    set = new Set();
    logListeners.set(containerId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) logListeners.delete(containerId);
  };
}
function startLog(containerId) {
  operationLogs.set(containerId, []);
  notifyLog(containerId);
}
/** Start a log only if one isn't already active (tab switch must not wipe edits). */
function ensureLog(containerId) {
  if (operationLogs.has(containerId)) return;
  operationLogs.set(containerId, []);
  notifyLog(containerId);
}
function getOperations(containerId) {
  return operationLogs.get(containerId) || [];
}
function clearLog(containerId) {
  operationLogs.delete(containerId);
  notifyLog(containerId);
}
/** All active capture container IDs (that have an initialized log). */
function activeContainerIds() {
  return [...operationLogs.keys()];
}
/**
* Collect element IDs under a container in the Store (inclusive of the
* container itself).
*/
function collectDescendantIdsInStore(store, containerId) {
  const ids = new Set();
  if (!getById(store, containerId)) return ids;
  ids.add(containerId);
  walk(store, containerId, id => ids.add(id));
  return ids;
}
/**
* Figure out which captured container (if any) an op belongs to.
* Returns the container ID, or null if the op is outside all captures.
*/
function containerForOp(op, store) {
  if (operationLogs.size === 0) return null;
  const containerIds = activeContainerIds();
  if (containerIds.length === 0) return null;
  let targetId = null;
  switch (op.type) {
    case "set_text":
    case "set_styles":
    case "set_props":
    case "set_position":
    case "set_name":
    case "set_theme":
      targetId = op.elementId;
      break;
    case "insert":
      targetId = op.parentId;
      break;
    case "remove":
      targetId = op.parentId;
      break;
    case "move":
      targetId = op.toParentId ?? op.fromParentId;
      break;
    case "replace":
      targetId = op.parentId;
  }
  if (!targetId) return null;
  for (const cid of containerIds) {
    if (targetId === cid) return cid;
    if (collectDescendantIdsInStore(store, cid).has(targetId)) return cid;
  }
  return null;
}
/**
* Record an operation into the matching captured container's log.
* Called from the useTabHistory onOperation hook.
*/
function recordOperation(op, postOpStore) {
  const cid = containerForOp(op, postOpStore);
  if (!cid) return;
  const log = operationLogs.get(cid);
  if (!log) return;
  log.push(op);
  notifyLog(cid);
}
/**
* Remove an op from whichever container's log currently has it as the
* most recent entry. Used on undo — the same op object that was pushed
* by recordOperation is now being undone, so pop it by reference.
*
* Silent no-op if the op isn't at the top of any log (e.g. the user
* captured AFTER doing this edit, so it never made it into a log).
*/
function popOperation(op) {
  for (const [cid, log] of operationLogs) if (log.length > 0 && log[log.length - 1] === op) {
    log.pop();
    notifyLog(cid);
    return;
  }
}
/**
* React hook: subscribe to a container's operation log.
* Returns the live array of operations, re-renders on changes.
*/
function useOperationLog(containerId) {
  const $ = (0, import_compiler_runtime.c)(3);
  let t0;
  let t1;
  if ($[0] !== containerId) {
    t0 = listener => subscribeToLog(containerId, listener);
    t1 = () => operationLogs.get(containerId) || EMPTY_LOG;
    $[0] = containerId;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  return (0, import_react.useSyncExternalStore)(t0, t1, _temp$66);
}
function _temp$66() {
  return EMPTY_LOG;
}
var EMPTY_LOG = [];
/**
* Squash an op log into the minimum set of semantically-distinct changes.
*
* Rationale: if the user inserts a new Card, then edits its text, then sets
* its height, those are NOT three separate "save to code" steps. The Card
* doesn't exist in source yet — the edits are part of the insert. AST
* classification can only apply to elements that existed in source BEFORE
* this capture session. New-subtree tweaks get absorbed into the insert,
* and the insert's payload is refreshed to the CURRENT state in
* currentElements (so the AI gets the final JSX, not the stale initial).
*
* Handled cases:
*  - Insert + child edits (text/styles/props) → insert with final state
*  - Insert + remove-of-new-element → op cancels out entirely
*  - Insert + move-within-new-subtree → absorbed (final structure reflected)
*  - Insert + move-to-outside → kept as move (escapes the new subtree)
*  - Replace (common for canvas_update) → all descendants of newElement are
*    treated as "new", same absorption rules
*
* Move ops on pre-existing elements into new subtrees, and vice versa, are
* kept as-is (they cross the new/pre-existing boundary).
*/
function squashOperations(ops, store) {
  const newIds = new Set();
  for (const op of ops) if (op.type === "insert") for (const id of collectIdsInSubtree(op.element)) newIds.add(id);else if (op.type === "replace") for (const id of collectIdsInSubtree(op.newElement)) newIds.add(id);
  const out = [];
  for (const op of ops) switch (op.type) {
    case "insert":
      {
        if (!getById(store, op.element.id)) continue;
        const parentKey = getParentId(store, op.element.id);
        const parentId = parentKey === "ROOT" || parentKey === null ? null : parentKey;
        const index = getIndex(store, op.element.id);
        out.push({
          ...op,
          parentId,
          index: index >= 0 ? index : op.index
        });
        continue;
      }
    case "replace":
      if (!getById(store, op.newElement.id)) continue;
      out.push(op);
      continue;
    case "set_text":
    case "set_styles":
    case "set_props":
    case "set_position":
    case "set_name":
    case "set_theme":
      if (newIds.has(op.elementId)) continue;
      out.push(op);
      continue;
    case "remove":
      if (newIds.has(op.elementId)) {
        const insertIdx = out.findIndex(o => o.type === "insert" && o.element.id === op.elementId);
        if (insertIdx >= 0) out.splice(insertIdx, 1);
        continue;
      }
      out.push(op);
      continue;
    case "move":
      if (newIds.has(op.elementId)) continue;
      out.push(op);
      continue;
  }
  return collapseRepeatedEdits(out);
}
/**
* Collapse repeated set_text / set_styles / set_props ops on the same element.
* Keeps the LAST op's new value but preserves the FIRST op's old value, so
* the AI sees "original → final" instead of every intermediate step.
*/
function collapseRepeatedEdits(ops) {
  const firstIdx = new Map();
  const out = [];
  for (const op of ops) {
    if (op.type !== "set_text" && op.type !== "set_styles" && op.type !== "set_props") {
      out.push(op);
      continue;
    }
    const key = `${op.elementId}::${op.type}`;
    const existing = firstIdx.get(key);
    if (existing !== void 0) {
      const prev = out[existing];
      const merged = {
        ...op
      };
      if (op.type === "set_text") merged.oldText = prev.oldText;else if (op.type === "set_styles") merged.oldStyles = prev.oldStyles;else if (op.type === "set_props") merged.oldProps = prev.oldProps;
      out[existing] = merged;
    } else {
      firstIdx.set(key, out.length);
      out.push(op);
    }
  }
  return out;
}
/**
* Find the element an op targets and its owning component name.
* For remove/insert/replace, the op carries the element itself.
* For everything else, look it up in the live Store.
*/
function resolveTarget(op, store) {
  let target = null;
  switch (op.type) {
    case "insert":
      target = op.element;
      break;
    case "remove":
      target = op.element;
      break;
    case "replace":
      target = op.newElement;
      break;
    default:
      target = getById(store, op.elementId) ?? null;
  }
  const componentName = findOwningComponentName(store, op) || "page";
  const sourceInfo = target && target.sourceInfo ? target.sourceInfo : void 0;
  return {
    target,
    componentName,
    sourceInfo
  };
}
/**
* Walk Store ancestors from the op's anchor parent up to root; return the
* nearest enclosing component name (component element directly, or html with
* data-component / sourceInfo.componentName).
*/
function findOwningComponentName(store, op) {
  let lookupId = null;
  switch (op.type) {
    case "insert":
      lookupId = op.parentId;
      break;
    case "remove":
      lookupId = op.parentId;
      break;
    case "replace":
      lookupId = op.parentId;
      break;
    case "move":
      lookupId = op.toParentId ?? op.fromParentId;
      break;
    default:
      lookupId = op.elementId;
  }
  if (!lookupId) return null;
  let cursor = lookupId;
  while (cursor) {
    const el = getById(store, cursor);
    if (el) {
      if (el.type === "component") return el.componentName;
      if (el.type === "capture") return el.original.componentName;
      if (el.type === "html") {
        const comp = el.props?.["data-component"] || el.sourceInfo?.componentName;
        if (comp && comp !== "CapturedPage") return comp;
      }
      if (el.type === "text") {
        const comp = el.sourceInfo?.componentName;
        if (comp && comp !== "CapturedPage") return comp;
      }
    }
    const parentKey = getParentId(store, cursor);
    cursor = parentKey === "ROOT" || parentKey === null ? null : parentKey;
  }
  return null;
}
/**
* Short descriptor for an element — tag, component name, icon name, or
* text snippet. Aimed at giving the AI/user enough context to identify
* which element in the source code is being edited.
*/
function describeElement(el) {
  if (!el) return "<?>";
  switch (el.type) {
    case "text":
      {
        const text = el.text || "";
        return text ? `text "${truncate(text, 30)}"` : "text";
      }
    case "html":
      {
        const h = el;
        let s = `<${h.tag}`;
        const firstClass = (h.props?.className || "").split(/\s+/).filter(Boolean)[0];
        if (firstClass) s += `.${firstClass}`;
        s += ">";
        const inner = firstText(h);
        if (inner) s += ` "${truncate(inner, 24)}"`;
        return s;
      }
    case "component":
      {
        const c = el;
        const inner = firstText(c);
        const name = componentDisplayName(c.componentName);
        return inner ? `<${name} "${truncate(inner, 24)}">` : `<${name}>`;
      }
    case "capture":
      return `<capture ${componentDisplayName(el.original.componentName)}>`;
    case "icon":
      return `<icon ${el.iconName}>`;
    case "webview":
      return "<webview>";
  }
  return "unknown";
}
function firstText(el) {
  if (el.type === "text") return el.text || null;
  const kids = el.children;
  if (kids) for (const c of kids) {
    const t = firstText(c);
    if (t) return t;
  }
  return null;
}
function describeOperation(op, store) {
  const {
    target,
    componentName,
    sourceInfo
  } = resolveTarget(op, store);
  const hasSource = !!sourceInfo?.filePath;
  const loc = hasSource ? ` @ ${sourceInfo.filePath}:${sourceInfo.lineNumber}` : "";
  const who = describeElement(target);
  switch (op.type) {
    case "set_text":
      {
        const oldStr = op.oldText ?? op.oldChildren?.map(c => c.text ?? "").join("") ?? "";
        const newStr = op.newText ?? op.newChildren?.map(c => c.text ?? "").join("") ?? "";
        return {
          method: hasSource ? "ast" : "ai",
          componentName,
          summary: `Change text "${truncate(oldStr)}" → "${truncate(newStr)}"${loc}`,
          sourceInfo,
          op,
          targetElementId: op.elementId
        };
      }
    case "set_props":
      {
        const oldClass = op.oldProps?.className || "";
        const newClass = op.newProps.className || "";
        const otherKeys = Object.keys(op.newProps).filter(k => k !== "className");
        if (otherKeys.length === 0 && (op.oldProps ? Object.keys(op.oldProps).filter(k => k !== "className").length === 0 : true) && oldClass !== newClass) {
          const oldSet = new Set(oldClass.split(/\s+/).filter(Boolean));
          const newSet = new Set(newClass.split(/\s+/).filter(Boolean));
          const added = [...newSet].filter(c => !oldSet.has(c));
          const removed = [...oldSet].filter(c => !newSet.has(c));
          let summary = `On ${who}`;
          if (added.length) summary += `, add ${added.join(" ")}`;
          if (removed.length) summary += `, remove ${removed.join(" ")}`;
          summary += loc;
          return {
            method: hasSource ? "ast" : "ai",
            componentName,
            summary,
            sourceInfo,
            op,
            targetElementId: op.elementId
          };
        }
        const propDiffs = [];
        for (const k of otherKeys) {
          const oldVal = op.oldProps?.[k];
          const newVal = op.newProps[k];
          if (oldVal !== newVal && isPrintablePropValue(newVal)) {
            if (isPrintablePropValue(oldVal)) propDiffs.push(`${k}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);else propDiffs.push(`${k}: → ${JSON.stringify(newVal)}`);
          }
        }
        return {
          method: "ai",
          componentName,
          summary: `Set props on ${who}: ${propDiffs.length > 0 ? propDiffs.join(", ") : otherKeys.join(", ") || "className"}${loc}`,
          sourceInfo,
          op,
          targetElementId: op.elementId
        };
      }
    case "set_theme":
      return { method: "ai", componentName, summary: `Update variable bindings and modes on ${who}${loc}: ${JSON.stringify(op.newTheme)}`, sourceInfo, op, targetElementId: op.elementId };
    case "set_styles":
      {
        const styleDiffs = [];
        for (const k of Object.keys(op.newStyles)) {
          const oldVal = op.oldStyles?.[k];
          const newVal = op.newStyles[k];
          if (oldVal !== newVal && isPrintablePropValue(newVal)) {
            if (isPrintablePropValue(oldVal) && oldVal !== void 0) styleDiffs.push(`${k}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);else styleDiffs.push(`${k}: ${JSON.stringify(newVal)}`);
          }
        }
        const stylesSummary = styleDiffs.length > 0 ? styleDiffs.slice(0, 6).join(", ") + (styleDiffs.length > 6 ? ` (+${styleDiffs.length - 6} more)` : "") : Object.keys(op.newStyles).join(", ");
        return {
          method: hasSource ? "ast" : "ai",
          componentName,
          summary: `Set styles on ${who}: ${stylesSummary}${loc}`,
          sourceInfo,
          op,
          targetElementId: op.elementId
        };
      }
    case "insert":
      return {
        method: "ai",
        componentName,
        summary: `Insert ${describeElement(op.element)} into ${componentName} at index ${op.index}`,
        sourceInfo,
        op,
        targetElementId: op.element.id,
        parentElementId: op.parentId
      };
    case "remove":
      {
        let summary = `Remove ${describeElement(op.element)} from ${componentName}${loc}`;
        const kids = op.element.children;
        if (kids && kids.length > 0) {
          const sketch = sketchDescendants(op.element);
          if (sketch.length > 0) summary += ` — contains: ${sketch.slice(0, 6).join(", ")}${sketch.length > 6 ? ` (+${sketch.length - 6} more)` : ""}`;else summary += ` — contains ${kids.length} child element${kids.length > 1 ? "s" : ""}`;
        }
        return {
          method: hasSource ? "ast" : "ai",
          componentName,
          summary,
          sourceInfo,
          op,
          parentElementId: op.parentId
        };
      }
    case "move":
      return {
        method: "ai",
        componentName,
        summary: op.fromParentId === op.toParentId ? `Reorder ${who} in ${componentName}: index ${op.fromIndex} → ${op.toIndex}` : `Move ${who} in ${componentName}: parent ${op.fromParentId ?? "root"} → ${op.toParentId ?? "root"}, index ${op.toIndex}`,
        sourceInfo,
        op,
        targetElementId: op.elementId,
        parentElementId: op.toParentId
      };
    case "replace":
      {
        const oldIds = collectIdsInSubtree(op.oldElement);
        const newIds = collectIdsInSubtree(op.newElement);
        const oldSketch = sketchDescendants(op.oldElement);
        const newSketch = sketchDescendants(op.newElement);
        const oldSketchSet = new Set(oldSketch);
        const newSketchSet = new Set(newSketch);
        const added = newSketch.filter(s => !oldSketchSet.has(s));
        const removed = oldSketch.filter(s => !newSketchSet.has(s));
        let summary = `Replace ${describeElement(op.oldElement)} → ${describeElement(op.newElement)} in ${componentName}`;
        if (added.length || removed.length) {
          const parts = [];
          if (added.length) parts.push(`added: ${added.slice(0, 8).join(", ")}${added.length > 8 ? ` (+${added.length - 8} more)` : ""}`);
          if (removed.length) parts.push(`removed: ${removed.slice(0, 8).join(", ")}${removed.length > 8 ? ` (+${removed.length - 8} more)` : ""}`);
          summary += ` — ${parts.join("; ")}`;
        } else if (newIds.size !== oldIds.size) summary += ` — subtree size ${oldIds.size} → ${newIds.size}`;
        return {
          method: "ai",
          componentName,
          summary,
          sourceInfo,
          op,
          targetElementId: op.newElement.id,
          parentElementId: op.parentId
        };
      }
    case "set_position":
      return {
        method: "ai",
        componentName,
        summary: `Canvas position change on ${who} (no code impact)`,
        sourceInfo,
        op,
        canvasOnly: true
      };
    case "set_name":
      return {
        method: "ai",
        componentName,
        summary: `Rename ${who} → "${op.newName ?? ""}" (no code impact)`,
        sourceInfo,
        op,
        canvasOnly: true
      };
  }
}
function truncate(s, max = 40) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}
/** Check if a prop value is simple enough to print in a summary. */
function isPrintablePropValue(v) {
  if (v === null || v === void 0) return true;
  const t = typeof v;
  return t === "string" || t === "number" || t === "boolean";
}
/**
* Walk an element subtree BREADTH-FIRST and collect notable descendants.
* Breadth-first ensures the AI sees sibling cards in a row before diving
* into the first card's subtree — "Card 'Views', Card 'Likes', Card 'Comments'"
* instead of "Card 'Views', CardContent 'Views', Text 'Views', ...".
*/
function sketchDescendants(el) {
  const out = [];
  const queue = [];
  const kids = el.children;
  if (kids) for (const c of kids) queue.push(c);
  while (queue.length > 0 && out.length < 12) {
    const n = queue.shift();
    if (n.type === "component") out.push(describeElement(n));else if (n.type === "html") {
      const comp = n.props?.["data-component"];
      if (comp && comp !== "CapturedPage") out.push(describeElement(n));
    } else if (n.type === "icon") out.push(describeElement(n));
    const childNodes = n.children;
    if (childNodes) for (const c of childNodes) queue.push(c);
  }
  return out;
}
/**
* Collect all element IDs under a subtree (any type, any depth).
* Used to diff old vs new in a replace op.
*/
function collectIdsInSubtree(el) {
  const ids = new Set();
  const walk = n => {
    ids.add(n.id);
    const kids = n.children;
    if (kids) for (const c of kids) walk(c);
  };
  walk(el);
  return ids;
}

export { clearLog, describeOperation, ensureLog, getOperations, popOperation, recordOperation, squashOperations, startLog, useOperationLog };
