export type VariableStyleUsage = {
  complete: boolean;
  declarations: Array<{ property: string; value: string }>;
  conditions: string[];
};

const paintProperties = new Set(["color", "background-color", "border-color", "border-top-color",
  "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "fill",
  "stroke", "text-decoration-color", "caret-color", "accent-color", "stop-color", "flood-color",
  "lighting-color", "-webkit-text-fill-color", "-webkit-text-stroke-color"]);
const cssProperty = (property: string) => property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const parsedDeclarations = new WeakMap<object, { property: string; value: string; refs: string[] }>();

/** Follow custom-property aliases, including unregistered variables and fallbacks. */
export function cssVariablesAffectOnlyPaint(changedNames: ReadonlySet<string>, usage: VariableStyleUsage) {
  if (!usage.complete) return false;
  const affected = new Set(changedNames);
  const references = (value: string) => [...value.matchAll(/var\(\s*--([a-zA-Z_][a-zA-Z0-9_-]*)/gi)].map(match => match[1]);
  const declarations = usage.declarations.map(entry => {
    let parsed = parsedDeclarations.get(entry);
    if (!parsed || parsed.value !== entry.value || parsed.property !== entry.property) {
      parsed = { ...entry, refs: references(entry.value) };
      parsedDeclarations.set(entry, parsed);
    }
    return parsed;
  });
  // Escaped variable identifiers cannot be proven safe by this narrow parser.
  if (declarations.some(entry => (/var\(/i.test(entry.value) && !entry.refs.length || entry.value.includes("\\")))) return false;
  let grew = true;
  while (grew) {
    grew = false;
    for (const entry of declarations) if (entry.property.startsWith("--") && !affected.has(entry.property.slice(2))
      && entry.refs.some(name => affected.has(name))) {
      affected.add(entry.property.slice(2)); grew = true;
    }
  }
  for (const condition of usage.conditions) {
    // Container style queries and style-attribute selectors can change layout
    // even if their declarations don't directly reference the changed token.
    if (/\[\s*style(?:\s|[\]~|^$*=])/i.test(condition)
      || /(?<!\\)\[[^\]]*\\/.test(condition)
      || [...affected].some(name => condition.includes(`--${name}`))) return false;
  }
  return declarations.every(entry => entry.property.startsWith("--")
    || !entry.refs.some(name => affected.has(name)) || paintProperties.has(cssProperty(entry.property)));
}
