/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/BottomBar.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

import { useEditorMode } from "../../shared/contexts/EditorModeContext";
import { createVersionedSaveQueue } from "../utils/versionedSaveQueue";
import { measureCanvasWork } from "../../canvas/lib/canvasPerformance";
import { useBackendOptional } from "../../backends/BackendContext";
import { isPlanLimitError } from "../../backends/planLimits";
import { useAssetResolver } from "../../shared/contexts/AssetContext";
import { GLOBAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { useGlobalShortcut } from "../../shared/shortcuts/useGlobalShortcut";
import { useSelectionJsxEditor } from "../hooks/useSelectionJsxEditor";
import { CODE_EDITOR_CLASS, CODE_EDITOR_THEME, useCodeEditorFontStyles } from "../utils/codeEditorTheme";
import { EditorFileBreadcrumb, buildFileBreadcrumbItems } from "../utils/editorBreadcrumb";
import { EditorStatusBar } from "./EditorStatusBar";
import { DARK_TERMINAL_THEME, LIGHT_TERMINAL_THEME, TerminalPanel } from "./panels/TerminalPanel";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView as EditorView$1 } from "@codemirror/view";
import { generateCompleteFile, getById } from "@bingo/compiler";
import { useVariableSnapshot } from "../../shared/theme/VariableContext";
import { ArrowCounterClockwiseIcon, BookOpenIcon, BracketsCurlyIcon, Button, CheckIcon, ClockIcon, CopyIcon, CursorIcon, FloppyDiskIcon, Kbd, PlusIcon, Tabs, TabsList, TabsTrigger, TerminalIcon, Text$4, Tooltip, TooltipContent, TooltipTrigger, XIcon, useIsDark } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { FileTs as c$10 } from "@phosphor-icons/react/dist/icons/FileTs";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { RetainedCodeEditor } from "./RetainedCodeEditor";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var STORE_DEBUG_ENABLED = false;
var PROJECT_CSS_ENTRY_CANDIDATES = ["app/globals.css", "src/app/globals.css", "src/globals.css", "styles/globals.css", "src/index.css", "src/styles.css"];
var DEFAULT_USER_CSS_PATH = "styles.css";
const CODE_EDITOR_SETUP = { lineNumbers: true, highlightActiveLineGutter: false, highlightActiveLine: false, foldGutter: false };
function WithTooltip(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const {
    label,
    children
  } = t0;
  let t1;
  if ($[0] !== children) {
    t1 = <TooltipTrigger asChild={true}>{children}</TooltipTrigger>;
    $[0] = children;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== label) {
    t2 = <TooltipContent side="top" sideOffset={4}>{label}</TooltipContent>;
    $[2] = label;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <Tooltip>{t1}{t2}</Tooltip>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
function dirname(path) {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}
function relativeCssImport(fromCssPath, toCssPath) {
  const fromParts = dirname(fromCssPath).split("/").filter(Boolean);
  const toParts = toCssPath.split("/").filter(Boolean);
  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  const rel = [...fromParts.map(() => ".."), ...toParts].join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}
function addCssImport(css, importPath) {
  const importLine = `@import "${importPath}";`;
  if (css.includes(importLine) || css.includes(`@import '${importPath}';`)) return css;
  const lines = css.split("\n");
  let insertAt = 0;
  while (insertAt < lines.length && /^\s*@import\b/.test(lines[insertAt])) insertAt++;
  lines.splice(insertAt, 0, importLine);
  return lines.join("\n");
}
function isProjectCssEntry(path) {
  return PROJECT_CSS_ENTRY_CANDIDATES.includes(path);
}
function pickCssFileToEdit(files, currentPath, keepCurrent) {
  if (keepCurrent && currentPath && files.includes(currentPath)) return currentPath;
  if (files.includes(DEFAULT_USER_CSS_PATH)) return DEFAULT_USER_CSS_PATH;
  const userCss = files.find(path => !isProjectCssEntry(path));
  if (userCss) return userCss;
  if (keepCurrent && currentPath) return currentPath;
  return DEFAULT_USER_CSS_PATH;
}
const EMPTY_COMPONENTS = {};
function BottomBar({
  onSaveSuccess,
  onSaveStart,
  onSaveEnd,
  onOpenVersionHistory,
  readOnly = false,
  selectedElementId,
  documentId,
  onRevealDraft,
  store,
  enableCssEditor = false,
  componentIndex = {},
  components,
  iconLibraries = {},
  onReplaceElement,
  onPreviewElement,
  onClearPreview,
  openFiles,
  onCloseFile,
  activateFile,
  onSaveFile,
  openSkills,
  onCloseSkill,
  activateSkill,
  onSaveSkill
}) {
  const { t } = useTranslation("editor");
  const backend = useBackendOptional();
  const isDark = useIsDark();
  useCodeEditorFontStyles();
  const [saveStatus, setSaveStatus] = (0, import_react.useState)("idle");
  const [activeCodeTab, setActiveCodeTab] = (0, import_react.useState)("selection");
  const [hasTerminal] = (0, import_react.useState)(() => typeof window !== "undefined" && !!window.api);
  const [terminalTabs, setTerminalTabs] = (0, import_react.useState)(() => typeof window !== "undefined" && !!window.api ? [{
    id: `tt-${Date.now().toString(36)}-1`,
    num: 1
  }] : []);
  const nextTermNumRef = (0, import_react.useRef)(2);
  (0, import_react.useEffect)(() => {
    if (!hasTerminal) return;
    const openConnections = () => {
      const num = nextTermNumRef.current++;
      const id = `tt-${Date.now().toString(36)}-${num}`;
      setTerminalTabs(tabs => [...tabs, {
        id,
        num,
        label: "Connections",
        initialCommand: "claude /mcp"
      }]);
      setActiveCodeTab(id);
    };
    window.addEventListener("bingo-manage-connections", openConnections);
    return () => window.removeEventListener("bingo-manage-connections", openConnections);
  }, [hasTerminal]);
  const addTerminalTab = () => {
    const num_0 = nextTermNumRef.current++;
    const tab = {
      id: `tt-${Date.now().toString(36)}-${num_0}`,
      num: num_0
    };
    setTerminalTabs(prev => [...prev, tab]);
    setActiveCodeTab(tab.id);
  };
  const closeTerminalTab = id_0 => {
    if (terminalTabs.length <= 1) return;
    const idx = terminalTabs.findIndex(t => t.id === id_0);
    if (idx === -1) return;
    const next = terminalTabs.filter(t_0 => t_0.id !== id_0);
    setTerminalTabs(next);
    if (activeCodeTab === id_0) setActiveCodeTab(next[Math.max(0, idx - 1)].id);
  };
  const isTerminalActive = terminalTabs.some(t_1 => t_1.id === activeCodeTab);
  const [cssFiles, setCssFiles] = (0, import_react.useState)([]);
  const [cssFilesLoaded, setCssFilesLoaded] = (0, import_react.useState)(false);
  const [selectedCssPath, setSelectedCssPath] = (0, import_react.useState)(DEFAULT_USER_CSS_PATH);
  const [cssCode, setCssCode] = (0, import_react.useState)("");
  const [cssLoadedPath, setCssLoadedPath] = (0, import_react.useState)(null);
  const [isLoadingCss, setIsLoadingCss] = (0, import_react.useState)(false);
  const [isSavingCss, setIsSavingCss] = (0, import_react.useState)(false);
  const [cssDirty, setCssDirty] = (0, import_react.useState)(false);
  const cssDraftsRef = import_react.useRef(new Map());
  const [cssError, setCssError] = (0, import_react.useState)(null);
  const [copiedKind, setCopiedKind] = (0, import_react.useState)(null);
  const assetResolver = useAssetResolver();
  const variables = useVariableSnapshot();
  const { mode, setMode } = useEditorMode();
  const hasSelectedElement = !!selectedElementId && !!getById(store, selectedElementId);
  const buildSelectedElementCode = import_react.useCallback(() => {
    if (!selectedElementId) return t("bottomBar.selectElement");
    if (!hasSelectedElement) return t("bottomBar.elementNotFound");
    return measureCanvasWork("codegen", () => generateCompleteFile({
      componentName: "NewComponent",
      store,
      rootId: selectedElementId,
      variableLibrary: variables?.library,
      variablePageModes: store.variableModes ?? variables?.defaultModes,
      componentIndex,
      includeReactImport: false,
      assetResolver
    }));
  }, [selectedElementId, hasSelectedElement, store, componentIndex, assetResolver, t, variables?.library, variables?.defaultModes]);
  const showSelectionCode = mode === "dev" && activeCodeTab === "selection";
  const selectedElementCode = import_react.useMemo(() => showSelectionCode ? buildSelectedElementCode() : "", [showSelectionCode, buildSelectedElementCode]);
  const selection = useSelectionJsxEditor({
    documentId,
    active: showSelectionCode,
    selectedElementId,
    selectedElementSnippet: selectedElementCode,
    store,
    iconLibraries,
    components: components ?? EMPTY_COMPONENTS,
    onPreviewElement,
    onClearPreview,
    onReplaceElement
  });
  const writeToClipboard = async text => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };
  const copiedTimerRef = (0, import_react.useRef)(null);
  const flashCopied = kind => {
    setCopiedKind(kind);
    if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopiedKind(null), 1500);
  };
  (0, import_react.useEffect)(() => () => {
    if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current);
  }, []);
  (0, import_react.useEffect)(() => {
    const onCss = event => {
      if (!enableCssEditor) return;
      const path = event.detail?.path;
      if (path) {
        setSelectedCssPath(path);
        setCssLoadedPath(null);
        setCssDirty(false);
      }
      setActiveCodeTab("css");
    };
    window.addEventListener("bingo-open-css-editor", onCss);
    return () => {
      window.removeEventListener("bingo-open-css-editor", onCss);
    };
  }, [enableCssEditor]);
  (0, import_react.useEffect)(() => {
    if (!enableCssEditor && activeCodeTab === "css") setActiveCodeTab("selection");
  }, [activeCodeTab, enableCssEditor]);
  (0, import_react.useEffect)(() => {
    if (activeCodeTab === "store") setActiveCodeTab("selection");
  }, [activeCodeTab]);
  const cmRef = (0, import_react.useRef)(null);
  const pendingScrollLineRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (activateFile) {
      setActiveCodeTab(`file:${activateFile.path}`);
      pendingScrollLineRef.current = activateFile.line ?? null;
    }
  }, [activateFile]);
  (0, import_react.useEffect)(() => {
    if (activateSkill) setActiveCodeTab(`skill:${activateSkill.name}`);
  }, [activateSkill]);
  (0, import_react.useEffect)(() => {
    if (!activeCodeTab.startsWith("file:")) return;
    const path_0 = activeCodeTab.slice(5);
    if (!(openFiles || []).some(f => f.path === path_0)) setActiveCodeTab("selection");
  }, [openFiles, activeCodeTab]);
  (0, import_react.useEffect)(() => {
    if (!activeCodeTab.startsWith("skill:")) return;
    const name = activeCodeTab.slice(6);
    if (!(openSkills || []).some(s => s.name === name)) setActiveCodeTab("selection");
  }, [openSkills, activeCodeTab]);
  const activeOpenFile = (openFiles || []).find(f_0 => activeCodeTab === `file:${f_0.path}`);
  const activeOpenSkill = (openSkills || []).find(s_0 => activeCodeTab === `skill:${s_0.name}`);
  const [fileDrafts, setFileDrafts] = (0, import_react.useState)({});
  const [skillDrafts, setSkillDrafts] = (0, import_react.useState)({});
  const [savingFile, setSavingFile] = (0, import_react.useState)(false);
  const [savingSkill, setSavingSkill] = (0, import_react.useState)(false);
  const [cursorLine, setCursorLine] = (0, import_react.useState)(1);
  const activeFileValue = activeOpenFile ? fileDrafts[activeOpenFile.path] ?? activeOpenFile.content : "";
  const activeSkillValue = activeOpenSkill ? skillDrafts[activeOpenSkill.name] ?? activeOpenSkill.content : "";
  const activeFileDirty = !!activeOpenFile && fileDrafts[activeOpenFile.path] !== void 0 && fileDrafts[activeOpenFile.path] !== activeOpenFile.content;
  const activeSkillDirty = !!activeOpenSkill && skillDrafts[activeOpenSkill.name] !== void 0 && skillDrafts[activeOpenSkill.name] !== activeOpenSkill.content;
  const codeStateRef = import_react.useRef(null);
  import_react.useLayoutEffect(() => {
    codeStateRef.current = { fileDrafts, skillDrafts, cssCode, cssDirty, selectedCssPath,
      selection, onSaveFile, onSaveSkill, backend };
  });
  const codeSaveRef = import_react.useRef(null);
  const codeSaves = import_react.useMemo(() => createVersionedSaveQueue({
    delayMs: 0,
    equal: (a, b) => a.content === b.content && a.kind === b.kind,
    save: (_key, snapshot) => codeSaveRef.current(snapshot)
  }), []);
  import_react.useLayoutEffect(() => {
    codeSaveRef.current = async ({ kind, path, content }) => {
      const runtime = codeStateRef.current;
      if (kind === "file") {
        if (!runtime.onSaveFile) throw new Error(t("bottomBar.saveUnavailable"));
        await runtime.onSaveFile(path, content);
        setFileDrafts(current => {
          if (current[path] !== content) return current;
          const next = { ...current }; delete next[path]; return next;
        });
        onSaveSuccess?.(path);
      } else if (kind === "skill") {
        if (!runtime.onSaveSkill) throw new Error(t("bottomBar.saveUnavailable"));
        await runtime.onSaveSkill(path, content);
        setSkillDrafts(current => {
          if (current[path] !== content) return current;
          const next = { ...current }; delete next[path]; return next;
        });
      } else {
        await runtime.backend.writeFileRaw(path, content);
        if (cssDraftsRef.current.get(path) === content) cssDraftsRef.current.delete(path);
        const current = codeStateRef.current;
        if (current.selectedCssPath === path && current.cssCode === content) {
          setCssLoadedPath(path); setCssDirty(false);
        }
      }
    };
  });
  import_react.useEffect(() => () => codeSaves.dispose(), [codeSaves]);
  const saveCode = async (kind, path, content) => {
    codeSaves.update(`${kind === "skill" ? "skill" : "file"}:${path}`, { kind, path, content });
    await codeSaves.flush();
  };
  const handleSaveOpenFile = async () => {
    if (!activeOpenFile || !onSaveFile || readOnly) return;
    setSavingFile(true); onSaveStart?.();
    try {
      await saveCode("file", activeOpenFile.path, fileDrafts[activeOpenFile.path] ?? activeOpenFile.content);
      onSaveEnd?.(true);
    } catch (error) { onSaveEnd?.(false, error instanceof Error ? error.message : String(error)); }
    finally { setSavingFile(false); }
  };
  const handleSaveOpenSkill = async () => {
    if (!activeOpenSkill || !onSaveSkill || readOnly) return;
    setSavingSkill(true);
    try {
      await saveCode("skill", activeOpenSkill.name, skillDrafts[activeOpenSkill.name] ?? activeOpenSkill.content);
      setSaveStatus("success");
    } catch { setSaveStatus("error"); }
    finally { setSavingSkill(false); }
  };
  const closeSourceTab = async (kind, path) => {
    try {
      let savedContent;
      // Typing remains possible while the backend write is in flight. Drain
      // newer text before closing, even if the previous save just succeeded.
      while (true) {
        const drafts = kind === "skill" ? codeStateRef.current.skillDrafts : codeStateRef.current.fileDrafts;
        if (drafts[path] === undefined || drafts[path] === savedContent) break;
        savedContent = drafts[path];
        await saveCode(kind, path, savedContent);
      }
      await codeSaves.remove(`${kind === "skill" ? "skill" : "file"}:${path}`);
      if (kind === "skill") onCloseSkill?.(path); else onCloseFile?.(path);
    } catch (error) {
      setCssError(error instanceof Error ? error.message : String(error)); setSaveStatus("error");
    }
  };
  import_react.useEffect(() => {
    if (readOnly) return;
    const prepare = event => {
      const flush = async () => {
        const submitted = new Map();
        while (true) {
          const current = codeStateRef.current;
          if (current.selection.pendingDraft) {
            setMode("dev"); setActiveCodeTab("selection");
            onRevealDraft?.(...current.selection.pendingDraft);
            throw new Error(t("bottomBar.unappliedDraft"));
          }
          const pending = new Map();
          for (const [path, content] of Object.entries(current.fileDrafts))
            pending.set(`file:${path}`, { kind: "file", path, content });
          for (const [path, content] of Object.entries(current.skillDrafts))
            pending.set(`skill:${path}`, { kind: "skill", path, content });
          for (const [path, content] of cssDraftsRef.current)
            pending.set(`file:${path}`, { kind: "css", path, content });
          let changed = false;
          for (const [key, snapshot] of pending) {
            if (submitted.get(key) === snapshot.content) continue;
            submitted.set(key, snapshot.content);
            codeSaves.update(key, snapshot);
            changed = true;
          }
          if (!changed && !codeSaves.hasPending()) return;
          await codeSaves.flush();
        }
      };
      event.detail.pending.push(flush());
    };
    window.addEventListener("bingo:prepare-project-close", prepare);
    return () => window.removeEventListener("bingo:prepare-project-close", prepare);
  }, [codeSaves, readOnly, t, setMode, onRevealDraft]);
  (0, import_react.useEffect)(() => {
    if (!activeOpenFile || readOnly) return;
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSaveOpenFile();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeOpenFile, readOnly, handleSaveOpenFile]);
  (0, import_react.useEffect)(() => {
    if (!activeOpenSkill || readOnly) return;
    const onKey_0 = e_0 => {
      if ((e_0.metaKey || e_0.ctrlKey) && !e_0.shiftKey && e_0.key.toLowerCase() === "s") {
        e_0.preventDefault();
        e_0.stopPropagation();
        handleSaveOpenSkill();
      }
    };
    window.addEventListener("keydown", onKey_0, true);
    return () => window.removeEventListener("keydown", onKey_0, true);
  }, [activeOpenSkill, readOnly, handleSaveOpenSkill]);
  (0, import_react.useEffect)(() => {
    setCursorLine(1);
  }, [activeOpenFile?.path, activeOpenSkill?.name, activeCodeTab]);
  const copySelection = async () => {
    if (!hasSelectedElement) return;
    // Copy remains available while the code pane is hidden. Preserve a dirty draft.
    await writeToClipboard(selection.dirty ? selection.draft : showSelectionCode ? selectedElementCode : buildSelectedElementCode());
    flashCopied("selection");
  };
  const copySourceFile = async () => {
    if (!activeOpenFile) return;
    await writeToClipboard(activeFileValue);
    flashCopied("source");
  };
  const copyCode = async () => {
    if (activeOpenFile) {
      await copySourceFile();
      return;
    }
    await copySelection();
  };
  useGlobalShortcut("copySelectionAsJsx", e_1 => {
    e_1.preventDefault();
    copyCode();
  }, !!activeOpenFile || hasSelectedElement && true);
  const refreshCssFiles = (0, import_react.useCallback)(async () => {
    if (!backend || !enableCssEditor) return;
    const files = await backend.listFiles("", ".css");
    const sorted = [...new Set(files)].sort();
    setCssFiles(sorted);
    setCssFilesLoaded(true);
    if (!cssDirty) setSelectedCssPath(current => pickCssFileToEdit(sorted, current, true));
  }, [backend, cssDirty, enableCssEditor]);
  (0, import_react.useEffect)(() => {
    refreshCssFiles();
  }, [refreshCssFiles]);
  (0, import_react.useEffect)(() => {
    if (!enableCssEditor || !backend || activeCodeTab !== "css" || !selectedCssPath) return;
    if (cssDirty && cssLoadedPath === selectedCssPath) return;
    if (cssDraftsRef.current.has(selectedCssPath)) {
      setCssCode(cssDraftsRef.current.get(selectedCssPath));
      setCssLoadedPath(selectedCssPath); setCssDirty(true); setIsLoadingCss(false);
      return;
    }
    let cancelled = false;
    const loadCss = async () => {
      setIsLoadingCss(true);
      setCssError(null);
      try {
        const raw = await backend.readFileRaw(selectedCssPath);
        if (cancelled) return;
        setCssCode(raw ?? "");
        setCssLoadedPath(selectedCssPath);
        setCssDirty(false);
      } catch (err_0) {
        if (cancelled) return;
        setCssCode("");
        setCssLoadedPath(selectedCssPath);
        setCssDirty(false);
        setCssError(err_0 instanceof Error ? err_0.message : String(err_0));
      } finally {
        if (!cancelled) setIsLoadingCss(false);
      }
    };
    loadCss();
    return () => {
      cancelled = true;
    };
  }, [backend, activeCodeTab, selectedCssPath, cssDirty, cssLoadedPath, enableCssEditor]);
  const ensureCssFileImported = (0, import_react.useCallback)(async path_2 => {
    if (!backend || isProjectCssEntry(path_2)) return;
    const files_0 = await backend.listFiles("", ".css");
    const globalsPath = PROJECT_CSS_ENTRY_CANDIDATES.find(candidate => files_0.includes(candidate)) ?? "app/globals.css";
    let globalsCss = "";
    try {
      globalsCss = await backend.readFileRaw(globalsPath);
    } catch {
      globalsCss = "@import \"tailwindcss\";\n";
    }
    const nextGlobalsCss = addCssImport(globalsCss, relativeCssImport(globalsPath, path_2));
    if (nextGlobalsCss !== globalsCss) await backend.writeFileRaw(globalsPath, nextGlobalsCss);
  }, [backend]);
  const createCssFile = (0, import_react.useCallback)(async (rawPath, content_1) => {
    if (!backend || readOnly || !enableCssEditor) return;
    let path_3 = (rawPath ?? selectedCssPath).trim() || DEFAULT_USER_CSS_PATH;
    if (!path_3.endsWith(".css")) path_3 += ".css";
    setIsSavingCss(true);
    setCssError(null);
    try {
      const starter = content_1 ?? "";
      await backend.writeFileRaw(path_3, starter);
      await ensureCssFileImported(path_3);
      setSelectedCssPath(path_3);
      setCssCode(starter);
      setCssLoadedPath(path_3);
      setCssDirty(false);
      await refreshCssFiles();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2e3);
    } catch (err_1) {
      if (isPlanLimitError(err_1)) return;
      setCssError(err_1 instanceof Error ? err_1.message : String(err_1));
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3e3);
    } finally {
      setIsSavingCss(false);
    }
  }, [backend, readOnly, selectedCssPath, ensureCssFileImported, refreshCssFiles, enableCssEditor]);
  (0, import_react.useEffect)(() => {
    if (!enableCssEditor || !backend || readOnly || activeCodeTab !== "css" || !cssFilesLoaded || cssDirty) return;
    if (cssFiles.some(path_4 => !isProjectCssEntry(path_4))) return;
    createCssFile(DEFAULT_USER_CSS_PATH);
  }, [backend, readOnly, activeCodeTab, cssFilesLoaded, cssDirty, cssFiles, createCssFile, enableCssEditor]);
  const handleCreateCssFile = async () => {
    const content_2 = cssLoadedPath === selectedCssPath && cssCode.trim() ? cssCode : void 0;
    await createCssFile(selectedCssPath, content_2);
  };
  const handleSaveCssFile = async () => {
    if (!backend || readOnly || !enableCssEditor || !selectedCssPath) return;
    setIsSavingCss(true); setCssError(null);
    try {
      await saveCode("css", selectedCssPath, cssCode);
      setSaveStatus("success");
    } catch (error) {
      if (isPlanLimitError(error)) return;
      setCssError(error instanceof Error ? error.message : String(error));
      setSaveStatus("error");
    } finally { setIsSavingCss(false); }
  };
  const canEditSource = !readOnly && !!activeOpenFile && !!onSaveFile;
  const canEditSkill = !readOnly && !!activeOpenSkill && !!onSaveSkill;
  const isCssActive = enableCssEditor && activeCodeTab === "css";
  const selectedCssFileExists = cssFiles.includes(selectedCssPath.trim());
  const canCreateSelectedCssFile = isCssActive && !selectedCssFileExists && selectedCssPath.trim().length > 0;
  const breadcrumbItems = activeOpenFile ? buildFileBreadcrumbItems(activeOpenFile.path, activeFileValue, cursorLine, activeOpenFile.componentName) : [];
  const activeSurface = isCssActive ? {
    value: cssCode,
    language: "css",
    editable: !readOnly,
    onChange: value => {
      cssDraftsRef.current.set(selectedCssPath, value);
      setCssCode(value);
      setCssDirty(true);
    }
  } : activeOpenSkill ? {
    value: activeSkillValue,
    language: "markdown",
    editable: canEditSkill,
    onChange: value_0 => setSkillDrafts(d_1 => ({
      ...d_1,
      [activeOpenSkill.name]: value_0
    })),
    commit: () => void handleSaveOpenSkill()
  } : activeOpenFile ? {
    value: activeFileValue,
    language: activeOpenFile.path.endsWith(".css") ? "css" : activeOpenFile.path.endsWith(".md") ? "markdown" : "jsx",
    editable: !readOnly && !!onSaveFile,
    onChange: value_1 => setFileDrafts(d_2 => ({
      ...d_2,
      [activeOpenFile.path]: value_1
    })),
    commit: () => void handleSaveOpenFile()
  } : activeCodeTab === "selection" ? {
    value: selectedElementId ? selection.draft : selectedElementCode,
    language: "jsx",
    editable: !readOnly && !!selectedElementId,
    onChange: selection.onChange,
    commit: selection.apply,
    commitOnBlur: true
  } : {
    value: t("bottomBar.noCode"),
    language: "jsx",
    editable: false,
    onChange: () => {}
  };
  const editorExtensions = (0, import_react.useMemo)(() => [...(activeSurface.language === "css" ? [css()] : activeSurface.language === "markdown" ? [markdown()] : [javascript({
    jsx: true
  })]), isDark ? githubDark : githubLight, CODE_EDITOR_THEME, EditorView$1.updateListener.of(update => {
    if (!update.selectionSet && !update.docChanged) return;
    const line = update.state.doc.lineAt(update.state.selection.main.head).number;
    setCursorLine(line);
  })], [activeSurface.language, isDark]);
  const status = activeCodeTab === "selection" && selection.error ? {
    kind: "error",
    message: selection.error
  } : saveStatus === "error" && cssError ? {
    kind: "error",
    message: cssError
  } : saveStatus === "success" ? {
    kind: "success",
    message: t("bottomBar.saved")
  } : activeCodeTab === "selection" && selection.previewUnapplied ? {
    kind: "hint",
    message: t("bottomBar.previewPaused")
  } : null;
  (0, import_react.useEffect)(() => {
    if (mode !== "dev" || isTerminalActive || pendingScrollLineRef.current == null || !activeOpenFile) return;
    const line_0 = pendingScrollLineRef.current;
    const t_2 = setTimeout(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      const total = view.state.doc.lines;
      const pos = view.state.doc.line(Math.min(Math.max(1, line_0), total)).from;
      view.dispatch({
        selection: {
          anchor: pos
        },
        effects: EditorView$1.scrollIntoView(pos, {
          y: "center"
        })
      });
      pendingScrollLineRef.current = null;
    }, 60);
    return () => clearTimeout(t_2);
  }, [mode, isTerminalActive, activeSurface.value, activeCodeTab, activeOpenFile, activateFile?.n]);
  const tabsScrollRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const container = tabsScrollRef.current;
    if (!container) return;
    container.querySelector("[data-state=\"active\"]")?.scrollIntoView({
      inline: "nearest",
      block: "nearest"
    });
  }, [activeCodeTab]);
  return <div className="h-full flex flex-col bg-ed-background">{<div className="flex items-center gap-2 border-b border-ed-border bg-ed-muted/30 px-2 py-1">{<div ref={tabsScrollRef} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:thin]">{<Tabs value={activeCodeTab} onValueChange={setActiveCodeTab} className="shrink-0">{<TabsList variant="simple" className="h-7 w-max min-w-max gap-0 border-0">{STORE_DEBUG_ENABLED}{<TabsTrigger value="selection" className="text-xs px-3 py-1 h-6 gap-1.5">{<CursorIcon width={12} height={12} />}{t("bottomBar.selection")}</TabsTrigger>}{enableCssEditor && <TabsTrigger value="css" className="text-xs px-3 py-1 h-6 gap-1.5">{<BracketsCurlyIcon width={12} height={12} />}CSS</TabsTrigger>}{(openFiles || []).map(f_1 => {
              const id_1 = `file:${f_1.path}`;
              const label = f_1.path.split("/").pop() || f_1.path;
              return <Tooltip key={id_1} content={f_1.path}>{<TabsTrigger value={id_1} className="group h-6 gap-1.5 px-3 py-1 text-xs text-ed-muted-foreground data-[state=active]:text-ed-foreground">{(0, import_jsx_runtime.jsx)(c$10, {
                    size: 12,
                    weight: "bold"
                  })}{label}{<span role="button" tabIndex={-1} aria-label={`Close ${label}`} onMouseDown={e_2 => e_2.stopPropagation()} onClick={e_3 => {
                    e_3.stopPropagation();
                    void closeSourceTab("file", f_1.path);
                  }} className="inline-flex size-2.5 items-center justify-center rounded text-ed-muted-foreground hover:bg-ed-muted hover:text-ed-foreground">{<XIcon className="size-2.5" />}</span>}</TabsTrigger>}</Tooltip>;
            })}{(openSkills || []).map(s_1 => {
              const id_2 = `skill:${s_1.name}`;
              return <Tooltip key={id_2} content={s_1.name}>{<TabsTrigger value={id_2} className="group h-6 gap-1.5 px-3 py-1 text-xs text-ed-muted-foreground data-[state=active]:text-ed-foreground">{<BookOpenIcon width={12} height={12} />}{s_1.name}{<span role="button" tabIndex={-1} aria-label={`Close ${s_1.name}`} onMouseDown={e_4 => e_4.stopPropagation()} onClick={e_5 => {
                    e_5.stopPropagation();
                    void closeSourceTab("skill", s_1.name);
                  }} className="inline-flex size-2.5 items-center justify-center rounded text-ed-muted-foreground hover:bg-ed-muted hover:text-ed-foreground">{<XIcon className="size-2.5" />}</span>}</TabsTrigger>}</Tooltip>;
            })}{terminalTabs.map(t_3 => {
              const label_0 = t_3.label === "Connections" ? t("bottomBar.connections") : t_3.label ?? (terminalTabs.length === 1 ? t("bottomBar.terminal") : t("bottomBar.terminalNumber", { number: t_3.num }));
              const canClose = terminalTabs.length > 1;
              return <TabsTrigger key={t_3.id} value={t_3.id} className="group h-6 gap-1.5 px-3 py-1 text-xs text-ed-muted-foreground data-[state=active]:text-ed-foreground">{<TerminalIcon width={16} height={16} />}{label_0}{canClose && <span role="button" tabIndex={-1} aria-label={`Close ${label_0}`} onMouseDown={e_6 => e_6.stopPropagation()} onClick={e_7 => {
                  e_7.stopPropagation();
                  closeTerminalTab(t_3.id);
                }} className="inline-flex size-2.5 items-center justify-center rounded text-ed-muted-foreground opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 hover:bg-ed-muted hover:text-ed-foreground">{<XIcon className="size-2.5" />}</span>}</TabsTrigger>;
            })}</TabsList>}</Tabs>}{hasTerminal && <WithTooltip label={t("bottomBar.newTerminal")}>{<Button variant="ghost" size="icon-2xs" LeftIcon={PlusIcon} leftIconSize={12} aria-label={t("bottomBar.newTerminal")} className="text-ed-muted-foreground" onClick={addTerminalTab} />}</WithTooltip>}</div>}{<div className="flex shrink-0 items-center gap-2">{!isTerminalActive && <>{activeCodeTab === "selection" && selectedElementId && onReplaceElement && <>{selection.dirty && <Button variant="ghost" size="xs" onMouseDown={e_8 => e_8.preventDefault()} onClick={selection.reset} disabled={readOnly} LeftIcon={ArrowCounterClockwiseIcon} aria-label={t("bottomBar.resetChanges")}>{t("bottomBar.reset")}</Button>}{<WithTooltip label={t("bottomBar.applyToCanvas")}>{<Button variant="outline" size="xs" onMouseDown={e_9 => e_9.preventDefault()} onClick={selection.apply} disabled={readOnly || !selection.dirty} aria-label={t("bottomBar.applyToCanvas")}>{t("bottomBar.apply")} {<Kbd>⌘S</Kbd>}</Button>}</WithTooltip>}</>}{activeOpenFile && onOpenVersionHistory && <Button variant="ghost" size="xs" onClick={onOpenVersionHistory} LeftIcon={ClockIcon} aria-label={t("bottomBar.versionHistory")}>{t("bottomBar.history")}</Button>}{isCssActive && !readOnly && backend && <>{canCreateSelectedCssFile && <WithTooltip label={t("bottomBar.createCssHelp")}>{<Button variant="secondary" size="xs" onClick={handleCreateCssFile} disabled={isSavingCss} LeftIcon={PlusIcon} aria-label={t("bottomBar.createCss")}>{t("bottomBar.createCss")}</Button>}</WithTooltip>}{<WithTooltip label={t("bottomBar.saveCssHelp")}>{<Button variant="default" size="xs" onClick={handleSaveCssFile} disabled={isSavingCss || !selectedCssFileExists || !cssDirty} loading={isSavingCss} LeftIcon={FloppyDiskIcon} aria-label={t("bottomBar.saveCss")}>{isSavingCss ? t("bottomBar.saving") : t("bottomBar.saveCss")}</Button>}</WithTooltip>}</>}{activeOpenFile && canEditSource && <WithTooltip label={t("bottomBar.saveFileHelp")}>{<Button variant="default" size="xs" onClick={() => void handleSaveOpenFile()} disabled={savingFile || !activeFileDirty} loading={savingFile} LeftIcon={FloppyDiskIcon} aria-label={t("bottomBar.saveFile")}>{savingFile ? t("bottomBar.saving") : t("bottomBar.save")}</Button>}</WithTooltip>}{activeOpenSkill && canEditSkill && <WithTooltip label={t("bottomBar.saveSkillHelp")}>{<Button variant="default" size="xs" onClick={() => void handleSaveOpenSkill()} disabled={savingSkill || !activeSkillDirty} loading={savingSkill} LeftIcon={FloppyDiskIcon} aria-label={t("bottomBar.saveSkill")}>{savingSkill ? t("bottomBar.saving") : t("bottomBar.save")}</Button>}</WithTooltip>}</>}{<WithTooltip label={activeOpenFile ? `${t("bottomBar.copySourceFile")} (${GLOBAL_SHORTCUTS.copySelectionAsJsx.keyLabel})` : `${t("bottomBar.copySelection")} (${GLOBAL_SHORTCUTS.copySelectionAsJsx.keyLabel})`}>{<Button variant="secondary" size="xs" disabled={activeOpenFile ? false : !hasSelectedElement} onClick={() => void copyCode()} LeftIcon={copiedKind ? CheckIcon : CopyIcon} aria-label={activeOpenFile ? t("bottomBar.copySourceFile") : t("bottomBar.copySelection")}>{copiedKind ? t("bottomBar.copied") : activeOpenFile ? <>{t("bottomBar.copySourceFile")} {<Kbd>{GLOBAL_SHORTCUTS.copySelectionAsJsx.keyLabel}</Kbd>}</> : <>{t("bottomBar.copyCode")} {<Kbd>{GLOBAL_SHORTCUTS.copySelectionAsJsx.keyLabel}</Kbd>}</>}</Button>}</WithTooltip>}</div>}</div>}{isCssActive ? <div className="flex min-h-[22px] items-center gap-1.5 overflow-x-auto border-b border-ed-border bg-ed-background px-3 py-0.5">{cssFiles.length > 0 && <select value={cssFiles.includes(selectedCssPath) ? selectedCssPath : ""} onChange={e_10 => {
        setSelectedCssPath(e_10.target.value);
        setCssLoadedPath(null);
        setCssDirty(false);
      }} className="h-5 max-w-[220px] rounded border border-ed-border bg-ed-background px-1.5 text-[10px] text-ed-foreground">{cssFiles.map(path_5 => <option key={path_5} value={path_5}>{path_5}</option>)}</select>}{<input value={selectedCssPath} onChange={e_11 => setSelectedCssPath(e_11.target.value)} onBlur={() => {
        if (!selectedCssPath.trim()) setSelectedCssPath(DEFAULT_USER_CSS_PATH);
      }} placeholder={DEFAULT_USER_CSS_PATH} className="h-5 w-[220px] rounded border border-ed-border bg-ed-background px-1.5 text-[10px] font-mono text-ed-foreground placeholder:text-ed-muted-foreground" />}</div> : activeOpenSkill ? <div className="flex min-h-[22px] items-center gap-1.5 overflow-x-auto border-b border-ed-border bg-ed-background px-3 py-0.5">{<Text$4 size="xs" className="font-mono text-ed-muted-foreground">{activeOpenSkill.name}/SKILL.md</Text$4>}</div> : !isTerminalActive && breadcrumbItems.length > 0 && <EditorFileBreadcrumb items={breadcrumbItems} />}{!isTerminalActive && status && <EditorStatusBar status={status} />}{<div className="flex-1 min-h-0 overflow-hidden" style={isTerminalActive ? {
      display: "none"
    } : void 0}>{isLoadingCss && isCssActive ? <div className="flex items-center justify-center h-full">{<Text$4 size="sm" className="text-ed-muted-foreground">{t("bottomBar.loadingCss")}</Text$4>}</div> : <RetainedCodeEditor active={mode === "dev" && !isTerminalActive} documentKey={JSON.stringify([documentId, activeCodeTab, activeCodeTab === "selection" ? selectedElementId : selectedCssPath])} editorRef={cmRef} value={activeSurface.value} height="100%" className={`${CODE_EDITOR_CLASS} h-full`} extensions={editorExtensions} editable={activeSurface.editable} onChange={activeSurface.onChange} onBlur={() => {
        if (activeSurface.commitOnBlur) activeSurface.commit?.();
      }} onKeyDown={event_0 => {
        if (!(event_0.metaKey || event_0.ctrlKey) || event_0.key.toLowerCase() !== "s") return;
        if (!activeSurface.commit) return;
        event_0.preventDefault();
        activeSurface.commit();
      }} basicSetup={CODE_EDITOR_SETUP} />}</div>}{hasTerminal && terminalTabs.length > 0 && <div className="relative flex-1 overflow-hidden" style={isTerminalActive ? void 0 : {
      display: "none"
    }}>{terminalTabs.map(t_4 => {
        const isActive = activeCodeTab === t_4.id;
        return <div key={t_4.id} className="absolute inset-0" style={{
          display: isActive ? void 0 : "none"
        }}>{<TerminalPanel active={isActive} initialCommand={t_4.initialCommand} theme={isDark ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME} />}</div>;
      })}</div>}</div>;
}

export { BottomBar };
