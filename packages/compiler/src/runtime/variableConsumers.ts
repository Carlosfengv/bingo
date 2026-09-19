import type { VariableLibrary } from "./variables";
import { variableModeChangedRootIds } from "./variables";
import type { VariableStyleUsage } from "./variableGeometry";

/** A conservative superset: include every CSS branch, alias and fallback.
 * Unknown renderers can read variables from JS or portals, so retain all of them.
 */
export function collectVariableConsumers(store: { byId: ReadonlyMap<string, any> }, library: VariableLibrary, usage: VariableStyleUsage): ReadonlySet<string> | undefined {
  if (!usage.complete || usage.conditions.some(condition =>
    /^\s*@(?!property\b)/i.test(condition) && condition.includes("--")
    || /\[\s*style/i.test(condition) || /(?<!\\)\[[^\]]*\\/.test(condition))) return;
  const names = new Set<string>();
  const read = (value: unknown) => {
    if (typeof value !== "string") return true;
    if (/\banchor(?:-size)?\(/i.test(value)) return false;
    if (value.includes("\\") && (value.includes("--") || /var/i.test(value))) return false;
    const calls = [...value.matchAll(/var\(/gi)];
    const refs = [...value.matchAll(/var\(\s*--([a-zA-Z_][a-zA-Z0-9_-]*)\s*[,)]/gi)];
    if (calls.length !== refs.length) return false;
    for (const ref of refs) names.add(ref[1]);
    return true;
  };
  for (const entry of usage.declarations) if (!read(entry.value)) return;
  // CSS aliases may live in token literals rather than a loaded stylesheet.
  for (const token of library.tokens) {
    if (!read(token.bindingTemplate)) return;
    for (const value of Object.values(token.valuesByMode)) if (value.kind === "literal" && !read(value.value)) return;
  }
  const tokens = new Map(library.tokens.map(token => [token.id, token]));
  for (const element of store.byId.values()) {
    if (!["html", "text"].includes(element.type)
      || ["script", "style", "link", "iframe", "object", "embed"].includes(element.tag)
      || element.tag?.includes("-") || element.props?.dangerouslySetInnerHTML
      || element.props?.["data-component"]) return;
    for (const binding of element.theme?.bindings ?? []) {
      const token = tokens.get(binding.tokenId);
      if (token?.cssName) names.add(token.cssName);
    }
    for (const style of [element.styles, element.props?.style]) {
      for (const [property, value] of Object.entries(style ?? {})) {
        if (/^(anchor-|anchor[A-Z]|position-anchor|positionAnchor)/.test(property)) return;
        if (property.startsWith("--")) names.add(property.slice(2));
        if (!read(value)) return;
      }
    }
    for (const [property, value] of Object.entries(element.props ?? {})) {
      if (/^on[A-Z]/.test(property) || typeof value === "function") return;
      if (!read(value)) return;
    }
  }
  return new Set(library.tokens.flatMap(token => token.cssName && names.has(token.cssName) ? [token.cssName] : []));
}

/** A mode-only edit changes values, never the set of consumers. */
export function createVariableConsumerResolver() {
  let previous: { store: any; library: VariableLibrary; usage: VariableStyleUsage; names: ReadonlySet<string> | undefined } | undefined;
  return (store: any, library: VariableLibrary, usage: VariableStyleUsage) => {
    const sameUsage = !!previous && previous.usage.complete === usage.complete
      && previous.usage.declarations.length === usage.declarations.length
      && previous.usage.declarations.every((entry, index) => entry === usage.declarations[index])
      && previous.usage.conditions.length === usage.conditions.length
      && previous.usage.conditions.every((condition, index) => condition === usage.conditions[index]);
    if (previous && previous.library === library && sameUsage && (previous.store === store
      || variableModeChangedRootIds(previous.store, store, previous.store.variableModes ?? {}, store.variableModes ?? {}))) {
      previous = { ...previous, store, usage };
      return previous.names;
    }
    const names = collectVariableConsumers(store, library, usage);
    previous = { store, library, usage, names };
    return names;
  };
}
