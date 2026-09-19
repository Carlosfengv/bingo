import assert from "node:assert/strict";
import test from "node:test";
import { extractComponentPropMetadata } from "./componentPropMetadata";
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
