import { parse } from "@babel/parser";

type Prop = { type: string; required: boolean };
type Props = Record<string, Prop>;

/** Extract only source-established props. Never execute a CVA factory or infer an API
 * from a component name; unresolved imported/generic types remain descriptive text.
 */
export function extractComponentPropMetadata(source: string): Record<string, Props> {
  let ast: any;
  try { ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
  catch { return {}; }
  const types = new Map<string, any>();
  const values = new Map<string, any>();
  const exports = new Map<string, string>();
  const cvaNames = new Set<string>();
  const variantPropsNames = new Set<string>();
  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration" && statement.source.value === "class-variance-authority") {
      for (const specifier of statement.specifiers) {
        if (specifier.imported?.name === "cva") cvaNames.add(specifier.local.name);
        if (specifier.imported?.name === "VariantProps") variantPropsNames.add(specifier.local.name);
      }
    }
    const declaration = statement.declaration ?? statement;
    if (declaration.type === "TSInterfaceDeclaration" || declaration.type === "TSTypeAliasDeclaration") types.set(declaration.id.name, declaration);
    if (declaration.type === "FunctionDeclaration" && declaration.id) {
      values.set(declaration.id.name, declaration);
      if (statement.type === "ExportNamedDeclaration") exports.set(declaration.id.name, declaration.id.name);
      if (statement.type === "ExportDefaultDeclaration") exports.set("default", declaration.id.name);
    }
    if (declaration.type === "VariableDeclaration") for (const item of declaration.declarations) {
      if (item.id.type !== "Identifier") continue;
      values.set(item.id.name, item.init);
      if (statement.type === "ExportNamedDeclaration") exports.set(item.id.name, item.id.name);
    }
    if (statement.type === "ExportNamedDeclaration" && !statement.source) for (const specifier of statement.specifiers ?? []) {
      if (specifier.type === "ExportSpecifier") exports.set(specifier.exported.name ?? specifier.exported.value, specifier.local.name);
    }
    if (statement.type === "ExportDefaultDeclaration" && declaration.type === "Identifier") exports.set("default", declaration.name);
  }
  const key = (node: any) => node?.type === "Identifier" ? node.name : node?.type === "StringLiteral" ? node.value : null;
  function property(object: any, name: string) {
    // A spread/computed property at any level may replace the apparent static value.
    if (object?.type !== "ObjectExpression" || object.properties.some((item: any) => item.type !== "ObjectProperty" || item.computed)) return null;
    return [...object.properties].reverse().find((item: any) => key(item.key) === name)?.value;
  }
  function variantOptions(node: any) {
    if (node?.type !== "TSIndexedAccessType" || node.indexType?.type !== "TSLiteralType") return null;
    const reference = node.objectType;
    if (reference?.type !== "TSTypeReference" || !variantPropsNames.has(reference.typeName?.name)) return null;
    const query = reference.typeParameters?.params?.[0];
    if (query?.type !== "TSTypeQuery" || query.exprName.type !== "Identifier") return null;
    const factory = values.get(query.exprName.name);
    if (factory?.type !== "CallExpression" || factory.callee.type !== "Identifier" || !cvaNames.has(factory.callee.name)) return null;
    const variant = property(property(factory.arguments[1], "variants"), node.indexType.literal.value);
    if (variant?.type !== "ObjectExpression" || !variant.properties.length) return null;
    if (!variant.properties.every((item: any) => item.type === "ObjectProperty" && !item.computed && key(item.key))) return null;
    return variant.properties.map((item: any) => JSON.stringify(key(item.key))).join(" | ");
  }
  function typeText(node: any, seen = new Set<string>()): string {
    if (!node) return "unknown";
    if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
      const name = node.typeName.name;
      const alias = types.get(name);
      if (alias?.type === "TSTypeAliasDeclaration" && !seen.has(name)) return typeText(alias.typeAnnotation, new Set([...seen, name]));
    }
    return variantOptions(node) ?? source.slice(node.start, node.end);
  }
  function propsFor(node: any, seen = new Set<string>()): Props {
    if (!node) return {};
    if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
      const name = node.typeName.name;
      if (seen.has(name)) return {};
      return propsFor(types.get(name), new Set([...seen, name]));
    }
    if (node.type === "TSTypeAliasDeclaration") return propsFor(node.typeAnnotation, seen);
    if (node.type === "TSIntersectionType") return Object.assign({}, ...node.types.map((item: any) => propsFor(item, seen)));
    const members = node.type === "TSInterfaceDeclaration" ? node.body.body : node.type === "TSTypeLiteral" ? node.members : [];
    const props: Props = {};
    if (node.type === "TSInterfaceDeclaration") for (const parent of node.extends ?? []) {
      if (parent.expression.type === "Identifier" && !seen.has(parent.expression.name)) Object.assign(props, propsFor(types.get(parent.expression.name), new Set([...seen, parent.expression.name])));
    }
    for (const member of members) {
      if (member.type !== "TSPropertySignature" || member.computed || !key(member.key)) continue;
      props[key(member.key)!] = { type: typeText(member.typeAnnotation?.typeAnnotation), required: !member.optional };
    }
    return props;
  }
  const result: Record<string, Props> = {};
  for (const [exportName, localName] of exports) {
    if (exportName !== "default" && !/^[A-Z]/.test(exportName)) continue;
    const value = values.get(localName);
    if (!["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(value?.type)) continue;
    const param = value.params[0]?.type === "AssignmentPattern" ? value.params[0].left : value.params[0];
    const props = propsFor(param?.typeAnnotation?.typeAnnotation);
    if (Object.keys(props).length) result[exportName] = props;
  }
  return result;
}
