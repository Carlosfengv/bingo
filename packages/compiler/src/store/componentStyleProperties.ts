type Styles = Record<string, unknown>;

export const componentStyleGroups: Record<string, string[]> = {
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
  borderRadius: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
};

/** Split only values whose number of CSS components is statically known. */
function parts(value: unknown): Array<string | number> | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? [value] : null;
  if (typeof value !== "string" || !value.trim()) return null;
  // A variable can expand to multiple values. Never freeze its computed value.
  if (/var\(|env\(|\/\*|[;{}]/i.test(value)) return null;
  const result: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")" && --depth < 0) return null;
    if ((i === value.length || /\s/.test(value[i])) && depth === 0) {
      if (value.slice(start, i).trim()) result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  return depth || !result.length || result.length > 4 ? null : result;
}

function four(values: Array<string | number>) {
  return [values[0], values[1] ?? values[0], values[2] ?? values[0], values[3] ?? values[1] ?? values[0]];
}

export function expandComponentStyle(property: string, value: unknown): Styles | null {
  const keys = componentStyleGroups[property];
  if (!keys) return null;
  const halves = property === "borderRadius" && typeof value === "string" ? value.split("/") : [value];
  if (halves.length > 2) return null;
  const horizontal = parts(halves[0]);
  const vertical = halves.length === 2 ? parts(halves[1]) : horizontal;
  if (!horizontal || !vertical) return null;
  const x = four(horizontal), y = four(vertical);
  return Object.fromEntries(keys.map((key, index) => [key, halves.length === 2 ? `${x[index]} ${y[index]}` : x[index]]));
}

export function componentStyleGroup(property: string): string | undefined {
  return Object.keys(componentStyleGroups).find(group => componentStyleGroups[group].includes(property));
}

/** Preserve declaration order while expanding one group, including later overrides. */
export function expandComponentStyleGroup(styles: Styles, group: string): Styles {
  const expanded = expandComponentStyle(group, styles?.[group]);
  if (!expanded) return { ...styles };
  const result: Styles = {};
  for (const [property, value] of Object.entries(styles)) {
    if (property === group) Object.assign(result, expanded);
    else result[property] = value;
  }
  return result;
}

/** Only normalize groups touched by a directional edit. Group resets stay atomic. */
export function updateComponentStyleProperties(styles: Styles | undefined, updates: Styles): Styles {
  let next = { ...styles };
  for (const property of Object.keys(updates)) {
    const group = componentStyleGroup(property);
    if (group && !Object.hasOwn(updates, group)) next = expandComponentStyleGroup(next, group);
  }
  for (const [property, value] of Object.entries(updates)) {
    // Appending a changed longhand after an opaque shorthand preserves precedence.
    delete next[property];
    if (value !== undefined && value !== null && value !== "") next[property] = value;
  }
  return next;
}
