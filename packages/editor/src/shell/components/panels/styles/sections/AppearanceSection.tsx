import { VariableModeControls } from "../../../../../shared/theme/VariableControls";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/AppearanceSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useStyleField } from "../StyleOpsContext";
import { StyleOpacityInput } from "../fields/layout";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { VisibilityToggleButton } from "../layout/controls";
import { translateInspectorText } from "../inspectorCopy";
import { LayoutFieldLabel } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { BlendModeIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";

/**
* Appearance section — element opacity, visibility, and mix-blend mode.
*/
var MIX_BLEND_MODE_OPTIONS = [{
  value: "normal",
  label: "Normal"
}, {
  value: "multiply",
  label: "Multiply"
}, {
  value: "screen",
  label: "Screen"
}, {
  value: "overlay",
  label: "Overlay"
}, {
  value: "darken",
  label: "Darken"
}, {
  value: "lighten",
  label: "Lighten"
}, {
  value: "color-dodge",
  label: "Color Dodge"
}, {
  value: "color-burn",
  label: "Color Burn"
}, {
  value: "hard-light",
  label: "Hard Light"
}, {
  value: "soft-light",
  label: "Soft Light"
}, {
  value: "difference",
  label: "Difference"
}, {
  value: "exclusion",
  label: "Exclusion"
}, {
  value: "hue",
  label: "Hue"
}, {
  value: "saturation",
  label: "Saturation"
}, {
  value: "color",
  label: "Color"
}, {
  value: "luminosity",
  label: "Luminosity"
}, {
  value: "plus-darker",
  label: "Plus Darker"
}, {
  value: "plus-lighter",
  label: "Plus Lighter"
}];
function AppearanceSection({ className } = {}) {
  const { t } = useTranslation("editor");
  const blendMode = useStyleField("mixBlendMode");
  const currentValue = blendMode.isMixed ? "" : blendMode.value || "normal";
  const currentOption = MIX_BLEND_MODE_OPTIONS.find(option => option.value === currentValue);
  const currentLabel = blendMode.isMixed
    ? "-"
    : translateInspectorText(t, currentOption?.label ?? currentValue);

  return <InspectorSection reserveActionRail={true} title="Appearance" action={<VisibilityToggleButton />} className={className}>
    <div className="mb-3"><VariableModeControls /></div>
    <div className="grid min-w-0 grid-cols-2 gap-2">
      <div className="flex min-w-0 flex-col gap-2">
        <LayoutFieldLabel>Opacity</LayoutFieldLabel>
        <StyleOpacityInput />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <LayoutFieldLabel>Blend mode</LayoutFieldLabel>
        <InspectorDropdown label="Blend mode" value={<span className="flex min-w-0 items-center gap-1.5"><BlendModeIcon className="size-4 shrink-0 text-ed-inspector-chrome" /><span className="min-w-0 truncate">{currentLabel}</span></span>} className="w-full" contentClassName="max-h-72" selectedValue={currentValue || "normal"} isMixed={blendMode.isMixed} options={MIX_BLEND_MODE_OPTIONS} onValueChange={nextValue => {
          if (nextValue === "normal") blendMode.clear();
          else blendMode.set(nextValue);
        }} />
      </div>
    </div>
  </InspectorSection>;
}

export { AppearanceSection };
