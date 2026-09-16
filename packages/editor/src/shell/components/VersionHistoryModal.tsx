/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/VersionHistoryModal.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useBackendActions } from "../hooks/useBackendActions";
import { CODE_EDITOR_CLASS, CODE_EDITOR_THEME, useCodeEditorFontStyles } from "../utils/codeEditorTheme";
import { buildPreviewComponentProps, inventPropValue } from "./panels/AssetsPanel";
import { javascript } from "@codemirror/lang-javascript";
import { ArrowCounterClockwiseIcon, Badge, Button, CodeIcon, Dialog, DialogContent, EyeIcon, ScrollArea, Tabs, TabsList, TabsTrigger, Text$4, XIcon, useIsDark } from "@bingo/ui";
import { formatDate as formatLocalizedDate, formatRelativeTime, useTranslation } from "@bingo/i18n";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { default as ReactCodeMirror } from "@uiw/react-codemirror";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

function bareComponentName(name) {
  return name.includes("::") ? name.split("::")[0] : name;
}
function unionOptionsFromType(propType) {
  if (!propType || !propType.includes("|") || !(propType.includes("\"") || propType.includes("'"))) return;
  const options = propType.split("|").map(s => s.trim().replace(/['"]/g, "")).filter(v => v && v !== "undefined" && v !== "null");
  return options.length > 1 ? options : void 0;
}
function parseSignatureProps(sourceCode, displayName) {
  const propMatch = sourceCode.match(new RegExp(`function\\s+${displayName}\\s*\\(\\s*\\{([^}]*)\\}`));
  if (!propMatch) return [];
  const props = propMatch[1].split(",").map(p => p.trim()).filter(Boolean).map(p => {
    const [nameWithDefault] = p.split(":");
    const parts = nameWithDefault.split("=").map(s => s.trim());
    const name = parts[0];
    let defaultValue = void 0;
    if (parts[1]) try {
      defaultValue = JSON.parse(parts[1].replace(/'/g, "\""));
    } catch {
      defaultValue = parts[1].replace(/['"]/g, "");
    }
    return {
      name,
      defaultValue,
      options: void 0,
      type: void 0
    };
  }).filter(p => p.name && !p.name.startsWith("..."));
  for (const prop of props) {
    const unionMatch = sourceCode.match(new RegExp(`${prop.name}\\??\\s*:\\s*((?:'[^']*'\\s*\\|\\s*)*'[^']*')`));
    if (unionMatch) {
      const options = unionMatch[1].split("|").map(s => s.trim().replace(/'/g, ""));
      if (options.length > 1) {
        prop.options = options;
        prop.type = options.map(o => `'${o}'`).join(" | ");
        if (prop.defaultValue === void 0) prop.defaultValue = options[0];
      }
    }
  }
  return props;
}
function propsFromComponentIndex(indexProps) {
  if (!indexProps) return [];
  return Object.entries(indexProps).map(([name, info]) => {
    const type = typeof info === "object" && info ? String(info.type || "") : String(info || "");
    const options = unionOptionsFromType(type);
    return {
      name,
      type,
      options,
      defaultValue: (typeof info === "object" && info ? info.example !== void 0 ? info.example : info.default : void 0) ?? (options ? options[0] : void 0) ?? inventPropValue(name, info)
    };
  });
}
function buildPreviewMeta(sourceCode, displayName, componentName, componentIndex) {
  const indexEntry = componentIndex?.[componentName] ?? componentIndex?.[displayName];
  const fromIndex = propsFromComponentIndex(indexEntry?.props);
  const fromSignature = sourceCode ? parseSignatureProps(sourceCode, displayName) : [];
  const props = mergePropLists(fromIndex.length > 0 ? fromIndex : fromSignature, fromSignature).filter(p => p.name !== "children");
  const {
    props: invented
  } = buildPreviewComponentProps(indexEntry?.props);
  const initial = {
    ...invented
  };
  for (const p of props) if (initial[p.name] === void 0 && p.defaultValue !== void 0) initial[p.name] = p.defaultValue;
  return {
    props,
    initial
  };
}
function mergePropLists(primary, secondary) {
  const byName = new Map();
  for (const prop of secondary) byName.set(prop.name, prop);
  for (const prop of primary) {
    const existing = byName.get(prop.name);
    byName.set(prop.name, existing ? {
      ...existing,
      ...prop,
      options: prop.options ?? existing.options,
      defaultValue: prop.defaultValue !== void 0 ? prop.defaultValue : existing.defaultValue,
      type: prop.type || existing.type
    } : prop);
  }
  return [...byName.values()];
}
var PreviewErrorBoundary = class extends import_react.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: ""
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error.message
    };
  }
  componentDidCatch(error, _info) {
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) return <div className="flex items-center justify-center h-full p-8">{<div className="text-center">{<Text$4 size="sm" variant="tertiary">{this.props.unavailableLabel}</Text$4>}{<Text$4 size="xs" variant="tertiary" className="mt-1 max-w-md">{this.state.error}</Text$4>}</div>}</div>;
    return this.props.children;
  }
};
function VersionHistoryModal(t0) {
  const $ = (0, import_compiler_runtime.c)(84);
  const { t, i18n } = useTranslation("editor");
  const locale = i18n.resolvedLanguage === "zh-CN" ? "zh-CN" : "en";
  const {
    componentName,
    filePath,
    onClose,
    onRestore,
    componentIndex,
    compilePreview
  } = t0;
  const {
    listFileVersions,
    restoreFileVersion,
    getFileVersionContent,
    loadFile
  } = useBackendActions();
  useCodeEditorFontStyles();
  const isDark = useIsDark();
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = javascript({
      jsx: true
    });
    $[0] = t1;
  } else t1 = $[0];
  const t2 = isDark ? githubDark : githubLight;
  let t3;
  if ($[1] !== t2) {
    t3 = [t1, t2, CODE_EDITOR_THEME];
    $[1] = t2;
    $[2] = t3;
  } else t3 = $[2];
  const editorExtensions = t3;
  const displayName = bareComponentName(componentName);
  let t4;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [];
    $[3] = t4;
  } else t4 = $[3];
  const [versions, setVersions] = (0, import_react.useState)(t4);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [selectedVersion, setSelectedVersion] = (0, import_react.useState)(null);
  const [sourceCode, setSourceCode] = (0, import_react.useState)("");
  const [isLoadingContent, setIsLoadingContent] = (0, import_react.useState)(false);
  const [isRestoring, setIsRestoring] = (0, import_react.useState)(false);
  const [activeTab, setActiveTab] = (0, import_react.useState)("preview");
  const [PreviewComp, setPreviewComp] = (0, import_react.useState)(null);
  const [isCompiling, setIsCompiling] = (0, import_react.useState)(false);
  const indexEntry = componentIndex?.[componentName] ?? componentIndex?.[displayName];
  let t5;
  if ($[4] !== indexEntry) {
    t5 = indexEntry?.props ? Object.keys(indexEntry.props).join(",") : "";
    $[4] = indexEntry;
    $[5] = t5;
  } else t5 = $[5];
  const previewSourceKey = `${componentName}\0${displayName}\0${sourceCode}\0${t5}`;
  const {
    props: componentProps,
    initial: initialPreviewProps
  } = buildPreviewMeta(sourceCode, displayName, componentName, componentIndex);
  const [previewProps, setPreviewProps] = (0, import_react.useState)(initialPreviewProps);
  const [appliedPreviewKey, setAppliedPreviewKey] = (0, import_react.useState)(previewSourceKey);
  if (previewSourceKey !== appliedPreviewKey) {
    setAppliedPreviewKey(previewSourceKey);
    setPreviewProps(initialPreviewProps);
  }
  let t6;
  if ($[6] !== componentName || $[7] !== filePath || $[8] !== listFileVersions) {
    t6 = async () => {
      setIsLoading(true);
      const result = await listFileVersions(componentName, filePath);
      if (result.success) setVersions(result.versions);
      setIsLoading(false);
    };
    $[6] = componentName;
    $[7] = filePath;
    $[8] = listFileVersions;
    $[9] = t6;
  } else t6 = $[9];
  const fetchVersions = (0, import_react.useEffectEvent)(t6);
  let t7;
  if ($[10] !== fetchVersions) {
    t7 = () => {
      fetchVersions();
    };
    $[10] = fetchVersions;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if ($[12] !== componentName || $[13] !== filePath) {
    t8 = [componentName, filePath];
    $[12] = componentName;
    $[13] = filePath;
    $[14] = t8;
  } else t8 = $[14];
  (0, import_react.useEffect)(t7, t8);
  let t9;
  if ($[15] !== filePath || $[16] !== loadFile) {
    t9 = async () => {
      const result_0 = await loadFile(filePath);
      if (result_0.success && result_0.raw) setSourceCode(result_0.raw);
    };
    $[15] = filePath;
    $[16] = loadFile;
    $[17] = t9;
  } else t9 = $[17];
  const fetchCurrentFile = (0, import_react.useEffectEvent)(t9);
  let t10;
  if ($[18] !== fetchCurrentFile) {
    t10 = () => {
      fetchCurrentFile();
    };
    $[18] = fetchCurrentFile;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if ($[20] !== filePath) {
    t11 = [filePath];
    $[20] = filePath;
    $[21] = t11;
  } else t11 = $[21];
  (0, import_react.useEffect)(t10, t11);
  const fetchVersionContent = (0, import_react.useEffectEvent)(async cancelled => {
    setIsLoadingContent(true);
    setPreviewComp(null);
    let code;
    if (selectedVersion === null) {
      const result_1 = await loadFile(filePath);
      code = result_1.success && result_1.raw ? result_1.raw : "";
    } else {
      const result_2 = await getFileVersionContent(componentName, selectedVersion, filePath);
      code = result_2.success && result_2.content ? result_2.content : "";
    }
    if (cancelled()) return;
    setSourceCode(code);
    setIsLoadingContent(false);
    if (code && compilePreview) {
      setIsCompiling(true);
      try {
        const comp = await compilePreview(code, displayName, filePath);
        if (!cancelled()) setPreviewComp(() => comp);
      } catch {
        if (!cancelled()) setPreviewComp(null);
      }
      if (!cancelled()) setIsCompiling(false);
    }
  });
  let t12;
  if ($[22] !== fetchVersionContent) {
    t12 = () => {
      let cancelled_0 = false;
      fetchVersionContent(() => cancelled_0);
      return () => {
        cancelled_0 = true;
      };
    };
    $[22] = fetchVersionContent;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== componentName || $[25] !== displayName || $[26] !== filePath || $[27] !== selectedVersion) {
    t13 = [selectedVersion, filePath, componentName, displayName];
    $[24] = componentName;
    $[25] = displayName;
    $[26] = filePath;
    $[27] = selectedVersion;
    $[28] = t13;
  } else t13 = $[28];
  (0, import_react.useEffect)(t12, t13);
  const handleRestore = async versionFilename => {
    setIsRestoring(true);
    const result_3 = await restoreFileVersion(componentName, versionFilename, filePath);
    if (result_3.success) {
      toast.success(t("versionHistory.restored", { name: displayName }));
      onRestore(filePath);
      onClose();
    } else toast.error(t("versionHistory.restoreFailed", { error: result_3.error }));
    setIsRestoring(false);
  };
  let t14;
  if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = (name, value) => {
      setPreviewProps(prev => ({
        ...prev,
        [name]: value
      }));
    };
    $[29] = t14;
  } else t14 = $[29];
  const handlePropChange = t14;
  const T0 = Dialog;
  const t15 = true;
  let t16;
  if ($[30] !== onClose) {
    t16 = open => {
      if (!open) onClose();
    };
    $[30] = onClose;
    $[31] = t16;
  } else t16 = $[31];
  const T1 = DialogContent;
  const t17 = "min-w-[1100px] max-w-[1200px] w-[90vw] min-h-[500px] max-h-[80vh] h-[80vh] p-0 flex overflow-hidden";
  const t18 = false;
  const t19 = "flex-1 flex flex-col min-w-0";
  let t20;
  if ($[32] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = v => setActiveTab(v);
    $[32] = t20;
  } else t20 = $[32];
  let t21;
  if (true) {
    t21 = <TabsTrigger value="preview" className="text-xs px-3 py-1 h-6 gap-1.5">{<EyeIcon width={12} height={12} />}{t("versionHistory.preview")}</TabsTrigger>;
    $[33] = t21;
  } else t21 = $[33];
  let t22;
  if (true) {
    t22 = <TabsList variant="simple" className="h-7 gap-0 border-0">{t21}{<TabsTrigger value="code" className="text-xs px-3 py-1 h-6 gap-1.5">{<CodeIcon width={12} height={12} />}{t("versionHistory.code")}</TabsTrigger>}</TabsList>;
    $[34] = t22;
  } else t22 = $[34];
  let t23;
  if (true) {
    t23 = <Tabs value={activeTab} onValueChange={t20}>{t22}</Tabs>;
    $[35] = activeTab;
    $[36] = t23;
  } else t23 = $[36];
  let t24;
  if ($[37] !== filePath) {
    t24 = <Text$4 size="xs" variant="tertiary" className="truncate max-w-[300px]">{filePath}</Text$4>;
    $[37] = filePath;
    $[38] = t24;
  } else t24 = $[38];
  let t25;
  if ($[39] !== t23 || $[40] !== t24) {
    t25 = <div className="flex items-center gap-3">{t23}{t24}</div>;
    $[39] = t23;
    $[40] = t24;
    $[41] = t25;
  } else t25 = $[41];
  let t26;
  if (true) {
    t26 = selectedVersion !== null && <Button variant="default" size="sm" onClick={() => handleRestore(selectedVersion)} disabled={isRestoring} LeftIcon={ArrowCounterClockwiseIcon}>{t(isRestoring ? "versionHistory.restoring" : "versionHistory.restoreThis")}</Button>;
    $[42] = handleRestore;
    $[43] = isRestoring;
    $[44] = selectedVersion;
    $[45] = t26;
  } else t26 = $[45];
  let t27;
  if ($[46] !== t25 || $[47] !== t26) {
    t27 = <div className="flex items-center justify-between px-4 py-2.5 border-b border-ed-border">{t25}{t26}</div>;
    $[46] = t25;
    $[47] = t26;
    $[48] = t27;
  } else t27 = $[48];
  const t28 = activeTab === "preview" && componentProps.length > 0 && <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-border bg-ed-muted/20 overflow-x-auto">{componentProps.map(prop => {
      const value_0 = previewProps[prop.name];
      const propType = String(prop.type || "");
      const isBoolean = typeof value_0 === "boolean" || typeof prop.defaultValue === "boolean" || propType.includes("boolean");
      const isNumber = typeof value_0 === "number" || typeof prop.defaultValue === "number" || /number/.test(propType) && !propType.includes("string");
      const options = prop.options;
      if (isBoolean) return <Badge key={prop.name} variant={value_0 ? "default" : "outline"} className="text-[11px]" onClick={() => handlePropChange(prop.name, !value_0)}>{prop.name}: {String(value_0 ?? false)}</Badge>;
      if (options && options.length > 0) return <div key={prop.name} className="flex items-center gap-1">{<Text$4 size="3xs" variant="tertiary">{prop.name}:</Text$4>}{options.map(opt => <Badge key={opt} variant={value_0 === opt ? "default" : "outline"} className="text-[11px]" onClick={() => handlePropChange(prop.name, opt)}>{opt}</Badge>)}</div>;
      if (isNumber) return <div key={prop.name} className="flex items-center gap-1">{<Text$4 size="3xs" variant="tertiary">{prop.name}:</Text$4>}{<input type="number" className="text-[11px] px-2 py-0.5 rounded-full border border-ed-border bg-transparent text-ed-foreground w-16 focus:outline-none focus:border-ed-ring" value={value_0 === void 0 || value_0 === null ? "" : String(value_0)} onChange={e => {
          const next = e.target.value;
          handlePropChange(prop.name, next === "" ? 0 : Number(next));
        }} />}</div>;
      if (typeof value_0 === "string" || typeof prop.defaultValue === "string" || propType.includes("string") || value_0 === void 0 || value_0 === null) {
        if (value_0 !== null && typeof value_0 === "object") return null;
        return <div key={prop.name} className="flex items-center gap-1">{<Text$4 size="3xs" variant="tertiary">{prop.name}:</Text$4>}{<input className="text-[11px] px-2 py-0.5 rounded-full border border-ed-border bg-transparent text-ed-foreground w-24 focus:outline-none focus:border-ed-ring" value={String(value_0 ?? prop.defaultValue ?? "")} onChange={e_0 => handlePropChange(prop.name, e_0.target.value)} />}</div>;
      }
      return null;
    })}</div>;
  let t29;
  if (true) {
    t29 = <div className="flex-1 min-h-0 overflow-hidden">{isLoadingContent || isCompiling ? <div className="flex items-center justify-center h-full">{<Text$4 size="sm" variant="tertiary">{t(isCompiling ? "versionHistory.loadingPreview" : "versionHistory.loading")}</Text$4>}</div> : activeTab === "preview" ? <div className="h-full flex items-start justify-center p-8 overflow-auto bg-[#fafafa]">{PreviewComp ? <PreviewErrorBoundary key={selectedVersion || "current"} unavailableLabel={t("versionHistory.unavailable")}>{<div className="max-w-full">{<PreviewComp {...previewProps} />}</div>}</PreviewErrorBoundary> : <div className="flex items-center justify-center h-full">{<Text$4 size="sm" variant="tertiary">{t(compilePreview ? "versionHistory.compileFailed" : "versionHistory.unavailable")}</Text$4>}</div>}</div> : <ReactCodeMirror value={sourceCode || t("versionHistory.noCode")} height="100%" className={`${CODE_EDITOR_CLASS} h-full`} extensions={editorExtensions} editable={false} basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: false,
        highlightActiveLine: false,
        foldGutter: true
      }} />}</div>;
    $[49] = PreviewComp;
    $[50] = activeTab;
    $[51] = compilePreview;
    $[52] = editorExtensions;
    $[53] = isCompiling;
    $[54] = isLoadingContent;
    $[55] = previewProps;
    $[56] = selectedVersion;
    $[57] = sourceCode;
    $[58] = t29;
  } else t29 = $[58];
  let t30;
  if ($[59] !== t27 || $[60] !== t28 || $[61] !== t29) {
    t30 = <div className={t19}>{t27}{t28}{t29}</div>;
    $[59] = t27;
    $[60] = t28;
    $[61] = t29;
    $[62] = t30;
  } else t30 = $[62];
  let t31;
  if (true) {
    t31 = <Text$4 size="sm" weight="semibold">{t("versionHistory.title")}</Text$4>;
    $[63] = t31;
  } else t31 = $[63];
  let t32;
  if (true) {
    t32 = <div className="flex items-center justify-between px-4 py-2.5 border-b border-ed-border">{t31}{<Button variant="ghost" size="xs" onClick={onClose} LeftIcon={XIcon} />}</div>;
    $[64] = onClose;
    $[65] = t32;
  } else t32 = $[65];
  let t33;
  if (true) {
    t33 = <ScrollArea className="flex-1">{isLoading ? <div className="p-4">{<Text$4 size="sm" variant="tertiary">{t("versionHistory.loadingVersions")}</Text$4>}</div> : <div className="py-1">{<button className={`w-full text-left px-4 py-3 hover:bg-ed-muted/50 ${selectedVersion === null ? "bg-ed-muted/70" : ""}`} onClick={() => setSelectedVersion(null)}>{<div className="flex items-center justify-between">{<Text$4 size="xs" weight="medium">{t("versionHistory.currentVersion")}</Text$4>}{selectedVersion === null && <Badge variant="secondary" className="text-[10px]">{t("versionHistory.current")}</Badge>}</div>}</button>}{versions.length === 0 ? <div className="px-4 py-3">{<Text$4 size="xs" variant="tertiary">{t("versionHistory.empty")}</Text$4>}</div> : versions.map(version => {
          const date = new Date(version.createdAt);
          const timeAgo = formatRelativeTime(date, locale);
          const isSelected = selectedVersion === version.filename;
          return <button key={version.filename} className={`w-full text-left px-4 py-3 hover:bg-ed-muted/50 ${isSelected ? "bg-ed-muted/70" : ""}`} onClick={() => setSelectedVersion(version.filename)}>{<div className="flex items-center justify-between gap-2">{<Text$4 size="xs" weight="medium">{timeAgo}</Text$4>}{<div className="flex items-center gap-2 shrink-0">{<Text$4 size="xs" variant="tertiary">{formatLocalizedDate(date, locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text$4>}{isSelected && <Button variant="default" size="xs" onClick={e_1 => {
                  e_1.stopPropagation();
                  handleRestore(version.filename);
                }} disabled={isRestoring}>{t("versionHistory.restore")}</Button>}</div>}</div>}</button>;
        })}</div>}</ScrollArea>;
    $[66] = handleRestore;
    $[67] = isLoading;
    $[68] = isRestoring;
    $[69] = selectedVersion;
    $[70] = setSelectedVersion;
    $[71] = versions;
    $[72] = t33;
  } else t33 = $[72];
  let t34;
  if ($[73] !== t32 || $[74] !== t33) {
    t34 = <div className="w-[280px] border-l border-ed-border flex flex-col shrink-0">{t32}{t33}</div>;
    $[73] = t32;
    $[74] = t33;
    $[75] = t34;
  } else t34 = $[75];
  let t35;
  if ($[76] !== T1 || $[77] !== t30 || $[78] !== t34) {
    t35 = <T1 className={t17} showCloseButton={t18}>{t30}{t34}</T1>;
    $[76] = T1;
    $[77] = t30;
    $[78] = t34;
    $[79] = t35;
  } else t35 = $[79];
  let t36;
  if ($[80] !== T0 || $[81] !== t16 || $[82] !== t35) {
    t36 = <T0 open={t15} onOpenChange={t16}>{t35}</T0>;
    $[80] = T0;
    $[81] = t16;
    $[82] = t35;
    $[83] = t36;
  } else t36 = $[83];
  return t36;
}

export { VersionHistoryModal };
