import { useEffect, useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { getById, getParentId } from "@bingo/compiler";
import { ScrollArea, SimpleTabs, Tabs, TabsContent, TabsTrigger } from "@bingo/ui";
import { componentClassSupport, componentEditableElement, componentLegacyStyleState, componentStyleSupport } from "../../../../../compiler/src/store/componentEditing";
import { useActiveTool } from "../../../shared/contexts/ActiveToolContext";
import { ComponentOverridesPanel } from "./ComponentOverridesPanel";
import { ComponentOuterLayoutPanel } from "./ComponentOuterLayoutPanel";
import { CodeView } from "./styles/tabs/CodeView";
import { DesignTab } from "./styles/tabs/DesignTab";

const EMPTY_SELECTION = new Set<string>();

function StylesPanelTabs(props) {
  const { t } = useTranslation("editor");
  const { selectedElementId, selectedElementIds = EMPTY_SELECTION, store, propsPanel, header, headerActions, readOnly, componentIndex } = props;
  const { scaleFocusVersion } = useActiveTool();
  const [view, setView] = useState("design");
  useEffect(() => { setView("design"); }, [scaleFocusVersion]);
  const ids = selectedElementIds.size > 1 ? [...selectedElementIds] : selectedElementId ? [selectedElementId] : [];
  const selected = ids.map(id => getById(store, id)).filter(Boolean);
  const element = selected[0];
  const hasComponent = selected.some(item => item.type === "component");
  const componentsOnly = selected.length > 0 && selected.every(item => item.type === "component");
  const inlineParameters = hasComponent && !!propsPanel;
  const separateProps = !!propsPanel && !inlineParameters;
  useEffect(() => { if (view === "props" && !separateProps) setView("design"); }, [view, separateProps]);
  if (!element) return <div className="flex h-full items-center justify-center p-4 text-[12px] text-ed-muted-foreground">{t("panels.selectElement")}</div>;
  const unsupported = selected.some(item => item.type === "component" && !componentStyleSupport(item, componentIndex?.[item.componentName]));
  const outerLayoutOnly = unsupported && componentsOnly && selected.every(item => ["absolute", "fixed"].includes(item.styles?.position));
  const legacyRestricted = selected.some(item => ["separate", "invalid"].includes(componentLegacyStyleState(item)));
  const classesUnsupported = selected.some(item => item.type === "component" && !componentClassSupport(item, componentIndex?.[item.componentName]));
  let owner = selected.length === 1 ? getParentId(store, element.id) : null;
  const visited = new Set<string>();
  while (owner && owner !== "ROOT" && !visited.has(owner)) {
    visited.add(owner);
    if (getById(store, owner)?.type === "component") break;
    owner = getParentId(store, owner);
  }
  const ownerComponent = owner ? getById(store, owner) : null;
  const editCallbacks = {
    onUpdateElementStyles: (id, styles) => props.onUpdateElementStyles(id, styles, { normalizeLegacyStyles: true }),
    onUpdateMultipleElementsStyles: props.onUpdateMultipleElementsStyles ? (ids, updater) => props.onUpdateMultipleElementsStyles(ids, (styles, id) => updater(componentEditableElement(getById(store, id))?.styles ?? styles, id), { normalizeLegacyStyles: true }) : undefined,
  };
  const selectionProps = { ...props, ...editCallbacks, element: componentEditableElement(element), selectedElementId: element.id, selectedElements: selected.length > 1 ? selected.map(componentEditableElement) : undefined };
  return <Tabs value={view} onValueChange={setView} className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden flex flex-col" data-text-edit-safe="true">
    <div className="editor-panel-header z-10 flex min-w-0 shrink-0 items-center justify-between gap-1 border-b border-ed-divider bg-ed-background p-3">
      <SimpleTabs size="xs" className="w-fit shrink-0">
        <TabsTrigger value="design">{t("panels.styles")}</TabsTrigger>
        {separateProps && <TabsTrigger value="props">{t("panels.props")}</TabsTrigger>}
        <TabsTrigger value="code">{t("panels.code")}</TabsTrigger>
      </SimpleTabs>
      {headerActions}
    </div>
    {header}
    {ownerComponent?.type === "component" && <p data-component-owner className="border-b border-ed-border px-3.5 py-2 text-[10px] text-ed-muted-foreground" style={{ overflowWrap: "anywhere" }}>{t("componentInstance.belongsTo", { name: ownerComponent.componentName })}</p>}
    <TabsContent value="design" className="w-full min-w-0 max-w-full overflow-hidden">
      <ScrollArea className="h-full">
        {inlineParameters && propsPanel}
        {componentsOnly && <ComponentOverridesPanel {...props} {...editCallbacks} readOnly={readOnly || legacyRestricted} originalElements={selected} elements={selected.map(componentEditableElement)} />}
        {unsupported && <p role="status" className="border-b border-ed-border px-3.5 py-3 text-[11px] text-ed-muted-foreground">{t(`componentInstance.${legacyRestricted ? "legacyStyleScope" : "unsupportedStyles"}`)}</p>}
        {outerLayoutOnly && <ComponentOuterLayoutPanel {...props} elements={selected} />}
        {!outerLayoutOnly && <fieldset disabled={readOnly || unsupported} className="min-w-0 border-0 p-0 m-0">
          <DesignTab {...selectionProps} readOnly={readOnly || unsupported} />
        </fieldset>}
        <div aria-hidden="true" className="h-[200px] shrink-0" />
      </ScrollArea>
    </TabsContent>
    {separateProps && <TabsContent value="props" className="w-full min-w-0 max-w-full overflow-hidden"><ScrollArea className="h-full">{propsPanel}<div aria-hidden="true" className="h-[200px] shrink-0" /></ScrollArea></TabsContent>}
    <TabsContent value="code" className="overflow-auto"><CodeView {...selectionProps} readOnly={readOnly || unsupported} classesReadOnly={readOnly || classesUnsupported} /></TabsContent>
  </Tabs>;
}
export { StylesPanelTabs };
