/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/props/PropField.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ColorRow } from "../styles/inputs/ColorRow";
import { InspectorDropdown } from "../styles/inputs/parts/InspectorDropdown";
import { useInspectorScrub } from "../styles/inputs/useInspectorScrub";
import { INSPECTOR_CONTROL_TEXT_STYLE, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../styles/primitives";
import { HashIcon, Switch } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* PropField — a single prop row in the Props panel: truncating label on the
* left, an inspector-styled control on the right. Every row shares the same
* grid template so controls line up at the same width, and the controls reuse
* the Design inspector primitives so props and styles read as one system.
*/
/** Keep canvas shortcuts quiet while typing; Enter commits via blur. */
function handlePropInputKeyDown(e) {
  e.stopPropagation();
  blurInspectorInputOnEnter(e);
}
/**
* Label-left / control-right row. The grid template is shared by every row so
* label and control columns align across the panel; labels truncate.
*/
function PropRow(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const {
    label,
    required: t1,
    scrubRef,
    action,
    children
  } = t0;
  const required = t1 === void 0 ? false : t1;
  let t2;
  if ($[0] !== label) {
    t2 = <span className="min-w-0 truncate">{label}</span>;
    $[0] = label;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== required) {
    t3 = required && <span className="shrink-0 text-ed-muted-foreground">*</span>;
    $[2] = required;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== t2 || $[5] !== t3) {
    t4 = <>{t2}{t3}</>;
    $[4] = t2;
    $[5] = t3;
    $[6] = t4;
  } else t4 = $[6];
  const text = t4;
  let t5;
  if ($[7] !== scrubRef || $[8] !== text) {
    t5 = scrubRef ? <InspectorScrubHandle ref={scrubRef} className="min-w-0 shrink gap-1 pl-0 text-[11px] text-ed-inspector-value">{text}</InspectorScrubHandle> : <span className="flex min-w-0 items-center gap-1 text-[11px] font-normal text-ed-inspector-value">{text}</span>;
    $[7] = scrubRef;
    $[8] = text;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== action || $[11] !== label || $[12] !== t5) {
    t6 = <span className="flex min-h-6.5 min-w-0 items-center gap-1" title={label}>{t5}{action}</span>;
    $[10] = action;
    $[11] = label;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== children) {
    t7 = <div className="flex min-w-0 items-center">{children}</div>;
    $[14] = children;
    $[15] = t7;
  } else t7 = $[15];
  let t8;
  if ($[16] !== t6 || $[17] !== t7) {
    t8 = <div className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] items-start gap-1.5">{t6}{t7}</div>;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}
/** Keep canvas shortcuts quiet while typing; Enter commits, Shift+Enter breaks. */
function handleTextareaKeyDown(e) {
  e.stopPropagation();
  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    e.currentTarget.blur();
  }
}
var propTextAreaClasses = "col-start-1 row-start-1 w-full min-w-0 whitespace-pre-wrap break-words border-0 bg-transparent px-2 py-[5px] text-[11px]";
function PropTextControl(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    value,
    placeholder,
    readOnly: t1,
    onInput,
    onCommit
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  let t2;
  if ($[0] !== onInput) {
    t2 = e => onInput(e.target.value);
    $[0] = onInput;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== onCommit) {
    t3 = e_0 => onCommit(e_0.target.value);
    $[2] = onCommit;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== placeholder || $[5] !== readOnly || $[6] !== t2 || $[7] !== t3 || $[8] !== value) {
    t4 = <textarea rows={1} value={value} readOnly={readOnly} onChange={t2} onBlur={t3} onFocus={_temp$17} onKeyDown={handleTextareaKeyDown} placeholder={placeholder} style={INSPECTOR_CONTROL_TEXT_STYLE} className={`${propTextAreaClasses} resize-none overflow-hidden text-ed-inspector-value outline-none placeholder:text-ed-muted-foreground/50 disabled:pointer-events-none disabled:opacity-50`} />;
    $[4] = placeholder;
    $[5] = readOnly;
    $[6] = t2;
    $[7] = t3;
    $[8] = value;
    $[9] = t4;
  } else t4 = $[9];
  const t5 = `${value || placeholder || ""} `;
  let t6;
  if ($[10] !== t5) {
    t6 = <span aria-hidden="true" style={INSPECTOR_CONTROL_TEXT_STYLE} className={`${propTextAreaClasses} invisible`}>{t5}</span>;
    $[10] = t5;
    $[11] = t6;
  } else t6 = $[11];
  let t7;
  if ($[12] !== t4 || $[13] !== t6) {
    t7 = <InspectorControlShell className="h-auto min-h-6.5 items-start">{<span className="grid min-w-0 flex-1">{t4}{t6}</span>}</InspectorControlShell>;
    $[12] = t4;
    $[13] = t6;
    $[14] = t7;
  } else t7 = $[14];
  return t7;
}
function _temp$17(e_1) {
  if (!e_1.currentTarget.readOnly) e_1.currentTarget.select();
}
function PropNumberControl(t0) {
  const $ = (0, import_compiler_runtime.c)(21);
  const {
    value,
    placeholder,
    readOnly: t1,
    active: t2,
    onInput,
    onCommit
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  const active = t2 === void 0 ? false : t2;
  let t3;
  if ($[0] !== value) {
    t3 = () => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };
    $[0] = value;
    $[1] = t3;
  } else t3 = $[1];
  let t4;
  if ($[2] !== onCommit) {
    t4 = next => onCommit(String(next));
    $[2] = onCommit;
    $[3] = t4;
  } else t4 = $[3];
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(t3, t4);
  const t5 = active || isScrubbing;
  let t6;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = <HashIcon />;
    $[4] = t6;
  } else t6 = $[4];
  let t7;
  if ($[5] !== scrubRef) {
    t7 = <InspectorScrubHandle ref={scrubRef} className="h-full w-6 shrink-0 justify-center pl-0">{t6}</InspectorScrubHandle>;
    $[5] = scrubRef;
    $[6] = t7;
  } else t7 = $[6];
  let t8;
  if ($[7] !== onInput) {
    t8 = e => onInput(e.target.value);
    $[7] = onInput;
    $[8] = t8;
  } else t8 = $[8];
  let t9;
  if ($[9] !== onCommit) {
    t9 = e_0 => onCommit(e_0.target.value);
    $[9] = onCommit;
    $[10] = t9;
  } else t9 = $[10];
  let t10;
  if ($[11] !== placeholder || $[12] !== readOnly || $[13] !== t8 || $[14] !== t9 || $[15] !== value) {
    t10 = <InspectorControlInput type="number" value={value} readOnly={readOnly} onChange={t8} onBlur={t9} onKeyDown={handlePropInputKeyDown} placeholder={placeholder} className="pl-0 pr-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />;
    $[11] = placeholder;
    $[12] = readOnly;
    $[13] = t8;
    $[14] = t9;
    $[15] = value;
    $[16] = t10;
  } else t10 = $[16];
  let t11;
  if ($[17] !== t10 || $[18] !== t5 || $[19] !== t7) {
    t11 = <InspectorControlShell active={t5}>{t7}{t10}</InspectorControlShell>;
    $[17] = t10;
    $[18] = t5;
    $[19] = t7;
    $[20] = t11;
  } else t11 = $[20];
  return t11;
}
function PropBooleanControl(t0) {
  const $ = (0, import_compiler_runtime.c)(6);
  const {
    label,
    value,
    isMixed: t1,
    onCommit
  } = t0;
  const t2 = !(t1 === void 0 ? false : t1) && value === "true";
  let t3;
  if ($[0] !== onCommit) {
    t3 = checked => onCommit(checked ? "true" : "false");
    $[0] = onCommit;
    $[1] = t3;
  } else t3 = $[1];
  let t4;
  if ($[2] !== label || $[3] !== t2 || $[4] !== t3) {
    t4 = <span className="flex min-h-6.5 items-center">{<Switch aria-label={label} checked={t2} onCheckedChange={t3} />}</span>;
    $[2] = label;
    $[3] = t2;
    $[4] = t3;
    $[5] = t4;
  } else t4 = $[5];
  return t4;
}
function PropSelectControl(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  const { t } = useTranslation("editor");
  const {
    label,
    value,
    options,
    isMixed: t1,
    onCommit
  } = t0;
  const isMixed = t1 === void 0 ? false : t1;
  let t2;
  if (true) {
    t2 = value ? <span className="min-w-0 truncate">{value}</span> : <span className="min-w-0 truncate text-ed-muted-foreground/50">{isMixed ? "-" : t("propsPanel.select")}</span>;
    $[0] = isMixed;
    $[1] = value;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== options) {
    t3 = options.map(_temp2$10);
    $[3] = options;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== isMixed || $[6] !== label || $[7] !== onCommit || $[8] !== t2 || $[9] !== t3 || $[10] !== value) {
    t4 = <InspectorDropdown label={label} hasIcon={false} value={t2} selectedValue={value} isMixed={isMixed} options={t3} onValueChange={onCommit} className="w-full" contentClassName="max-h-72" />;
    $[5] = isMixed;
    $[6] = label;
    $[7] = onCommit;
    $[8] = t2;
    $[9] = t3;
    $[10] = value;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
}
function _temp2$10(option) {
  return {
    value: option,
    label: option
  };
}
function PropField(t0) {
  const $ = (0, import_compiler_runtime.c)(24);
  const {
    label,
    required: t1,
    kind,
    options: t2,
    value,
    isMixed: t3,
    placeholder,
    readOnly: t4,
    action,
    onInput,
    onCommit
  } = t0;
  const required = t1 === void 0 ? false : t1;
  let t5;
  if ($[0] !== t2) {
    t5 = t2 === void 0 ? [] : t2;
    $[0] = t2;
    $[1] = t5;
  } else t5 = $[1];
  const options = t5;
  const isMixed = t3 === void 0 ? false : t3;
  const readOnly = t4 === void 0 ? false : t4;
  let t6;
  if ($[2] !== value) {
    t6 = () => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };
    $[2] = value;
    $[3] = t6;
  } else t6 = $[3];
  let t7;
  if ($[4] !== onCommit) {
    t7 = next => onCommit(String(next));
    $[4] = onCommit;
    $[5] = t7;
  } else t7 = $[5];
  const labelScrub = useInspectorScrub(t6, t7);
  const isNumber = kind === "number";
  const inputPlaceholder = isMixed ? "-" : placeholder;
  const t8 = isNumber && !readOnly ? labelScrub.scrubRef : void 0;
  let t9;
  if ($[6] !== inputPlaceholder || $[7] !== isMixed || $[8] !== isNumber || $[9] !== kind || $[10] !== label || $[11] !== labelScrub || $[12] !== onCommit || $[13] !== onInput || $[14] !== options || $[15] !== readOnly || $[16] !== value) {
    t9 = kind === "enum" ? <PropSelectControl label={label} value={value} options={options} isMixed={isMixed} onCommit={onCommit} /> : kind === "boolean" ? <PropBooleanControl label={label} value={value} isMixed={isMixed} onCommit={onCommit} /> : kind === "color" ? <ColorRow label={label} hideLabel={true} value={value} isMixedValue={isMixed} cssProperty="color" onChange={onCommit} /> : isNumber ? <PropNumberControl value={value} placeholder={inputPlaceholder} readOnly={readOnly} active={labelScrub.isScrubbing} onInput={onInput} onCommit={onCommit} /> : <PropTextControl value={value} placeholder={inputPlaceholder} readOnly={readOnly} onInput={onInput} onCommit={onCommit} />;
    $[6] = inputPlaceholder;
    $[7] = isMixed;
    $[8] = isNumber;
    $[9] = kind;
    $[10] = label;
    $[11] = labelScrub;
    $[12] = onCommit;
    $[13] = onInput;
    $[14] = options;
    $[15] = readOnly;
    $[16] = value;
    $[17] = t9;
  } else t9 = $[17];
  let t10;
  if ($[18] !== action || $[19] !== label || $[20] !== required || $[21] !== t8 || $[22] !== t9) {
    t10 = <PropRow label={label} required={required} scrubRef={t8} action={action}>{t9}</PropRow>;
    $[18] = action;
    $[19] = label;
    $[20] = required;
    $[21] = t8;
    $[22] = t9;
    $[23] = t10;
  } else t10 = $[23];
  return t10;
}

export { PropField, PropRow, handlePropInputKeyDown };
