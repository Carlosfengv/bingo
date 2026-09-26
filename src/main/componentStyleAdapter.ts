import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { transformSync } from "esbuild";
import * as t from "@babel/types";

// Kept self-contained so the proposed component change runs in the user's own
// application without an editor dependency or a DOM mutation after rendering.
const helper = `function __bingoNormalizeRootStyle(styles: any): any {
  const groups: Record<string, string[]> = {
    padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
    borderRadius: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
  };
  function split(value: any): any[] | null {
    if (typeof value === 'number') return Number.isFinite(value) ? [value] : null;
    if (typeof value !== 'string' || !value.trim() || /var\\(|env\\(|\\/\\*|[;{}]/i.test(value)) return null;
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i <= value.length; i++) {
      if (value[i] === '(') depth++;
      if (value[i] === ')' && --depth < 0) return null;
      if ((i === value.length || /\\s/.test(value[i])) && depth === 0) {
        if (value.slice(start, i).trim()) parts.push(value.slice(start, i).trim());
        start = i + 1;
      }
    }
    return depth || !parts.length || parts.length > 4 ? null : parts;
  }
  function four(parts: any[]): any[] {
    return [parts[0], parts[1] ?? parts[0], parts[2] ?? parts[0], parts[3] ?? parts[1] ?? parts[0]];
  }
  const result: Record<string, any> = {};
  for (const [property, value] of Object.entries(styles ?? {})) {
    const keys = groups[property];
    const halves = property === 'borderRadius' && typeof value === 'string' ? value.split('/') : [value];
    const horizontal = keys && halves.length <= 2 ? split(halves[0]) : null;
    const vertical = horizontal && halves.length === 2 ? split(halves[1]) : horizontal;
    if (keys && horizontal && vertical) {
      const x = four(horizontal), y = four(vertical);
      keys.forEach((key, index) => { result[key] = halves.length === 2 ? x[index] + ' ' + y[index] : x[index]; });
    } else {
      // An opaque shorthand replaces all earlier directions, just as CSS does.
      if (keys) keys.forEach(key => { delete result[key]; });
      result[property] = value;
    }
  }
  return result;
}`;

const print = (node: any) => generate(node, { comments: false, compact: true }).code;
const helperSources = [helper, transformSync(helper, { loader: "ts", target: "esnext" }).code];
const helperBodies = helperSources.map(source => print((parse(source, { plugins: ["typescript"] }).program.body[0] as any).body));

/** A name or a comment is not proof: only the reviewed, unchanged helper qualifies. */
export function isComponentStyleNormalizer(node: any): boolean {
  return node?.type === "FunctionDeclaration" && !node.async && !node.generator && node.params.length === 1 && node.params[0].name === "styles" && helperBodies.includes(print(node.body));
}

export function proposeComponentStyleAdapter(source: string, expression: { start: number; end: number }, typescript: boolean) {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  traverse(ast, { Program(path) {
    if (["Object", "Number"].some(name => path.scope.getBinding(name))) throw new Error("This module shadows a built-in used by the style adapter. Adapt its styles in source instead.");
  } });
  let name = "__bingoNormalizeRootStyle", suffix = 0;
  while (new RegExp(`\\b${name}\\b`).test(source)) name = `__bingoNormalizeRootStyle${++suffix}`;
  const original = source.slice(expression.start, expression.end);
  if (!original) throw new Error("The root style expression could not be located.");
  const replacement = `${name}(${original})`;
  const code = source.slice(0, expression.start) + replacement + source.slice(expression.end) + `\n\n// Normalize final root styles before React applies them.\n${helperSources[typescript ? 0 : 1].replace("__bingoNormalizeRootStyle", name)}\n`;
  return { code, original, replacement };
}

/** Add a separate, explicit theme input without replacing the style argument. */
export function proposeComponentThemeAdapter(source: string, expression: { start: number; end: number }, typescript: boolean) {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  let target: any;
  traverse(ast, { enter(path) {
    if (path.node.start === expression.start && path.node.end === expression.end) target = path;
  } });
  const fn = target?.getFunctionParent();
  const first = fn?.node.params[0];
  const param = first?.type === "AssignmentPattern" ? first.left : first;
  if (!target || param?.type !== "ObjectPattern" || param.properties.some(item => item.type === "ObjectProperty" && (item.key.name ?? item.key.value) === "themeVariables")) {
    throw new Error("This component needs a source-defined theme interface. Its existing parameters are unchanged.");
  }
  let local = "themeVariables", suffix = 0;
  while (new RegExp(`\\b${local}\\b`).test(source)) local = `themeVariables${++suffix}`;
  const nextParam = t.cloneNode(param, true);
  const member = t.objectProperty(t.identifier("themeVariables"), t.identifier(local), false, local === "themeVariables");
  const rest = nextParam.properties.findIndex(item => item.type === "RestElement");
  nextParam.properties.splice(rest < 0 ? nextParam.properties.length : rest, 0, member);
  nextParam.typeAnnotation = null;
  const oldType = param.typeAnnotation ? source.slice(param.typeAnnotation.typeAnnotation.start, param.typeAnnotation.typeAnnotation.end) : "{}";
  const annotation = typescript ? `: (${oldType}) & { themeVariables?: { [name: \`--\${string}\`]: string | number } }` : "";
  const replacement = generate(t.objectExpression([t.spreadElement(t.identifier(local)),
    ...(target.node.type === "ObjectExpression" ? target.node.properties : [t.spreadElement(target.node)])])).code;
  const edits = [
    { start: param.start, end: param.end, value: generate(nextParam).code + annotation },
    { ...expression, value: replacement },
  ].sort((a, b) => b.start - a.start);
  let code = source;
  for (const edit of edits) code = code.slice(0, edit.start) + edit.value + code.slice(edit.end);
  return { code, original: source.slice(expression.start, expression.end), replacement };
}
