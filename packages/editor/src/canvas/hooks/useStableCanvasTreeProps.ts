import { useLayoutEffect, useMemo, useRef } from "react";

// These functions are only invoked by events/effects, never to produce JSX.
// Keep their identities stable while forwarding to the latest committed props.
const eventProps = ["selectElement", "throttledHoverElement", "onEditText", "setEditingTextBounds",
  "onStartEditTextProp", "onStopEditTextProp", "onActivateTextEditor", "onDeactivateTextEditor",
  "onTextSelectionChange", "onResizeElement", "onViewportZoom", "onViewportPan", "onFixWithAI",
  "onAddElement", "onUpdateElementProps", "onSaveToCode", "onOpenFile", "onAddAllowedPath"];

export function useStableCanvasTreeProps(props) {
  const latest = useRef(props);
  const selectedElementIdsRef = useRef(props.selectedElementIds);
  useLayoutEffect(() => {
    latest.current = props;
    selectedElementIdsRef.current = props.selectedElementIds;
  });
  const callbacks = useMemo(() => Object.fromEntries(eventProps.map(key => [key, (...args) => latest.current[key]?.(...args)])), []);
  // Wrapper structure depends on which parents permit dragging, not Set identity.
  const parentsKey = JSON.stringify([...(props.interactiveParentIds ?? [])].sort());
  const interactiveParentIds = useMemo(() => props.interactiveParentIds, [parentsKey]);
  return {
    ...props,
    ...Object.fromEntries(eventProps.map(key => [key, props[key] ? callbacks[key] : undefined])),
    selectedElementIdsRef,
    interactiveParentIds
  };
}
