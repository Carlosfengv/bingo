import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { extractComponentMetadata } from "./componentPropMetadata";
import { proposeComponentStyleAdapter, proposeComponentThemeAdapter } from "./componentStyleAdapter";
import { generateCompleteFile } from "../../packages/compiler/src/codegen/generateCompleteFile";
import { ensureV2 } from "../../packages/compiler/src/store/ensureV2";
import { toWire } from "../../packages/compiler/src/store/wire";

const source = `// keep this header
export function Button({size = 'sm', style}: {size?: 'sm'|'lg', style?: object}) {
  return <button data-size={size} style={{padding: size === 'lg' ? '18px 28px' : '8px 16px', borderRadius: size === 'lg' ? 10 : 6, ...style}}>Keep child</button>;
}
export const unrelated = 'keep';
`;

const defaultsSource = `export let defaultsRead = 0;
function defaultStyle() { defaultsRead++; return { borderRadius: 23, padding: 9 }; }
export function DefaultStyle({ style = defaultStyle(), label = 'Default', ...rest }: {style?: object | null; label?: string} = {}) {
  return <button {...rest} data-style-kind={style === null ? 'null' : Object.keys(style).length ? 'nonempty' : 'empty'} style={style}>{label}</button>;
}`;

test("theme adaptation preserves style default evaluation, null, empty, content and rest props in standalone code", () => {
  const before = extractComponentMetadata(defaultsSource).DefaultStyle;
  assert.equal(before.editing.themeVariables, 'available');
  const proposal = proposeComponentThemeAdapter(defaultsSource, before.editing.rootStyleExpression!, true);
  const after = extractComponentMetadata(proposal.code).DefaultStyle;
  assert.equal(after.editing.themeVariables, 'applied');
  for (const name of Object.keys(before.props)) assert.deepEqual(after.props[name], before.props[name]);
  const context = vm.createContext({ module: { exports: {} }, React: { createElement: (tag, props, child) => ({ tag, props, child }) } });
  vm.runInContext(transformSync(proposal.code, { loader: 'tsx', format: 'cjs' }).code, context);
  const { DefaultStyle } = context.module.exports;
  const plain = DefaultStyle();
  const themed = DefaultStyle({ themeVariables: { '--surface': '#123456' }, title: 'preserved' });
  assert.equal(plain.props.style.borderRadius, 23);
  assert.equal(themed.props.style.borderRadius, 23);
  assert.equal(themed.props.style['--surface'], '#123456');
  assert.equal(themed.props.title, 'preserved');
  assert.equal(themed.props.themeVariables, undefined, 'the theme object is not forwarded as a DOM attribute');
  assert.equal(context.module.exports.defaultsRead, 2);
  for (const style of [null, {}]) {
    const result = DefaultStyle({ style, label: 'Changed', themeVariables: { '--surface': '#fff' } });
    assert.equal(result.props['data-style-kind'], style === null ? 'null' : 'empty');
    assert.equal(result.props.style.borderRadius, undefined);
    assert.equal(result.child, 'Changed');
  }
  assert.equal(context.module.exports.defaultsRead, 2, 'empty/null do not execute the style default');
});

test("theme adaptations compose with style normalization and only certify the actual constant parameter", () => {
  const normalized = proposeComponentStyleAdapter(source, extractComponentMetadata(source).Button.editing.rootStyleExpression!, true).code;
  const themed = proposeComponentThemeAdapter(normalized, extractComponentMetadata(normalized).Button.editing.rootStyleExpression!, true).code;
  assert.equal(extractComponentMetadata(themed).Button.editing.themeVariables, 'applied');
  assert.equal(extractComponentMetadata(themed).Button.editing.styleNormalization, 'applied');
  const js = defaultsSource.replace(': {style?: object | null; label?: string}', '') + '\nconst themeVariables = 1;';
  const proposed = proposeComponentThemeAdapter(js, extractComponentMetadata(js).DefaultStyle.editing.rootStyleExpression!, false).code;
  assert.doesNotThrow(() => transformSync(proposed, { loader: 'jsx' }));
  assert.match(proposed, /themeVariables: themeVariables1/);
  assert.equal(extractComponentMetadata(proposed).DefaultStyle.editing.themeVariables, 'applied');
  assert.notEqual(extractComponentMetadata(proposed.replace('return <button', 'themeVariables1 = {}; return <button')).DefaultStyle.editing.themeVariables, 'applied');
  const collision = defaultsSource.replace('label?: string', 'label?: string; themeVariables?: string');
  assert.equal(extractComponentMetadata(collision).DefaultStyle.editing.themeVariables, undefined);
  const unknown = defaultsSource.replace('{style?: object | null; label?: string}', 'ImportedProps');
  assert.equal(extractComponentMetadata(unknown).DefaultStyle.editing.themeVariables, undefined);
  const incompatible = `export function Button({style, themeVariables}: {style?: object; themeVariables?: string}) { return <button style={{...themeVariables, ...style}} />; }`;
  assert.equal(extractComponentMetadata(incompatible).Button.editing.themeVariables, undefined);
});

test("adapted project exports carry independent theme values without changing style argument presence", () => {
  const code = proposeComponentThemeAdapter(defaultsSource, extractComponentMetadata(defaultsSource).DefaultStyle.editing.rootStyleExpression!, true).code;
  const componentIndex = { DefaultStyle: { ...extractComponentMetadata(code).DefaultStyle, path: 'src/DefaultStyle.tsx' } };
  const library = { version: 1, collections: [{ id: 'theme', defaultModeId: 'light', modes: [{ id: 'light' }, { id: 'dark' }] }], tokens: [{ id: 'surface', cssName: 'surface', type: 'color', collectionId: 'theme', sourceRef: { kind: 'css' }, valuesByMode: { light: { kind: 'literal', value: '#fff' }, dark: { kind: 'literal', value: '#123456' } } }] };
  for (const props of [{}, { style: {} }, { style: null }, { style: { borderRadius: 12 } }]) {
    const store = ensureV2([{ id: 'button', type: 'component', componentName: 'DefaultStyle', props, theme: { version: 1, localCollectionModes: { theme: 'dark' } } }]);
    const before = toWire(store);
    const result = generateCompleteFile({ componentName: 'Themed', rootId: 'button', store, variableLibrary: library, componentIndex });
    assert.match(result, /themeVariables=\{\{"--surface":"#123456"\}\}/);
    if (!Object.hasOwn(props, 'style')) assert.doesNotMatch(result, / style=/);
    else if (props.style === null) assert.match(result, /style=\{null\}/);
    else if (!Object.keys(props.style).length) assert.match(result, /style=\{\{\}\}/);
    else assert.match(result, /borderRadius/);
    assert.deepEqual(toWire(store), before);
  }
});

test("reviewed root normalization runs in standalone source and preserves component metadata", () => {
  const before = extractComponentMetadata(source).Button;
  const location = before.editing.rootStyleExpression!;
  const proposed = proposeComponentStyleAdapter(source, location, true);
  assert.equal(proposed.code.slice(0, location.start), source.slice(0, location.start));
  assert.ok(proposed.code.includes(source.slice(location.end)));
  const after = extractComponentMetadata(proposed.code).Button;
  assert.deepEqual(after.props, before.props);
  assert.equal(after.editing.styleNormalization, "applied");
  assert.equal(after.editing.rootStyle, "supported");
  const context = vm.createContext({ module: { exports: {} }, React: { createElement: (tag: string, props: any, child: any) => ({ tag, props, child }) } });
  vm.runInContext(transformSync(proposed.code, { loader: "tsx", format: "cjs" }).code, context);
  const component = context.module.exports.Button;
  for (const size of ["sm", "lg"]) {
    const rendered = component({ size, style: { paddingTop: '8px', paddingRight: '12px', paddingBottom: '16px' } });
    assert.equal(rendered.child, "Keep child");
    assert.deepEqual(JSON.parse(JSON.stringify(rendered.props.style)), {
      paddingTop: '8px', paddingRight: '12px', paddingBottom: '16px', paddingLeft: size === 'lg' ? '28px' : '16px',
      borderTopLeftRadius: size === 'lg' ? 10 : 6, borderTopRightRadius: size === 'lg' ? 10 : 6, borderBottomRightRadius: size === 'lg' ? 10 : 6, borderBottomLeftRadius: size === 'lg' ? 10 : 6,
    });
  }
  assert.equal(component({ style: { borderRadius: 'var(--radius)' } }).props.style.borderRadius, 'var(--radius)');
  assert.equal(component({ style: { borderRadius: 'var(--radius)' } }).props.style.borderTopLeftRadius, undefined);
});

test("normalization proposals avoid name collisions, support JavaScript and do not certify altered helpers", () => {
  const original = source + '\nconst __bingoNormalizeRootStyle = 1;';
  const proposed = proposeComponentStyleAdapter(original, extractComponentMetadata(original).Button.editing.rootStyleExpression!, true);
  assert.ok(proposed.replacement.startsWith('__bingoNormalizeRootStyle1('));
  assert.equal(extractComponentMetadata(proposed.code.replace('return result;', 'return {};')).Button.editing.rootStyle, 'unknown');
  assert.equal(extractComponentMetadata(proposed.code.replace('function __bingoNormalizeRootStyle1', 'async function __bingoNormalizeRootStyle1')).Button.editing.rootStyle, 'unknown');
  assert.equal(extractComponentMetadata(proposed.code.replace('  return <button', '  const __bingoNormalizeRootStyle1 = (styles: any) => ({}); return <button')).Button.editing.rootStyle, 'unknown');
  assert.throws(() => proposeComponentStyleAdapter(source + '\nconst Object = {};', extractComponentMetadata(source).Button.editing.rootStyleExpression!, true), /shadows/);
  const js = source.replace(": {size?: 'sm'|'lg', style?: object}", '');
  const jsProposal = proposeComponentStyleAdapter(js, extractComponentMetadata(js).Button.editing.rootStyleExpression!, false);
  assert.doesNotThrow(() => transformSync(jsProposal.code, { loader: 'jsx' }));
  assert.equal(extractComponentMetadata(jsProposal.code).Button.editing.styleNormalization, 'applied');
});
