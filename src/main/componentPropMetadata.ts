import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { isComponentStyleNormalizer } from "./componentStyleAdapter";
import { componentPropControl, type ComponentProp } from "../../packages/compiler/src/store/componentEditing";

type Prop = ComponentProp & { required: boolean };
type Props = Record<string, Prop>;
type EditingMetadata = { props: Props; editing: { rootStyle: "supported" | "unknown"; rootClassName?: "supported"; rootTag?: string; rootStyleExpression?: { start: number; end: number }; styleNormalization?: "available" | "applied"; themeVariables?: "available" | "applied" } };

/** Namespaced JSDoc augments presentation/constraints, never the source type or
 * default. Invalid declarations stay visible and read-only instead of silently
 * falling back to an unconstrained input. */
function applyEditorAnnotations(member: any, prop: Prop) {
  const comment = member.leadingComments?.at(-1);
  if (comment?.type !== "CommentBlock" || !comment.value.startsWith("*")) return;
  const lines = comment.value.replace(/^\*/, "").split(/\r?\n/).map(line => line.replace(/^\s*\*?\s?/, "").trim());
  const description: string[] = [];
  const seen = new Set<string>();
  let tags = false;
  const errors: string[] = [];
  const kind = componentPropControl(prop).kind;
  for (const line of lines) {
    if (line.startsWith("@")) tags = true;
    if (!tags && line) description.push(line);
    const match = /^@editor(\w*)\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, tag, value] = match;
    if (seen.has(tag)) { errors.push(`Duplicate @editor${tag}`); continue; }
    seen.add(tag);
    if (tag === "Label" && value) prop.label = value;
    else if (tag === "Group" && ["appearance", "state", "content", "other"].includes(value)) prop.group = value as Prop["group"];
    else if (tag === "Control" && value === "color" && kind === "string") prop.control = "color";
    else if (["Min", "Max", "Step", "Order"].includes(tag)) {
      const number = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(value) ? Number(value) : NaN;
      if (!Number.isFinite(number) || tag !== "Order" && kind !== "number" || tag === "Step" && number <= 0) errors.push(`Invalid @editor${tag}`);
      else prop[tag.toLowerCase() as "min" | "max" | "step" | "order"] = number;
    } else errors.push(`Unsupported @editor${tag} for ${prop.type}`);
  }
  if (description.length) prop.description = description.join(" ");
  if (prop.min !== undefined && prop.max !== undefined && prop.min > prop.max) errors.push("@editorMin exceeds @editorMax");
  if (errors.length) prop.metadataError = errors.join("; ");
}

/** Extract only source-established props. Never execute a CVA factory or infer an API
 * from a component name; unresolved imported/generic types remain descriptive text.
 */
export function extractComponentMetadata(source: string): Record<string, EditingMetadata> {
  let ast: any;
  try { ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
  catch { return {}; }
  const normalizedCalls = new WeakSet<object>();
  const constantReads = new WeakMap<object, object>();
  traverse(ast, { ReferencedIdentifier(path) {
    const binding = path.scope.getBinding(path.node.name);
    if (binding?.constant) constantReads.set(path.node, binding.identifier);
  } });
  traverse(ast, { CallExpression(path) {
    if (path.node.callee.type !== "Identifier" || path.node.arguments.length !== 1) return;
    const binding = path.scope.getBinding(path.node.callee.name);
    if (binding?.constant && isComponentStyleNormalizer(binding.path.node) && !binding.path.scope.getBinding("Object") && !binding.path.scope.getBinding("Number")) normalizedCalls.add(path.node);
  } });
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
    return variantType(variant);
  }
  function variantType(variant: any) {
    if (variant?.type !== "ObjectExpression" || !variant.properties.length || !variant.properties.every((item: any) => item.type === "ObjectProperty" && !item.computed && key(item.key))) return null;
    return [...new Set(variant.properties.map((item: any) => ["true", "false"].includes(key(item.key)) ? "boolean" : JSON.stringify(key(item.key))))].join(" | ");
  }
  function cvaConfig(reference: any) {
    if (reference?.type !== "TSTypeReference" || !variantPropsNames.has(reference.typeName?.name)) return null;
    const query = reference.typeParameters?.params?.[0];
    const factory = query?.type === "TSTypeQuery" ? values.get(query.exprName?.name) : null;
    return factory?.type === "CallExpression" && factory.callee.type === "Identifier" && cvaNames.has(factory.callee.name) ? factory.arguments[1] : null;
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
    if (node.type === "TSParenthesizedType") return propsFor(node.typeAnnotation, seen);
    if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
      const variants = property(cvaConfig(node), "variants");
      if (variants?.type === "ObjectExpression" && variants.properties.every((item: any) => item.type === "ObjectProperty" && !item.computed)) {
        const result: Props = {};
        for (const item of variants.properties) {
          const name = key(item.key), type = variantType(item.value);
          if (name && type) result[name] = { type, required: false };
        }
        return result;
      }
      const name = node.typeName.name;
      if (seen.has(name)) return {};
      return propsFor(types.get(name), new Set([...seen, name]));
    }
    if (node.type === "TSTypeAliasDeclaration") return propsFor(node.typeAnnotation, seen);
    if (node.type === "TSIntersectionType") return Object.assign({}, ...node.types.map((item: any) => propsFor(item, seen)));
    const members = node.type === "TSInterfaceDeclaration" ? node.body.body : node.type === "TSTypeLiteral" ? node.members : [];
    const props: Props = {};
    if (node.type === "TSInterfaceDeclaration") for (const parent of node.extends ?? []) {
      if (parent.expression.type === "Identifier" && !seen.has(parent.expression.name)) Object.assign(props, propsFor({ type: "TSTypeReference", typeName: parent.expression, typeParameters: parent.typeParameters }, seen));
    }
    for (const member of members) {
      if (member.type !== "TSPropertySignature" || member.computed || !key(member.key)) continue;
      const prop: Prop = { type: typeText(member.typeAnnotation?.typeAnnotation), required: !member.optional };
      applyEditorAnnotations(member, prop);
      props[key(member.key)!] = prop;
    }
    return props;
  }
  function literal(node: any): Prop["default"] | undefined {
    if (["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node?.type)) return node.value;
    if (node?.type === "NullLiteral") return null;
    if (node?.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral") return -node.argument.value;
    return undefined;
  }
  function knownPropKeys(node: any, seen = new Set<string>()): boolean {
    if (!node) return true;
    if (node.type === "TSParenthesizedType" || node.type === "TSTypeAliasDeclaration") return knownPropKeys(node.typeAnnotation, seen);
    if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
      const name = node.typeName.name;
      return !seen.has(name) && types.has(name) && knownPropKeys(types.get(name), new Set([...seen, name]));
    }
    if (node.type === "TSIntersectionType") return node.types.every(item => knownPropKeys(item, seen));
    if (node.type === "TSInterfaceDeclaration" && !(node.extends ?? []).every(item => item.expression.type === "Identifier" && knownPropKeys({ type: "TSTypeReference", typeName: item.expression }, seen))) return false;
    const members = node.type === "TSInterfaceDeclaration" ? node.body.body : node.type === "TSTypeLiteral" ? node.members : null;
    return !!members && members.every(item => item.type === "TSPropertySignature" && !item.computed && !!key(item.key));
  }
  function acceptsThemeValues(type: string | undefined): boolean {
    if (!type) return true; // JavaScript parameters have no declared type restriction.
    try {
      const annotation: any = (parse(`type Input = ${type}`, { plugins: ["typescript"] }).program.body[0] as any).typeAnnotation;
      const stringValue = node => node?.type === "TSStringKeyword" || node?.type === "TSUnionType" && node.types.some(stringValue);
      const cssKey = node => node?.type === "TSStringKeyword" || node?.type === "TSLiteralType" && node.literal.type === "TemplateLiteral" && node.literal.quasis.length === 2 && node.literal.quasis[0].value.raw === "--" && node.literal.quasis[1].value.raw === "" && node.literal.expressions[0]?.type === "TSStringKeyword";
      if (["TSObjectKeyword", "TSUnknownKeyword", "TSAnyKeyword"].includes(annotation.type)) return true;
      if (annotation.type === "TSTypeReference" && annotation.typeName.name === "Record" && !types.has("Record")) return cssKey(annotation.typeParameters?.params[0]) && stringValue(annotation.typeParameters?.params[1]);
      return annotation.type === "TSTypeLiteral" && annotation.members.length === 1 && annotation.members[0].type === "TSIndexSignature" && cssKey(annotation.members[0].parameters[0]?.typeAnnotation?.typeAnnotation) && stringValue(annotation.members[0].typeAnnotation?.typeAnnotation);
    } catch { return false; }
  }
  function rootContract(value: any, param: any, props: Props): EditingMetadata["editing"] {
    // Only certify direct native roots. Custom roots, branches, portals and
    // intermediate merge functions require an explicit adapter, not a guess.
    const body = value.body;
    const returns = body?.type === "BlockStatement" ? body.body.filter((item: any) => item.type === "ReturnStatement") : [];
    const root = body?.type === "JSXElement" ? body : returns.length === 1 ? returns[0].argument : null;
    const tag = root?.openingElement?.name;
    if (tag?.type !== "JSXIdentifier" || !/^[a-z]/.test(tag.name)) return { rootStyle: "unknown" };
    // A nested return/control-flow path could render a different root.
    const hasBranches = (node: any): boolean => !!node && typeof node === "object" &&
      (Array.isArray(node) ? node.some(hasBranches) : ["JSXElement", "FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration"].includes(node.type) ? false :
        ["IfStatement", "SwitchStatement", "TryStatement", "ConditionalExpression"].includes(node.type) ||
        Object.entries(node).some(([name, child]) => !["loc", "start", "end"].includes(name) && hasBranches(child)));
    if (hasBranches(body)) return { rootStyle: "unknown" };
    let styleName: string | undefined;
    let className: string | undefined;
    let restName: string | undefined;
    let themeName: string | undefined;
    let themeBinding: object | undefined;
    if (param?.type === "ObjectPattern") for (const item of param.properties) {
      if (item.type === "RestElement") restName = item.argument.name;
      if (item.type === "ObjectProperty" && !item.computed && key(item.key) === "className") className = item.value.type === "Identifier" ? item.value.name : item.value.type === "AssignmentPattern" ? item.value.left.name : undefined;
      if (item.type === "ObjectProperty" && !item.computed && key(item.key) === "style") {
        styleName = item.value.type === "Identifier" ? item.value.name : item.value.type === "AssignmentPattern" ? item.value.left.name : undefined;
      }
      if (item.type === "ObjectProperty" && !item.computed && key(item.key) === "themeVariables" && item.value.type === "Identifier") { themeName = item.value.name; themeBinding = item.value; }
    }
    const isStyle = (node: any) => node?.type === "Identifier" && node.name === styleName ||
      node?.type === "MemberExpression" && !node.computed && node.object.name === param?.name && node.property.name === "style";
    let forwarded = false;
    let classForwarded = false;
    let rootStyleExpression: { start: number; end: number } | undefined;
    let styleNormalization: "available" | "applied" | undefined;
    let themeVariables: "available" | "applied" | undefined;
    for (const attr of root.openingElement.attributes) {
      if (attr.type === "JSXSpreadAttribute") {
        const name = attr.argument.type === "Identifier" ? attr.argument.name : undefined;
        if (name && (name === param?.name || name === restName && !styleName)) forwarded = true;
        else if (!(name && name === restName && styleName)) forwarded = false;
        if (name && (name === param?.name || name === restName && !className)) classForwarded = true;
        else if (!(name && name === restName && className)) classForwarded = false;
      } else if (attr.name?.name === "className") {
        const expression = attr.value?.expression;
        classForwarded = !!(expression?.type === "Identifier" && expression.name === className || expression?.type === "MemberExpression" && !expression.computed && expression.object.name === param?.name && expression.property.name === "className");
      } else if (attr.name?.name === "style") {
        let expression = attr.value?.expression;
        const adapted = expression && normalizedCalls.has(expression);
        if (adapted) expression = expression.arguments[0];
        const last = expression?.type === "ObjectExpression" ? expression.properties.at(-1) : null;
        forwarded = !!(isStyle(expression) || last?.type === "SpreadElement" && isStyle(last.argument));
        if (forwarded) {
          rootStyleExpression = { start: expression.start, end: expression.end };
          const hasShorthand = expression?.type === "ObjectExpression" && expression.properties.some((item: any) => item.type === "ObjectProperty" && !item.computed && ["padding", "margin", "borderRadius"].includes(key(item.key)));
          styleNormalization = adapted ? "applied" : hasShorthand ? "available" : undefined;
          const firstSpread = expression?.type === "ObjectExpression" ? expression.properties[0] : null;
          themeVariables = themeName && firstSpread?.type === "SpreadElement" && firstSpread.argument.type === "Identifier" && firstSpread.argument.name === themeName && constantReads.get(firstSpread.argument) === themeBinding && acceptsThemeValues(props.themeVariables?.type)
            ? "applied" : param?.type === "ObjectPattern" && styleName && knownPropKeys(param.typeAnnotation?.typeAnnotation) && !Object.hasOwn(props, "themeVariables") && !param.properties.some(item => item.computed || item.type === "ObjectProperty" && key(item.key) === "themeVariables") ? "available" : undefined;
        }
      }
    }
    const classContract = classForwarded ? { rootClassName: "supported" as const } : {};
    return forwarded ? { rootStyle: "supported", rootTag: tag.name, ...classContract, ...(rootStyleExpression ? { rootStyleExpression, styleNormalization, themeVariables } : {}) } : { rootStyle: "unknown", ...classContract };
  }
  const result: Record<string, EditingMetadata> = {};
  for (const [exportName, localName] of exports) {
    if (exportName !== "default" && !/^[A-Z]/.test(exportName)) continue;
    const value = values.get(localName);
    if (!["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(value?.type)) continue;
    const param = value.params[0]?.type === "AssignmentPattern" ? value.params[0].left : value.params[0];
    const props = propsFor(param?.typeAnnotation?.typeAnnotation);
    const assignedDefaults = new Set<string>();
    if (param?.type === "ObjectPattern") for (const item of param.properties) {
      const name = !item.computed && key(item.key);
      if (!name || !props[name] || item.value?.type !== "AssignmentPattern") continue;
      assignedDefaults.add(name);
      const defaultValue = literal(item.value.right);
      if (defaultValue !== undefined) props[name] = { ...props[name], default: defaultValue };
    }
    const parameterName = (expression: any): string | undefined => {
      if (expression?.type === "MemberExpression" && !expression.computed && expression.object.name === param?.name) return expression.property.name;
      if (expression?.type !== "Identifier" || param?.type !== "ObjectPattern") return undefined;
      const entry = param.properties.find((item: any) => item.type === "ObjectProperty" && !item.computed && (item.value.type === "AssignmentPattern" ? item.value.left.name : item.value.name) === expression.name);
      return entry ? key(entry.key) ?? undefined : undefined;
    };
    // Defaults from a CVA factory are useful only when the component actually
    // passes this parameter to that factory. Never infer them from a type alone.
    const collectDefaults = (node: any, inClassName = false) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(child => collectDefaults(child, inClassName)); return; }
      if (["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration"].includes(node.type)) return;
      if (node.type === "JSXAttribute") inClassName = node.name?.name === "className";
      if (inClassName && node.type === "CallExpression" && node.callee.type === "Identifier") {
        const factory = values.get(node.callee.name);
        const argument = node.arguments[0];
        if (factory?.type === "CallExpression" && factory.callee.type === "Identifier" && cvaNames.has(factory.callee.name) && argument?.type === "ObjectExpression" && argument.properties.every((item: any) => item.type === "ObjectProperty" && !item.computed)) {
          const defaults = property(factory.arguments[1], "defaultVariants");
          for (const item of argument.properties) {
            const propName = parameterName(item.value), variantName = key(item.key);
            const defaultValue = variantName ? literal(property(defaults, variantName)) : undefined;
            if (propName && props[propName] && !assignedDefaults.has(propName) && !Object.prototype.hasOwnProperty.call(props[propName], "default") && defaultValue !== undefined) props[propName] = { ...props[propName], default: defaultValue };
          }
        }
      }
      for (const [name, child] of Object.entries(node)) if (!["loc", "start", "end"].includes(name)) collectDefaults(child, inClassName);
    };
    collectDefaults(value.body);
    result[exportName] = { props, editing: rootContract(value, param, props) };
  }
  return result;
}

export function extractComponentPropMetadata(source: string): Record<string, Props> {
  return Object.fromEntries(Object.entries(extractComponentMetadata(source))
    .filter(([, info]) => Object.keys(info.props).length)
    .map(([name, info]) => [name, info.props]));
}
