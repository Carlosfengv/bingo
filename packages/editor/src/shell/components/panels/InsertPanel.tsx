/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/InsertPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { setElementDragData } from "../../../shared/utils/clipboard";
import { useTranslation } from "@bingo/i18n";
import { generatePrefixedId } from "../../../shared/utils/idUtils";
import { createElementFromTag, htmlTags } from "../../utils/htmlTagsData";
import { InsertItem } from "../InsertItem";
import { PanelSearchInput } from "./PanelSearchInput";
import { Button, GlobeIcon, ScrollArea, Text$4, TextTIcon, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var COMMON_TAGS = ["div", "h1", "h2", "h3", "p", "span"];
var CATEGORY_LABEL_KEYS = {
  layout: "panels.layout",
  text: "panels.text",
  media: "panels.media",
  form: "panels.form",
  semantic: "panels.semantic"
};
var CATEGORY_ORDER = ["layout", "text", "media", "form", "semantic"];
var InsertPanel = t0 => {
  const $ = (0, import_compiler_runtime.c)(69);
  const { t } = useTranslation("editor");
  const {
    onAddElement,
    readOnly: t1,
    isElectron: t2
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  const isElectron = t2 === void 0 ? false : t2;
  const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
  const [showWebviewInput, setShowWebviewInput] = (0, import_react.useState)(false);
  const [webviewUrl, setWebviewUrl] = (0, import_react.useState)("http://localhost:3000");
  const createTextNode = _temp$55;
  const createWebviewNode = _temp2$42;
  let T0;
  let t3;
  let t4;
  let t5;
  let t6;
  let t7;
  if (true) {
    let t8;
    if (true) {
      t8 = tag => t(`htmlTags.${tag.tag}.title`).toLowerCase().includes(searchQuery.toLowerCase()) || tag.tag.toLowerCase().includes(searchQuery.toLowerCase()) || t(`htmlTags.${tag.tag}.description`).toLowerCase().includes(searchQuery.toLowerCase());
      $[12] = searchQuery;
      $[13] = t8;
    } else t8 = $[13];
    const filteredTags = htmlTags.filter(t8);
    let t9;
    if (true) {
      t9 = searchQuery === "" || `text ${t("panels.text")}`.toLowerCase().includes(searchQuery.toLowerCase());
      $[14] = searchQuery;
      $[15] = t9;
    } else t9 = $[15];
    const showTextNode = t9;
    let t10;
    if (true) {
      t10 = searchQuery === "" || `webview localhost preview live ${t("panels.livePreview")}`.toLowerCase().includes(searchQuery.toLowerCase());
      $[16] = searchQuery;
      $[17] = t10;
    } else t10 = $[17];
    const showWebviewNode = t10;
    const isSearching = searchQuery !== "";
    const commonTags = filteredTags.filter(_temp3$27);
    const remainingTags = filteredTags.filter(_temp4$21);
    const groupedRemaining = [];
    if (!isSearching) for (const cat of CATEGORY_ORDER) {
      const tags = remainingTags.filter(t_1 => t_1.category === cat);
      if (tags.length > 0) groupedRemaining.push({
        category: cat,
        tags
      });
    }
    const renderSectionHeader = _temp5$18;
    let t11;
    if ($[18] !== onAddElement || $[19] !== readOnly) {
      t11 = tags_0 => tags_0.map(tagData => <InsertItem key={tagData.tag} tagData={tagData} readOnly={readOnly} onClick={() => onAddElement(createElementFromTag(tagData))} />);
      $[18] = onAddElement;
      $[19] = readOnly;
      $[20] = t11;
    } else t11 = $[20];
    const renderItems = t11;
    let t12;
    if ($[21] !== readOnly) {
      t12 = e => {
        if (readOnly) return;
        setElementDragData(e, createTextNode());
      };
      $[21] = readOnly;
      $[22] = t12;
    } else t12 = $[22];
    const handleTextNodeDragStart = t12;
    let t13;
    if (true) {
      t13 = () => <div draggable={!readOnly} onDragStart={handleTextNodeDragStart} className={`py-3 px-4 hover:bg-ed-accent flex items-center gap-3 border-b border-ed-border ${!readOnly && "cursor-grab active:cursor-grabbing"}`} onClick={() => onAddElement(createTextNode())}>{<div data-panel-drag-preview={true} className="w-10 h-10 rounded flex items-center justify-center shrink-0 overflow-hidden" style={{
          background: "#6b7280"
        }}>{<TextTIcon width={20} height={20} className="text-white" />}</div>}{<div className="flex-1 min-w-0">{<div className="text-sm font-medium text-ed-foreground">{t("panels.text")}</div>}{<div className="text-xs text-ed-muted-foreground">{t("panels.plainTextNode")}</div>}</div>}</div>;
      $[23] = handleTextNodeDragStart;
      $[24] = onAddElement;
      $[25] = readOnly;
      $[26] = t13;
    } else t13 = $[26];
    const renderTextNodeRow = t13;
    let t14;
    if ($[27] !== onAddElement || $[28] !== webviewUrl) {
      t14 = () => {
        const url = webviewUrl.trim();
        if (!url) return;
        onAddElement(createWebviewNode(url));
        setShowWebviewInput(false);
      };
      $[27] = onAddElement;
      $[28] = webviewUrl;
      $[29] = t14;
    } else t14 = $[29];
    const handleAddWebview = t14;
    const t15 = `py-3 px-4 flex items-center gap-3 ${isElectron ? "hover:bg-ed-accent" : "opacity-50 cursor-not-allowed"}`;
    let t16;
    if ($[30] !== isElectron || $[31] !== showWebviewInput) {
      t16 = isElectron ? () => setShowWebviewInput(!showWebviewInput) : void 0;
      $[30] = isElectron;
      $[31] = showWebviewInput;
      $[32] = t16;
    } else t16 = $[32];
    const t17 = !isElectron || void 0;
    let t18;
    let t19;
    let t20;
    if ($[33] === Symbol.for("react.memo_cache_sentinel")) {
      t18 = {
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: 4,
        gap: 3
      };
      t19 = <div style={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        paddingLeft: 1
      }}>{<div style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          backgroundColor: "#ff5f57"
        }} />}{<div style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          backgroundColor: "#febc2e"
        }} />}{<div style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          backgroundColor: "#28c840"
        }} />}</div>;
      t20 = {
        flex: 1,
        background: "#ffffff",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      };
      $[33] = t18;
      $[34] = t19;
      $[35] = t20;
    } else {
      t18 = $[33];
      t19 = $[34];
      t20 = $[35];
    }
    let t21;
    if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
      t21 = <div className="w-10 h-10 shrink-0 bg-ed-muted shadow-lg/4" style={t18}>{t19}{<div style={t20}>{<GlobeIcon width={10} height={10} style={{
            color: "#656d76"
          }} />}</div>}</div>;
      $[36] = t21;
    } else t21 = $[36];
    let t22;
    if (true) {
      t22 = <div className="flex-1 min-w-0">{<div className="text-sm font-medium text-ed-foreground">{t("panels.livePreview")}</div>}{<div className="text-xs text-ed-muted-foreground">{t("panels.livePreviewDescription")}</div>}</div>;
      $[37] = t22;
    } else t22 = $[37];
    let t23;
    if ($[38] !== t15 || $[39] !== t16 || $[40] !== t17) {
      t23 = <div className={t15} onClick={t16} aria-disabled={t17}>{t21}{t22}</div>;
      $[38] = t15;
      $[39] = t16;
      $[40] = t17;
      $[41] = t23;
    } else t23 = $[41];
    const livePreviewRow = t23;
    let t24;
    if (true) {
      t24 = isElectron ? livePreviewRow : <Tooltip>{<TooltipTrigger asChild={true}>{livePreviewRow}</TooltipTrigger>}{<TooltipContent side="right">{t("panels.desktopOnly")}</TooltipContent>}</Tooltip>;
      $[42] = isElectron;
      $[43] = livePreviewRow;
      $[44] = t24;
    } else t24 = $[44];
    let t25;
    if (true) {
      t25 = isElectron && showWebviewInput && <div className="px-4 pb-3 flex gap-2">{<input type="text" value={webviewUrl} onChange={e_0 => setWebviewUrl(e_0.target.value)} onKeyDown={e_1 => {
          if (e_1.nativeEvent.isComposing || e_1.keyCode === 229) return;
          if (e_1.key === "Enter") handleAddWebview();
        }} placeholder="http://localhost:3000" className="flex-1 px-3 py-1.5 text-sm bg-ed-background border border-ed-border rounded-md focus:outline-none focus:ring-2 focus:ring-ed-ring text-ed-foreground placeholder:text-ed-muted-foreground" autoFocus={true} />}{<Button size="sm" onClick={handleAddWebview}>{t("panels.add")}</Button>}</div>;
      $[45] = handleAddWebview;
      $[46] = isElectron;
      $[47] = showWebviewInput;
      $[48] = webviewUrl;
      $[49] = t25;
    } else t25 = $[49];
    let t26;
    if ($[50] !== t24 || $[51] !== t25) {
      t26 = <div className="border-b border-ed-border">{t24}{t25}</div>;
      $[50] = t24;
      $[51] = t25;
      $[52] = t26;
    } else t26 = $[52];
    const livePreviewCard = t26;
    t5 = "w-full flex flex-col flex-1 overflow-hidden pt-1";
    if (true) {
      t6 = readOnly && <div className="px-4 pb-2 bg-ed-muted/50 border-b border-ed-border">{<Text$4 size="xs" variant="secondary">{t("panels.viewOnlyElements")}</Text$4>}</div>;
      $[53] = readOnly;
      $[54] = t6;
    } else t6 = $[54];
    const t27 = `px-3 pb-2 border-b border-ed-border ${readOnly ? "opacity-50 pointer-events-none" : ""}`;
    let t28;
    if (true) {
      t28 = <PanelSearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t("panels.searchHtml")} />;
      $[55] = searchQuery;
      $[56] = t28;
    } else t28 = $[56];
    if ($[57] !== t27 || $[58] !== t28) {
      t7 = <div className={t27}>{t28}</div>;
      $[57] = t27;
      $[58] = t28;
      $[59] = t7;
    } else t7 = $[59];
    T0 = ScrollArea;
    t3 = `flex-1 ${readOnly ? "opacity-50 pointer-events-none" : ""}`;
    t4 = !showTextNode && filteredTags.length === 0 ? <div className="px-4 py-8 text-center">{<Text$4 size="sm" variant="secondary">{t("panels.noElements")}</Text$4>}</div> : isSearching ? <>{renderSectionHeader(t("panels.elements"))}{showTextNode && renderTextNodeRow()}{showWebviewNode && livePreviewCard}{renderItems(filteredTags)}</> : <>{(showTextNode || commonTags.length > 0) && renderSectionHeader(t("panels.common"))}{showTextNode && renderTextNodeRow()}{livePreviewCard}{renderItems(commonTags)}{groupedRemaining.map(t29 => {
        const {
          category,
          tags: tags_1
        } = t29;
        return <div key={category}>{renderSectionHeader(t(CATEGORY_LABEL_KEYS[category] || category))}{renderItems(tags_1)}</div>;
      })}</>;
    $[0] = isElectron;
    $[1] = onAddElement;
    $[2] = readOnly;
    $[3] = searchQuery;
    $[4] = showWebviewInput;
    $[5] = webviewUrl;
    $[6] = T0;
    $[7] = t3;
    $[8] = t4;
    $[9] = t5;
    $[10] = t6;
    $[11] = t7;
  } else {
    T0 = $[6];
    t3 = $[7];
    t4 = $[8];
    t5 = $[9];
    t6 = $[10];
    t7 = $[11];
  }
  let t8;
  if ($[60] !== T0 || $[61] !== t3 || $[62] !== t4) {
    t8 = <T0 className={t3}>{t4}</T0>;
    $[60] = T0;
    $[61] = t3;
    $[62] = t4;
    $[63] = t8;
  } else t8 = $[63];
  let t9;
  if ($[64] !== t5 || $[65] !== t6 || $[66] !== t7 || $[67] !== t8) {
    t9 = <div className={t5}>{t6}{t7}{t8}</div>;
    $[64] = t5;
    $[65] = t6;
    $[66] = t7;
    $[67] = t8;
    $[68] = t9;
  } else t9 = $[68];
  return t9;
};
function _temp$55() {
  return {
    id: generatePrefixedId("text"),
    type: "text",
    tag: "span",
    text: "Text",
    styles: {}
  };
}
function _temp2$42(src) {
  return {
    id: generatePrefixedId("webview"),
    type: "webview",
    src,
    viewportWidth: 1280,
    viewportHeight: 800
  };
}
function _temp3$27(t) {
  return COMMON_TAGS.includes(t.tag);
}
function _temp4$21(t_0) {
  return !COMMON_TAGS.includes(t_0.tag);
}
function _temp5$18(label) {
  return <div className="px-4 py-2 bg-ed-muted/30 border-b border-ed-border">{<Text$4 size="xs" weight="medium" variant="secondary">{label}</Text$4>}</div>;
}

export { InsertPanel };
