import { canResetComponentProp, componentIdentityMatches, componentPropControl, hasOwn, isPublicComponentProp, validateComponentProp } from "../store/componentEditing";

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};

/** Compare the matched instance, not a count of diagnostics across a subtree.
 * Unknown/complex fields can round-trip unchanged but cannot be authored by
 * canvas entry points until the same typed control contract supports them. */
export function validateComponentParameterChanges(previous: any, next: any, info: any) {
  if (next.type !== "component") return;
  for (const name of new Set([...Object.keys(previous?.props ?? {}), ...Object.keys(next.props ?? {}), ...Object.keys(info?.props ?? {})])) {
    if (!isPublicComponentProp(name)) continue;
    if (previous?.sourceExpressions?.props?.[name] || next.sourceExpressions?.props?.[name]) continue;
    const had = hasOwn(previous?.props, name), has = hasOwn(next.props, name);
    const descriptor = info?.props?.[name] ?? { type: "unknown" };
    if (!previous && !has && !canResetComponentProp(descriptor)) {
      throw new Error(`The component API requires ${next.componentName}.${name}.`);
    }
    if (had === has && JSON.stringify(stable(previous?.props?.[name])) === JSON.stringify(stable(next.props?.[name]))) continue;
    if (!componentIdentityMatches(previous ?? next, info)) throw new Error("The component identity changed. Review its source before editing this instance.");
    if (componentPropControl(descriptor).kind === "readonly") {
      throw new Error(`Cannot edit ${next.componentName}.${name} on the canvas: its type (${descriptor.type ?? "unknown"}) has no supported parameter control. Keep the existing value or edit the component call in source.`);
    }
    if (has ? !validateComponentProp(descriptor, next.props[name]) : !canResetComponentProp(descriptor)) {
      throw new Error(`The component API does not allow this value for ${next.componentName}.${name}.`);
    }
  }
}
