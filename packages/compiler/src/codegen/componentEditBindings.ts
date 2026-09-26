import { parseExpression } from "@babel/parser";
import { isPublicComponentProp } from "../store/componentEditing";

const syntax = (value: string | undefined, children = false) => {
  if (value === undefined) return undefined;
  try {
    const node = parseExpression(children ? `<Node>${value}</Node>` : `<Node ${value} />`, { plugins: ["jsx", "typescript"] });
    return JSON.stringify(node, (key, item) => ["start", "end", "loc", "extra", "leadingComments", "trailingComments", "innerComments"].includes(key) ? undefined : item);
  } catch { return value; }
};

/** Canvas rendering cannot execute source bindings. Preserve existing ones;
 * new, changed or removed expressions must go through the source editor. */
export function validateComponentBindingChanges(previous: any, next: any) {
  if (next.type !== "component") return;
  const before = previous?.sourceExpressions ?? {}, after = next.sourceExpressions ?? {};
  const fail = (field: string): never => { throw new Error(`Cannot change the source binding for ${next.componentName}.${field} on the canvas. Edit the component call in source; existing bindings are preserved.`); };
  for (const name of new Set([...Object.keys(before.props ?? {}), ...Object.keys(after.props ?? {})])) {
    if (syntax(before.props?.[name]) !== syntax(after.props?.[name])) fail(name);
  }
  if (syntax(before.children, true) !== syntax(after.children, true)) fail("children");
  if (before.spread || after.spread) {
    // Names record static attributes' positions relative to spreads as well.
    const order = value => (value.attributes ?? [])
      .filter(attribute => !["data-element-id", "dataElementId", "data-bingo-variables"].includes(attribute.name))
      .map(attribute => [attribute.name ?? null, syntax(attribute.code)]);
    if (!!before.spread !== !!after.spread || JSON.stringify(order(before)) !== JSON.stringify(order(after))) fail("spread attributes");
    for (const name of new Set([...Object.keys(previous?.props ?? {}), ...Object.keys(next.props ?? {})])) {
      if (isPublicComponentProp(name) && JSON.stringify(previous?.props?.[name]) !== JSON.stringify(next.props?.[name])) fail(name);
    }
  }
}
