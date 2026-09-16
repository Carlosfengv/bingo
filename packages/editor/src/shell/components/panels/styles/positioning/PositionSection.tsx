/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/positioning/PositionSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { transformLinearMatrix } from "../../../../../canvas/utils/transformMatrix";
import { pinnedAlignmentStyles, positionedAlignmentStyles } from "../../../../../shared/utils/positionAlignment";
import { parseTransformControls, topEdgeOfRotatedBox, withTransformFlips, withTransformRotation } from "../../../../../shared/utils/transformControls";
import { resolveVisibleElement$1 } from "../../../../../shared/utils/visibleElement";
import { POSITION_LABELS, POSITION_TYPES } from "../../../../constants";
import { getCamera } from "../../../../utils/chatShortcuts";
import { useStyleOps } from "../StyleOpsContext";
import { StylePositionOffset } from "../fields/layout";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { translateInspectorText } from "../inspectorCopy";
import { IconBtn, InspectorRailRow } from "../primitives";
import { InspectorSection } from "../sections/InspectorSection";
import { PositionAlignmentControls, PositionConstraintsControl, PositionPinningIcon, RotationField } from "./widgets";
import { getById } from "@bingo/compiler";
import { FlipHorizontalIcon, FlipVerticalIcon, PositionIcon, Rotate90Icon, SegmentedIconButton, SegmentedIconButtonGroup } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Position section — the design-tab block for position type, constraints,
* T/L/R/B offsets, and rotation/flip. Always visible.
*
* The rotation scrub mirrors the canvas corner-rotation path: it previews the
* transform imperatively on a rAF cadence and only commits the final value to
* the store, so dragging the degree handle doesn't thrash React state.
*/
function PositionSection() {
  const $ = (0, import_compiler_runtime.c)(144);
  const { t } = useTranslation("editor");
  const [pinningExpanded, setPinningExpanded] = (0, import_react.useState)(false);
  const {
    get,
    getExplicit,
    set,
    has,
    getIsMixed,
    setMultiple,
    clear,
    store,
    selectedElementId,
    positionAlignmentScope,
    alignCanvasPosition,
    canDistributePosition,
    distributeCanvasPosition
  } = useStyleOps();
  let alignHorizontal;
  let alignVertical;
  let allowCenter;
  let horizontalConstraint;
  let pinEdge;
  let pos;
  let positionMixed;
  let setHorizontal;
  let setPositionType;
  let setVertical;
  let showAlignment;
  let showBottomOffset;
  let showConstraints;
  let showLeftOffset;
  let showOffsets;
  let showRightOffset;
  let showTopOffset;
  let t0;
  let verticalConstraint;
  if ($[0] !== alignCanvasPosition || $[1] !== get || $[2] !== getExplicit || $[3] !== getIsMixed || $[4] !== has || $[5] !== positionAlignmentScope || $[6] !== set || $[7] !== setMultiple) {
    pos = get("position");
    let t1;
    if ($[27] !== getIsMixed) {
      t1 = getIsMixed("position");
      $[27] = getIsMixed;
      $[28] = t1;
    } else t1 = $[28];
    positionMixed = t1;
    showConstraints = pos === "relative" || pos === "absolute" || pos === "fixed" || pos === "sticky";
    showAlignment = positionAlignmentScope !== "none" && positionAlignmentScope !== "canvas-disabled" && positionAlignmentScope !== "frame-disabled";
    showOffsets = showConstraints;
    let t2;
    if ($[29] !== set || $[30] !== setMultiple) {
      t2 = v => {
        if (v === "absolute" || v === "fixed" || v === "sticky") set("position", v);else setMultiple({
          position: v,
          top: void 0,
          right: void 0,
          bottom: void 0,
          left: void 0,
          inset: void 0
        });
      };
      $[29] = set;
      $[30] = setMultiple;
      $[31] = t2;
    } else t2 = $[31];
    setPositionType = t2;
    let t3;
    if ($[32] !== setMultiple) {
      t3 = a => {
        if (a !== "stretch") setMultiple(pinnedAlignmentStyles("horizontal", a));else setMultiple({
          left: "0px",
          right: "0px",
          marginLeft: void 0,
          marginRight: void 0
        });
      };
      $[32] = setMultiple;
      $[33] = t3;
    } else t3 = $[33];
    setHorizontal = t3;
    let t4;
    if ($[34] !== setMultiple) {
      t4 = a_0 => {
        if (a_0 !== "stretch") setMultiple(pinnedAlignmentStyles("vertical", a_0));else setMultiple({
          top: "0px",
          bottom: "0px",
          marginTop: void 0,
          marginBottom: void 0
        });
      };
      $[34] = setMultiple;
      $[35] = t4;
    } else t4 = $[35];
    setVertical = t4;
    alignHorizontal = alignment => {
      if (positionAlignmentScope === "canvas") alignCanvasPosition("horizontal", alignment);else if (positionAlignmentScope === "frame") setMultiple(positionedAlignmentStyles(positionMixed ? "relative" : pos, "horizontal", alignment));
    };
    alignVertical = alignment_0 => {
      if (positionAlignmentScope === "canvas") alignCanvasPosition("vertical", alignment_0);else if (positionAlignmentScope === "frame") setMultiple(positionedAlignmentStyles(positionMixed ? "relative" : pos, "vertical", alignment_0));
    };
    const hasBothHorizontalOffsets = has("left") && has("right");
    const hasBothVerticalOffsets = has("top") && has("bottom");
    allowCenter = pos === "absolute" || pos === "fixed";
    horizontalConstraint = allowCenter && hasBothHorizontalOffsets && get("marginLeft") === "auto" && get("marginRight") === "auto" ? "center" : hasBothHorizontalOffsets ? "stretch" : has("right") && !has("left") ? "end" : "start";
    verticalConstraint = allowCenter && hasBothVerticalOffsets && get("marginTop") === "auto" && get("marginBottom") === "auto" ? "center" : hasBothVerticalOffsets ? "stretch" : has("bottom") && !has("top") ? "end" : "start";
    showLeftOffset = !showConstraints || horizontalConstraint !== "end";
    showRightOffset = !showConstraints || horizontalConstraint !== "start";
    showTopOffset = !showConstraints || verticalConstraint !== "end";
    showBottomOffset = !showConstraints || verticalConstraint !== "start";
    let t5;
    if ($[36] !== getExplicit) {
      t5 = property => {
        const value = getExplicit(property);
        return value && value !== "auto" ? value : "0px";
      };
      $[36] = getExplicit;
      $[37] = t5;
    } else t5 = $[37];
    const explicitOffsetOrZero = t5;
    let t6;
    if ($[38] !== explicitOffsetOrZero || $[39] !== horizontalConstraint || $[40] !== setMultiple || $[41] !== verticalConstraint) {
      t6 = (edge, additive) => {
        if (additive && (edge === "left" && horizontalConstraint === "end" || edge === "right" && horizontalConstraint === "start" || (edge === "left" || edge === "right") && horizontalConstraint === "stretch")) {
          setMultiple({
            left: explicitOffsetOrZero("left"),
            right: explicitOffsetOrZero("right"),
            marginLeft: void 0,
            marginRight: void 0
          });
          return;
        }
        if (additive && (edge === "top" && verticalConstraint === "end" || edge === "bottom" && verticalConstraint === "start" || (edge === "top" || edge === "bottom") && verticalConstraint === "stretch")) {
          setMultiple({
            top: explicitOffsetOrZero("top"),
            bottom: explicitOffsetOrZero("bottom"),
            marginTop: void 0,
            marginBottom: void 0
          });
          return;
        }
        if (edge === "top") setMultiple({
          top: explicitOffsetOrZero("top"),
          bottom: void 0,
          marginTop: void 0,
          marginBottom: void 0
        });else if (edge === "bottom") setMultiple({
          bottom: explicitOffsetOrZero("bottom"),
          top: void 0,
          marginTop: void 0,
          marginBottom: void 0
        });else if (edge === "left") setMultiple({
          left: explicitOffsetOrZero("left"),
          right: void 0,
          marginLeft: void 0,
          marginRight: void 0
        });else setMultiple({
          right: explicitOffsetOrZero("right"),
          left: void 0,
          marginLeft: void 0,
          marginRight: void 0
        });
      };
      $[38] = explicitOffsetOrZero;
      $[39] = horizontalConstraint;
      $[40] = setMultiple;
      $[41] = verticalConstraint;
      $[42] = t6;
    } else t6 = $[42];
    pinEdge = t6;
    t0 = positionMixed ? "-" : POSITION_LABELS[pos] ?? (pos ? `${pos[0].toUpperCase()}${pos.slice(1)}` : "Static");
    $[0] = alignCanvasPosition;
    $[1] = get;
    $[2] = getExplicit;
    $[3] = getIsMixed;
    $[4] = has;
    $[5] = positionAlignmentScope;
    $[6] = set;
    $[7] = setMultiple;
    $[8] = alignHorizontal;
    $[9] = alignVertical;
    $[10] = allowCenter;
    $[11] = horizontalConstraint;
    $[12] = pinEdge;
    $[13] = pos;
    $[14] = positionMixed;
    $[15] = setHorizontal;
    $[16] = setPositionType;
    $[17] = setVertical;
    $[18] = showAlignment;
    $[19] = showBottomOffset;
    $[20] = showConstraints;
    $[21] = showLeftOffset;
    $[22] = showOffsets;
    $[23] = showRightOffset;
    $[24] = showTopOffset;
    $[25] = t0;
    $[26] = verticalConstraint;
  } else {
    alignHorizontal = $[8];
    alignVertical = $[9];
    allowCenter = $[10];
    horizontalConstraint = $[11];
    pinEdge = $[12];
    pos = $[13];
    positionMixed = $[14];
    setHorizontal = $[15];
    setPositionType = $[16];
    setVertical = $[17];
    showAlignment = $[18];
    showBottomOffset = $[19];
    showConstraints = $[20];
    showLeftOffset = $[21];
    showOffsets = $[22];
    showRightOffset = $[23];
    showTopOffset = $[24];
    t0 = $[25];
    verticalConstraint = $[26];
  }
  const positionLabel = translateInspectorText(t, t0);
  let t1;
  let transformMixed;
  if ($[43] !== get || $[44] !== getIsMixed) {
    const transformVal = get("transform");
    let t2;
    if ($[47] !== getIsMixed) {
      t2 = getIsMixed("transform");
      $[47] = getIsMixed;
      $[48] = t2;
    } else t2 = $[48];
    transformMixed = t2;
    t1 = parseTransformControls(transformVal);
    $[43] = get;
    $[44] = getIsMixed;
    $[45] = t1;
    $[46] = transformMixed;
  } else {
    t1 = $[45];
    transformMixed = $[46];
  }
  const tp = t1;
  let t2;
  if ($[49] !== clear || $[50] !== set) {
    t2 = composed => {
      if (composed) set("transform", composed);else clear("transform");
    };
    $[49] = clear;
    $[50] = set;
    $[51] = t2;
  } else t2 = $[51];
  const writeTransform = t2;
  let t3;
  if ($[52] !== tp || $[53] !== writeTransform) {
    t3 = deg => writeTransform(withTransformRotation(tp, deg));
    $[52] = tp;
    $[53] = writeTransform;
    $[54] = t3;
  } else t3 = $[54];
  const setRotate = t3;
  let t4;
  if ($[55] !== tp || $[56] !== transformMixed || $[57] !== writeTransform) {
    t4 = () => {
      const normalized = (((transformMixed ? 0 : tp.rotate) + 90) % 360 + 360) % 360;
      writeTransform(withTransformRotation(tp, normalized));
    };
    $[55] = tp;
    $[56] = transformMixed;
    $[57] = writeTransform;
    $[58] = t4;
  } else t4 = $[58];
  const rotate90 = t4;
  let t5;
  if ($[59] !== tp || $[60] !== writeTransform) {
    t5 = () => writeTransform(withTransformFlips(tp, !tp.flipX, tp.flipY));
    $[59] = tp;
    $[60] = writeTransform;
    $[61] = t5;
  } else t5 = $[61];
  const toggleFlipX = t5;
  let t6;
  if ($[62] !== tp || $[63] !== writeTransform) {
    t6 = () => writeTransform(withTransformFlips(tp, tp.flipX, !tp.flipY));
    $[62] = tp;
    $[63] = writeTransform;
    $[64] = t6;
  } else t6 = $[64];
  const toggleFlipY = t6;
  const rotationScrubPreviewRef = (0, import_react.useRef)(null);
  let t7;
  if ($[65] !== selectedElementId || $[66] !== store) {
    t7 = () => {
      const element = getById(store, selectedElementId);
      const rawDomElement = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (!element || !rawDomElement) return;
      const domElement = resolveVisibleElement$1(rawDomElement);
      const baseTransform = (element.styles || {}).transform || "";
      const overlayElement = document.querySelector(`[data-selection-overlay-id="${CSS.escape(selectedElementId)}"]`);
      const labelElement = document.querySelector(`[data-selection-label-id="${CSS.escape(selectedElementId)}"]`);
      const oldOwnMatrix = transformLinearMatrix(getComputedStyle(domElement).transform);
      const oldAccTransform = overlayElement?.style.transform || "none";
      const oldAccMatrix = oldAccTransform && oldAccTransform !== "none" ? new DOMMatrix(oldAccTransform) : new DOMMatrix();
      rotationScrubPreviewRef.current = {
        parsed: parseTransformControls(baseTransform),
        baseTransform,
        latestTransform: baseTransform,
        domElement,
        overlayElement,
        labelElement,
        ancestorMatrix: oldAccMatrix.multiply(oldOwnMatrix.inverse()),
        startRect: domElement.getBoundingClientRect(),
        startLeft: parseFloat(overlayElement?.style.left || "0"),
        startTop: parseFloat(overlayElement?.style.top || "0"),
        overlayZoom: overlayElement?.closest(".react-transform-component") ? getCamera().scale || 1 : 1
      };
    };
    $[65] = selectedElementId;
    $[66] = store;
    $[67] = t7;
  } else t7 = $[67];
  const beginRotationScrubPreview = t7;
  const rotateScrubRafRef = (0, import_react.useRef)(null);
  const pendingRotateDegRef = (0, import_react.useRef)(null);
  let t8;
  if ($[68] !== setRotate) {
    const flushRotationScrub = () => {
      rotateScrubRafRef.current = null;
      const deg_0 = pendingRotateDegRef.current;
      if (deg_0 === null) return;
      const preview = rotationScrubPreviewRef.current;
      if (!preview) {
        setRotate(deg_0);
        return;
      }
      const composed_0 = withTransformRotation(preview.parsed, deg_0);
      preview.latestTransform = composed_0;
      preview.domElement.style.transform = composed_0 || "";
      const newOwn = transformLinearMatrix(composed_0);
      const newAcc = preview.ancestorMatrix.multiply(newOwn);
      const newTransform = newAcc.a === 1 && newAcc.b === 0 && newAcc.c === 0 && newAcc.d === 1 ? "none" : `matrix(${newAcc.a}, ${newAcc.b}, ${newAcc.c}, ${newAcc.d}, 0, 0)`;
      if (preview.overlayElement) {
        const rect = preview.domElement.getBoundingClientRect();
        const start = preview.startRect;
        preview.overlayElement.style.left = `${preview.startLeft + (rect.x + rect.width / 2 - start.x - start.width / 2) / preview.overlayZoom}px`;
        preview.overlayElement.style.top = `${preview.startTop + (rect.y + rect.height / 2 - start.y - start.height / 2) / preview.overlayZoom}px`;
        preview.overlayElement.style.transform = newTransform === "none" ? "" : newTransform;
        if (preview.labelElement) {
          const left = parseFloat(preview.overlayElement.style.left) || 0;
          const top = parseFloat(preview.overlayElement.style.top) || 0;
          const width = parseFloat(preview.overlayElement.style.width) || 0;
          const height = parseFloat(preview.overlayElement.style.height) || 0;
          const edge_0 = topEdgeOfRotatedBox(left + width / 2, top + height / 2, width, height, newTransform);
          preview.labelElement.style.left = `${edge_0.x}px`;
          preview.labelElement.style.top = `${edge_0.y}px`;
          preview.labelElement.style.transform = `rotate(${edge_0.angleDeg}deg)`;
        }
      }
    };
    t8 = deg_1 => {
      pendingRotateDegRef.current = deg_1;
      if (rotateScrubRafRef.current !== null) return;
      rotateScrubRafRef.current = requestAnimationFrame(flushRotationScrub);
    };
    $[68] = setRotate;
    $[69] = t8;
  } else t8 = $[69];
  const previewRotationScrub = t8;
  let t9;
  if ($[70] !== setRotate) {
    t9 = deg_2 => {
      if (rotateScrubRafRef.current !== null) {
        cancelAnimationFrame(rotateScrubRafRef.current);
        rotateScrubRafRef.current = null;
      }
      pendingRotateDegRef.current = null;
      rotationScrubPreviewRef.current = null;
      setRotate(deg_2);
    };
    $[70] = setRotate;
    $[71] = t9;
  } else t9 = $[71];
  const commitRotationScrub = t9;
  let t10;
  if ($[72] !== alignHorizontal || $[73] !== alignVertical || $[74] !== canDistributePosition || $[75] !== distributeCanvasPosition || $[76] !== positionAlignmentScope || $[77] !== showAlignment) {
    t10 = showAlignment ? <PositionAlignmentControls canDistribute={canDistributePosition} showDistribution={positionAlignmentScope === "canvas"} onHorizontal={alignHorizontal} onVertical={alignVertical} onDistribute={distributeCanvasPosition} /> : void 0;
    $[72] = alignHorizontal;
    $[73] = alignVertical;
    $[74] = canDistributePosition;
    $[75] = distributeCanvasPosition;
    $[76] = positionAlignmentScope;
    $[77] = showAlignment;
    $[78] = t10;
  } else t10 = $[78];
  let t11;
  if (true) {
    t11 = showConstraints ? <IconBtn label={pinningExpanded ? t("styles.hidePinning") : t("styles.showPinning")} title={t("styles.pinning")} active={pinningExpanded} onClick={() => setPinningExpanded(_temp$32)}>{<PositionPinningIcon horizontal={horizontalConstraint} vertical={verticalConstraint} />}</IconBtn> : void 0;
    $[79] = horizontalConstraint;
    $[80] = pinningExpanded;
    $[81] = showConstraints;
    $[82] = verticalConstraint;
    $[83] = t11;
  } else t11 = $[83];
  let t12;
  if ($[84] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <PositionIcon className="size-4 shrink-0 text-ed-inspector-chrome" />;
    $[84] = t12;
  } else t12 = $[84];
  let t13;
  if (true) {
    t13 = <span className="flex min-w-0 items-center gap-1.5">{t12}{<span className="truncate">{positionLabel}</span>}</span>;
    $[85] = positionLabel;
    $[86] = t13;
  } else t13 = $[86];
  let t14;
  if ($[87] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = POSITION_TYPES.flatMap(_temp2$24);
    $[87] = t14;
  } else t14 = $[87];
  let t15;
  if ($[88] !== setPositionType) {
    t15 = value_0 => setPositionType(value_0);
    $[88] = setPositionType;
    $[89] = t15;
  } else t15 = $[89];
  let t16;
  if (true) {
    t16 = <InspectorDropdown label="Position type" value={t13} className="w-full" selectedValue={pos} isMixed={positionMixed} options={t14} onValueChange={t15} />;
    $[90] = pos;
    $[91] = positionMixed;
    $[92] = t13;
    $[93] = t15;
    $[94] = t16;
  } else t16 = $[94];
  let t17;
  if ($[95] !== t11 || $[96] !== t16) {
    t17 = <InspectorRailRow action={t11}>{t16}</InspectorRailRow>;
    $[95] = t11;
    $[96] = t16;
    $[97] = t17;
  } else t17 = $[97];
  let t18;
  if ($[98] !== allowCenter || $[99] !== horizontalConstraint || $[100] !== pinEdge || $[101] !== pinningExpanded || $[102] !== setHorizontal || $[103] !== setVertical || $[104] !== showBottomOffset || $[105] !== showConstraints || $[106] !== showLeftOffset || $[107] !== showOffsets || $[108] !== showRightOffset || $[109] !== showTopOffset || $[110] !== verticalConstraint) {
    t18 = showOffsets && <div className="flex w-full flex-col gap-1.5">{showConstraints && pinningExpanded && <PositionConstraintsControl horizontal={horizontalConstraint} vertical={verticalConstraint} allowCenter={allowCenter} onHorizontal={setHorizontal} onVertical={setVertical} onPin={pinEdge} />}{<div className="grid w-full grid-cols-2 gap-1.5">{showLeftOffset && <StylePositionOffset label="L" property="left" />}{showRightOffset && <StylePositionOffset label="R" property="right" />}{showTopOffset && <StylePositionOffset label="T" property="top" />}{showBottomOffset && <StylePositionOffset label="B" property="bottom" />}</div>}</div>;
    $[98] = allowCenter;
    $[99] = horizontalConstraint;
    $[100] = pinEdge;
    $[101] = pinningExpanded;
    $[102] = setHorizontal;
    $[103] = setVertical;
    $[104] = showBottomOffset;
    $[105] = showConstraints;
    $[106] = showLeftOffset;
    $[107] = showOffsets;
    $[108] = showRightOffset;
    $[109] = showTopOffset;
    $[110] = verticalConstraint;
    $[111] = t18;
  } else t18 = $[111];
  let t19;
  if ($[112] !== beginRotationScrubPreview || $[113] !== commitRotationScrub || $[114] !== previewRotationScrub || $[115] !== setRotate || $[116] !== tp.rotate || $[117] !== transformMixed) {
    t19 = <RotationField value={tp.rotate} isMixed={transformMixed} onChange={setRotate} onScrubStart={beginRotationScrubPreview} onScrubPreview={previewRotationScrub} onScrubCommit={commitRotationScrub} />;
    $[112] = beginRotationScrubPreview;
    $[113] = commitRotationScrub;
    $[114] = previewRotationScrub;
    $[115] = setRotate;
    $[116] = tp.rotate;
    $[117] = transformMixed;
    $[118] = t19;
  } else t19 = $[118];
  let t20;
  if ($[119] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = <Rotate90Icon className="size-3.75" />;
    $[119] = t20;
  } else t20 = $[119];
  let t21;
  if (true) {
    t21 = <SegmentedIconButton label={t("styles.rotate90")} tooltip={t("styles.rotate90")} onClick={rotate90}>{t20}</SegmentedIconButton>;
    $[120] = rotate90;
    $[121] = t21;
  } else t21 = $[121];
  let t22;
  if ($[122] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = <FlipHorizontalIcon className="size-3.75" />;
    $[122] = t22;
  } else t22 = $[122];
  let t23;
  if (true) {
    t23 = <SegmentedIconButton label={t("styles.flipHorizontal")} tooltip={t("styles.flipHorizontal")} active={tp.flipX} onClick={toggleFlipX}>{t22}</SegmentedIconButton>;
    $[123] = toggleFlipX;
    $[124] = tp.flipX;
    $[125] = t23;
  } else t23 = $[125];
  let t24;
  if ($[126] === Symbol.for("react.memo_cache_sentinel")) {
    t24 = <FlipVerticalIcon className="size-3.75" />;
    $[126] = t24;
  } else t24 = $[126];
  let t25;
  if (true) {
    t25 = <SegmentedIconButton label={t("styles.flipVertical")} tooltip={t("styles.flipVertical")} active={tp.flipY} onClick={toggleFlipY}>{t24}</SegmentedIconButton>;
    $[127] = toggleFlipY;
    $[128] = tp.flipY;
    $[129] = t25;
  } else t25 = $[129];
  let t26;
  if ($[130] !== t21 || $[131] !== t23 || $[132] !== t25) {
    t26 = <SegmentedIconButtonGroup className="flex-1">{t21}{t23}{t25}</SegmentedIconButtonGroup>;
    $[130] = t21;
    $[131] = t23;
    $[132] = t25;
    $[133] = t26;
  } else t26 = $[133];
  let t27;
  if (true) {
    t27 = <div role="group" aria-label={t("styles.rotation")} className="flex w-full flex-col">{<div className="flex w-full items-center gap-1.5">{t19}{t26}</div>}</div>;
    $[134] = t19;
    $[135] = t26;
    $[136] = t27;
  } else t27 = $[136];
  let t28;
  if ($[137] !== t17 || $[138] !== t18 || $[139] !== t27) {
    t28 = <div className="flex w-full flex-col gap-1.5">{t17}{t18}{t27}</div>;
    $[137] = t17;
    $[138] = t18;
    $[139] = t27;
    $[140] = t28;
  } else t28 = $[140];
  let t29;
  if ($[141] !== t10 || $[142] !== t28) {
    t29 = <InspectorSection title="Position" reserveActionRail={true} action={t10}>{t28}</InspectorSection>;
    $[141] = t10;
    $[142] = t28;
    $[143] = t29;
  } else t29 = $[143];
  return t29;
}
function _temp2$24(type) {
  return type === "fixed" ? [] : [{
    value: type,
    label: POSITION_LABELS[type]
  }];
}
function _temp$32(expanded) {
  return !expanded;
}

export { PositionSection };
