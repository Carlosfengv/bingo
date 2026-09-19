import { findElementVariableBinding } from "../runtime/variables";

const childrenOf = node => node.type === "text" ? [] : (node.children ?? []);
const kind = node => JSON.stringify([node.type, node.type === "html" ? node.tag : undefined, node.componentName, node.iconName, node.library, node.original?.componentName]);
// Styled text is emitted as a span and parsed back as an HTML node.
const sameKind = (previous, next) => kind(previous) === kind(next)
  || previous.type === "text" && next.type === "html" && next.tag === "span";
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, stable(value[key])]));
};
const signature = node => JSON.stringify(stable({
  kind: kind(node), props: { ...node.props, key: undefined }, styles: node.styles ?? {},
  ...(node.type === "text" ? { text: node.text ?? "", className: node.className ?? "", runs: node.children ?? [] } : { children: childrenOf(node).map(signature) }),
}));
const hasTheme = node => !!node.theme || childrenOf(node).some(hasTheme);
const keyOf = node => node.props?.key;
const compatibleKeys = (previous, next) => keyOf(previous) === undefined || keyOf(next) === undefined || keyOf(previous) === keyOf(next);

function reconcileTheme(previous, next, library) {
  // The editor's hidden metadata comes from the original node, never a pasted
  // runtime snapshot. Style edits are authoritative over stale bindings.
  const { theme: ignored, ...result } = next;
  const bindings = (previous?.theme?.bindings ?? []).filter(binding => binding.target !== "style"
    || next.styles?.[binding.property] !== undefined && next.styles[binding.property] === previous.styles?.[binding.property]);
  if (library) for (const property of Object.keys(next.styles ?? {})) {
    if (bindings.some(binding => binding.target === "style" && binding.property === property)) continue;
    const inferred = findElementVariableBinding({ styles: next.styles }, library, property);
    if (inferred) { const { inferred: ignored, ...binding } = inferred; bindings.push(binding); }
  }
  if (previous?.theme || bindings.length) result.theme = { ...previous?.theme, version: 1, bindings };
  for (const field of ["sourceInfo", "canvasPosition", "name"]) {
    if (previous?.[field] !== undefined) result[field] = previous[field];
  }
  return result;
}

/** Match exact subtrees and explicit React keys before unique compatible
 * nodes. Positional matching must not transfer hidden metadata between
 * indistinguishable siblings after a reorder/insert/delete. */
function reconcileChildren(previousChildren, nextChildren, library, context) {
  const keys = nextChildren.map(keyOf).filter(key => key !== undefined);
  if (new Set(keys).size !== keys.length) throw new Error("Sibling React keys must be unique to preserve theme settings.");
  const available = new Set(previousChildren.filter(node => !context.used.has(node)));
  const matches = new Map();
  const match = (next, candidates) => {
    if (candidates.length !== 1) return false;
    matches.set(next, candidates[0]); available.delete(candidates[0]); context.used.add(candidates[0]); return true;
  };
  for (const next of nextChildren) {
    const key = keyOf(next);
    if (key !== undefined) match(next, [...available].filter(old => keyOf(old) === key && sameKind(old, next)));
  }
  for (const next of nextChildren) {
    if (matches.has(next)) continue;
    match(next, [...available].filter(old => kind(old) === kind(next) && compatibleKeys(old, next) && context.signature(old) === context.signature(next)));
  }
  // A moved node may now sit under a newly inserted wrapper. Match globally
  // only with unique evidence on both sides, so a copy cannot steal identity.
  for (const next of nextChildren) {
    if (matches.has(next)) continue;
    const key = keyOf(next);
    const sameIdentity = old => sameKind(old, next) && (key !== undefined ? keyOf(old) === key
      : compatibleKeys(old, next) && context.signature(old) === context.signature(next));
    if (context.nextNodes.filter(sameIdentity).length !== 1) continue;
    const candidates = context.previousNodes.filter(sameIdentity);
    if (candidates.length === 1 && !context.used.has(candidates[0])) match(next, candidates);
  }
  for (const next of nextChildren) {
    if (matches.has(next)) continue;
    const candidates = [...available].filter(old => sameKind(old, next) && compatibleKeys(old, next));
    const pending = nextChildren.filter(node => !matches.has(node) && kind(node) === kind(next) && keyOf(node) === keyOf(next));
    if (pending.length === 1 && match(next, candidates)) continue;
    if (candidates.some(hasTheme)) throw new Error("Cannot safely match theme settings after this structural edit. Add distinct React keys before reordering or editing these siblings.");
    if (candidates.length) match(next, [candidates[0]]);
  }
  return nextChildren.map(next => reconcileSelectionNode(matches.get(next), next, library, context));
}

function reconcileSelectionNode(previous, next, library, context) {
  const compatible = previous && sameKind(previous, next);
  const result = reconcileTheme(compatible ? previous : undefined, next, library);
  if (compatible) result.id = previous.id;
  if (next.type !== "text" && next.children) result.children = reconcileChildren(compatible ? childrenOf(previous) : [], childrenOf(next), library, context);
  return result;
}

/** Shared by preview and apply; only authored styles are allowed in. */
export function buildSelectionRootFromParsed(previousRoot, selectedElementId, parsedRoots, library?) {
  if (!parsedRoots.length) return { error: "No element found in JSX" };
  let parsedRoot;
  if (previousRoot.type === "capture") parsedRoot = { ...previousRoot, children: parsedRoots };
  else if (parsedRoots.length === 1) parsedRoot = parsedRoots[0];
  else return { error: "Selection must have a single root element" };
  try {
    const flatten = node => [node, ...childrenOf(node).flatMap(flatten)];
    const signatures = new Map();
    const context = { previousNodes: flatten(previousRoot), nextNodes: flatten(parsedRoot), used: new Set([previousRoot]),
      signature: node => { if (!signatures.has(node)) signatures.set(node, signature(node)); return signatures.get(node); } };
    const element = reconcileSelectionNode(previousRoot, parsedRoot, library, context);
    element.id = selectedElementId;
    // Root placement belongs to the selection even when replacing its type.
    for (const field of ["canvasPosition", "sourceInfo"]) if (previousRoot[field] !== undefined) element[field] = previousRoot[field];
    return { element };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}
