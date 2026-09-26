import assert from "node:assert/strict";
import test from "node:test";
import { extractComponentMetadata, extractComponentPropMetadata } from "./componentPropMetadata";
import { lintCanvasDesign } from "../../packages/compiler/src/codegen/canvasDesignLint";

test("CVA indexed prop types expose actual variant/size keys for validation", () => {
  const source = `import { cva, type VariantProps } from 'class-variance-authority';
    const styles = cva('base', { variants: { variant: { default: 'a', success: 'b', 'destructive-outline': 'c' }, size: { sm: 'a', lg: 'b' } } });
    interface BadgeProps extends ExternalProps { variant?: VariantProps<typeof styles>['variant']; size?: VariantProps<typeof styles>['size']; loading?: boolean; }
    export function Badge({variant,size,...props}: BadgeProps) { return <span {...props}/>; }`;
  const props = extractComponentPropMetadata(source).Badge;
  assert.equal(props.variant.type, '"default" | "success" | "destructive-outline"');
  assert.equal(props.size.type, '"sm" | "lg"');
  assert.equal(props.variant.required, false);
  const catalog = { Badge: { path: 'badge.tsx', props } };
  assert.deepEqual(lintCanvasDesign('<Badge variant="success" />', catalog), []);
  assert.equal(lintCanvasDesign('<Badge variant="ghost" />', catalog)[0].severity, 'error');
});

test("aliases, intersections, default exports and arrow props retain declared APIs", () => {
  const result = extractComponentPropMetadata(`type Size = 'default' | 'sm'; type Shared = { size?: Size }; interface Props { label: string }
    export function Tabs(p: External.Props & Shared) {return <div/>}
    const Input = (p: Props) => <input/>; export {Input as TextField}; export default Input;`);
  assert.equal(result.Tabs.size.type, "'default' | 'sm'");
  assert.equal(result.TextField.label.required, true);
  assert.deepEqual(result.default, result.TextField);
});

test("dynamic factories, external aliases and malformed source never invent closed variants", () => {
  const result = extractComponentPropMetadata(`import {cva, type VariantProps} from 'class-variance-authority';
    const styles = cva('', { variants: { variant: {...external, default: ''} } });
    export function Button(p: {variant?: VariantProps<typeof styles>['variant']}) {return <button/>}`);
  assert.match(result.Button.variant.type, /VariantProps/);
  assert.deepEqual(lintCanvasDesign('<Button variant="custom" />', {Button:{props:result.Button}}), []);
  assert.deepEqual(extractComponentPropMetadata('export function Broken('), {});
});

test("CVA aliases resolve while spreads at every enclosing level stay open", () => {
  for (const config of ["{ variants: {variant: {default: ''}}, ...external }", "{variants: {variant: {default: ''}, ...external}}", "{variants: {variant: {default: '', ...external}}}"]) {
    const source = `import {cva as cv, type VariantProps as VP} from 'class-variance-authority'; const styles=cv('', ${config}); export function Badge(p:{variant?:VP<typeof styles>['variant']}) {return <span/>}`;
    assert.match(extractComponentPropMetadata(source).Badge.variant.type, /VP/);
  }
  const source = `import {cva as cv, type VariantProps as VP} from 'class-variance-authority'; const styles=cv('', {variants:{variant:{default:'',success:''}}}); export function Badge(p:{variant?:VP<typeof styles>['variant']}) {return <span/>}`;
  assert.equal(extractComponentPropMetadata(source).Badge.variant.type, '"default" | "success"');
});

test("component defaults preserve false, zero, empty strings and null without evaluation", () => {
  const metadata = extractComponentMetadata(`
    export function Control({ enabled = false, count = 0, label = '', value = null, dynamic = compute() }: { enabled?: boolean; count?: number; label?: string; value?: string | null; dynamic?: string }) { return <div />; }
  `).Control;
  assert.equal(metadata.props.enabled.default, false);
  assert.equal(metadata.props.count.default, 0);
  assert.equal(metadata.props.label.default, "");
  assert.equal(metadata.props.value.default, null);
  assert.equal(Object.hasOwn(metadata.props.dynamic, "default"), false);
});

test("only proven native root style forwarding is certified", () => {
  for (const body of ["<button {...props} />", "<button style={props.style} />", "<button style={{ borderRadius: 4, ...props.style }}>{props.active ? 'A' : 'B'}</button>"]) {
    assert.equal(extractComponentMetadata(`export function Button(props: {style?: object; active?: boolean}) { return ${body}; }`).Button.editing.rootStyle, "supported");
  }
  for (const body of ["<button />", "<Other {...props} />", "<><button {...props} /></>", "<button {...props} style={{ color: 'red' }} />", "<button style={{ ...props.style, color: 'red' }} />", "<button {...props} {...unknown} />"]) {
    assert.equal(extractComponentMetadata(`export function Button(props: {style?: object}) { return ${body}; }`).Button.editing.rootStyle, "unknown");
  }
  assert.equal(extractComponentMetadata(`export function Button({ style: custom, ...rest }: {style?: object}) { return <button {...rest} style={custom} />; }`).Button.editing.rootStyle, "supported");
  assert.equal(extractComponentMetadata(`export function Button(props: {style?: object; active?: boolean}) { if (props.active) return <span/>; return <button {...props}/>; }`).Button.editing.rootStyle, "unknown");
});

test("CVA inherited props expose variants and only connected factory defaults", () => {
  const result = extractComponentMetadata(`import {cva, type VariantProps} from 'class-variance-authority';
    const styles=cva('', {variants:{size:{sm:'',lg:''},active:{true:'',false:''}},defaultVariants:{size:'sm',active:false}});
    interface Props extends VariantProps<typeof styles> {label?: string}
    export function Button({size,active,label='Save'}:Props){return <button className={styles({size,active})}>{label}</button>}
    export function Unconnected(p:VariantProps<typeof styles>){return <div/>}
  `);
  assert.equal(result.Button.props.size.type, '"sm" | "lg"');
  assert.equal(result.Button.props.active.type, 'boolean');
  assert.equal(result.Button.props.size.default, 'sm');
  assert.equal(result.Button.props.active.default, false);
  assert.equal(Object.hasOwn(result.Unconnected.props.size, 'default'), false);
});
