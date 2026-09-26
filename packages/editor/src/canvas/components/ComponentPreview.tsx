import { prepareComponentPreviewTree } from "../../shared/utils/componentPreviewTree";
import { useComponentPreview } from "../../shared/contexts/ComponentPreviewContext";
import { ElementErrorBoundary } from "./ErrorBoundary";
import { matchesComponentPreviewScene } from "../../shared/utils/componentScenePreview";

/** Preview the actual mounted instance; no offscreen duplicate business tree. */
export function ComponentPreview({ children, assetResolver, renderPreviewChildren, renderStore, ...boundaryProps }) {
  const { store, snapshot } = useComponentPreview();
  const target = snapshot?.status === "pending" && (!snapshot.scene || matchesComponentPreviewScene(snapshot.scene.store, renderStore)) ? snapshot.targets.get(boundaryProps.elementId) : undefined;
  const { content, owned, affected } = prepareComponentPreviewTree(children, snapshot,
    { id: boundaryProps.elementId, renderStore, renderChildren: renderPreviewChildren }, ComponentPreview, assetResolver);
  const token = affected.size ? snapshot!.token : undefined;
  return <ElementErrorBoundary {...boundaryProps}
    elementProps={target?.after ?? boundaryProps.elementProps}
    resetKey={`${boundaryProps.resetKey}:preview:${token ?? "base"}`}
    onSuccess={() => {
      if (token !== undefined) for (const id of owned) store?.report(token, id);
      else boundaryProps.onSuccess?.();
    }}
    onError={(error, info) => {
      if (token !== undefined) for (const id of affected) store?.report(token, id, error?.message ?? String(error));
      else boundaryProps.onError?.(error, info);
    }}
    onCrash={token !== undefined ? undefined : boundaryProps.onCrash}
  >{content}</ElementErrorBoundary>;
}
