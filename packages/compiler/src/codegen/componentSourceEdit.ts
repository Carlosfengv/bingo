import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { componentEditableElement, componentEmptyStyleArgument } from "../store/componentEditing";

export type ComponentSourceLocator = { start: number; end: number; tag: string; openingSource: string };
export type FieldChanges = { set: Record<string, string | number | boolean | null>; remove: string[] };
export type ComponentSourceChanges = { props: FieldChanges; styles: FieldChanges; styleArgument?: "omit" | "empty" | "null" };

export function componentSourceChanges(binding: any, element: any): ComponentSourceChanges {
  const baseline = { type: "component", props: binding.baseProps, styles: binding.baseStyles };
  const beforeArgument = componentEmptyStyleArgument(baseline);
  const afterArgument = componentEmptyStyleArgument(element);
  const before = componentEditableElement(baseline);
  element = componentEditableElement(element);
  const diff = (before: Record<string, any> = {}, after: Record<string, any> = {}): FieldChanges => {
    const set = {}, remove: string[] = [];
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[name]) === JSON.stringify(after[name])) continue;
      if (after[name] === undefined) remove.push(name); else set[name] = after[name];
    }
    return { set, remove };
  };
  return { props: diff(before.props, element.props), styles: diff(before.styles, element.styles),
    ...(beforeArgument !== afterArgument && !Object.keys(element.styles ?? {}).length ? { styleArgument: afterArgument ?? "omit" } : {}) };
}

function fail(code: string, message: string): never { throw Object.assign(new Error(message), { code }); }
const names = (change: FieldChanges) => [...Object.keys(change.set), ...change.remove];
const nameOf = (node: any): string => t.isJSXIdentifier(node) || t.isIdentifier(node) ? node.name : t.isStringLiteral(node) ? node.value : "";
const isStatic = (node: any): boolean => t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node) || t.isNullLiteral(node) || t.isUnaryExpression(node, { operator: "-" }) && t.isNumericLiteral(node.argument);
function valueNode(value: unknown): t.Expression {
  if (value === null) return t.nullLiteral();
  if (typeof value === "string") return t.stringLiteral(value);
  if (typeof value === "boolean") return t.booleanLiteral(value);
  if (typeof value === "number" && Number.isFinite(value)) return value < 0 ? t.unaryExpression("-", t.numericLiteral(-value)) : t.numericLiteral(value);
  return fail("INVALID_VALUE", "Only finite numbers, strings, booleans and null can be written.");
}

/** Resolve the binding at this exact call, not a same-named module import. */
export function componentImportAtCallsite(source: string, locator: ComponentSourceLocator): { source: string; name: string } | null {
  if (source.slice(locator.start, locator.end) !== locator.openingSource) return null;
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  let result: { source: string; name: string } | null = null;
  traverse(ast, { JSXOpeningElement(path) {
    if (path.node.start !== locator.start || path.node.end !== locator.end || !t.isJSXIdentifier(path.node.name) || path.node.name.name !== locator.tag) return;
    const binding = path.scope.getBinding(locator.tag);
    if (!binding?.constant) return;
    const specifier = binding.path.node;
    const declaration = binding.path.parentPath?.node;
    if (!t.isImportDeclaration(declaration) || declaration.importKind === "type") return;
    if (t.isImportDefaultSpecifier(specifier)) result = { source: declaration.source.value, name: "default" };
    else if (t.isImportSpecifier(specifier) && specifier.importKind !== "type") result = { source: declaration.source.value, name: nameOf(specifier.imported) };
  } });
  return result;
}

/** Patch one proven opening tag. Everything outside changed attributes is byte-preserved. */
export function editComponentCallsite(source: string, locator: ComponentSourceLocator, changes: ComponentSourceChanges) {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  let opening: t.JSXOpeningElement | undefined;
  traverse(ast, { JSXOpeningElement(path) {
    if (path.node.start === locator.start && path.node.end === locator.end && nameOf(path.node.name) === locator.tag) opening = path.node;
  } });
  if (!opening || source.slice(locator.start, locator.end) !== locator.openingSource) fail("SOURCE_CONFLICT", "The original component call could not be located exactly.");
  const node = opening!;
  const propNames = names(changes.props), styleNames = names(changes.styles);
  if (!propNames.length && !styleNames.length && !changes.styleArgument) return { source, locator };
  if (node.attributes.some(attribute => t.isJSXSpreadAttribute(attribute))) fail("DYNAMIC_BINDING", "Spread attributes must be edited in source.");
  const patches: Array<{ start: number; end: number; code: string }> = [];
  const additions: string[] = [];
  const attribute = (name: string) => {
    const matches = node.attributes.filter((item): item is t.JSXAttribute => t.isJSXAttribute(item) && nameOf(item.name) === name);
    if (matches.length > 1) fail("AMBIGUOUS_ATTRIBUTE", `Duplicate attribute: ${name}`);
    return matches[0];
  };
  for (const name of propNames) {
    if (!/^[A-Za-z_$][\w$-]*$/.test(name) || ["style", "children", "ref", "key"].includes(name) || name.startsWith("data-bingo-")) fail("UNSUPPORTED_FIELD", `This attribute has a separate editor: ${name}`);
    if (name === "className" && !changes.props.remove.includes(name) && typeof changes.props.set[name] !== "string") fail("INVALID_VALUE", "Class names must be a static string.");
    const current = attribute(name);
    if (current?.value && !t.isStringLiteral(current.value) && !(t.isJSXExpressionContainer(current.value) && isStatic(current.value.expression))) fail("DYNAMIC_BINDING", `Keep the expression bound to ${name}.`);
    const removed = changes.props.remove.includes(name);
    const code = removed ? "" : `${name}={${generate(valueNode(changes.props.set[name])).code}}`;
    if (current) patches.push({ start: current.start!, end: current.end!, code }); else if (!removed) additions.push(code);
  }
  if (styleNames.length || changes.styleArgument) {
    const current = attribute("style");
    const expression = current?.value && t.isJSXExpressionContainer(current.value) ? current.value.expression : undefined;
    if (current && !t.isObjectExpression(expression) && !t.isNullLiteral(expression)) fail("DYNAMIC_BINDING", "A dynamic style expression cannot be replaced by a static snapshot.");
    const object = t.isObjectExpression(expression) ? expression : undefined;
    if (object?.properties.some(property => !t.isObjectProperty(property) || property.computed)) fail("DYNAMIC_BINDING", "Computed or spread styles must be edited in source.");
    const next = object ? t.cloneNode(object, true) : t.objectExpression([]);
    for (const name of styleNames) {
      if (!/^(?:[A-Za-z][\w]*|--[\w-]+)$/.test(name) || name.startsWith("__")) fail("INVALID_VALUE", `Invalid style property: ${name}`);
      const matches = next.properties.filter(property => t.isObjectProperty(property) && nameOf(property.key) === name) as t.ObjectProperty[];
      if (matches.length > 1) fail("AMBIGUOUS_ATTRIBUTE", `Duplicate style property: ${name}`);
      if (matches[0] && !isStatic(matches[0].value)) fail("DYNAMIC_BINDING", `Keep the expression bound to style.${name}.`);
      if (changes.styles.remove.includes(name)) next.properties = next.properties.filter(property => property !== matches[0]);
      else if (matches[0]) matches[0].value = valueNode(changes.styles.set[name]);
      else next.properties.push(t.objectProperty(t.stringLiteral(name), valueNode(changes.styles.set[name])));
    }
    if (changes.styleArgument && next.properties.length) fail("INVALID_VALUE", "An empty style argument cannot discard remaining style properties.");
    const code = next.properties.length ? `style={${generate(next).code}}` : changes.styleArgument === "empty" ? "style={{}}" : changes.styleArgument === "null" ? "style={null}" : "";
    if (current) patches.push({ start: current.start!, end: current.end!, code }); else if (code) additions.push(code);
  }
  if (additions.length) patches.push({ start: node.name.end!, end: node.name.end!, code: ` ${additions.join(" ")}` });
  let result = source;
  for (const patch of patches.sort((a, b) => b.start - a.start)) result = result.slice(0, patch.start) + patch.code + result.slice(patch.end);
  parse(result, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const end = locator.end + result.length - source.length;
  return { source: result, locator: { ...locator, end, openingSource: result.slice(locator.start, end) } };
}
