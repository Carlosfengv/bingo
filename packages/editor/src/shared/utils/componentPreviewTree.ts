import { cloneElement, isValidElement } from "react";
import type { ElementType, ReactElement, ReactNode } from "react";
import { isPublicComponentProp } from "../../../../compiler/src/store/componentEditing";
import type { ComponentPreview, PreviewProps } from "../state/componentPreview";
import { matchesComponentPreviewScene } from "./componentScenePreview";

type PreviewEntry = { id: string; renderStore?: object; renderChildren?: (props: PreviewProps) => ReactNode };
const unwrappedInstances = new WeakMap<ReactElement, PreviewEntry>();

/** Keep editor metadata off component props and preserve children.type for callers. */
export function markUnwrappedPreviewElement<T extends ReactElement>(element: T, entry: PreviewEntry): T {
  unwrappedInstances.set(element, entry);
  return element;
}

export function prepareComponentPreviewTree(children: ReactNode, snapshot: ComponentPreview | null,
  root: PreviewEntry, boundaryType: ElementType, assetResolver?: (value: string) => string) {
  const owned = new Set<string>();
  const affected = new Set<string>();
  if (snapshot?.status !== "pending" || snapshot.scene && !matchesComponentPreviewScene(snapshot.scene.store, root.renderStore)) return { content: children, owned, affected };
  const visit = (node: ReactNode, owner: boolean, entry?: PreviewEntry): ReactNode => {
    if (Array.isArray(node)) {
      const next = node.map(child => visit(child, owner));
      return next.some((child, index) => child !== node[index]) ? next : node;
    }
    if (!isValidElement<Record<string, any>>(node)) return node;
    const boundary = node.type === boundaryType;
    const instance = entry ?? unwrappedInstances.get(node) ?? (boundary ? { id: node.props.elementId } : undefined);
    const target = instance && snapshot.targets.get(instance.id);
    if (target) affected.add(target.id);
    const patch: Record<string, unknown> = {};
    let nextChildren = node.props.children;
    if (target && owner && !boundary) {
      owned.add(target.id);
      for (const name of new Set([...Object.keys(target.before), ...Object.keys(target.after)])) {
        if (!isPublicComponentProp(name)) continue;
        if (Object.hasOwn(target.before, name) === Object.hasOwn(target.after, name) && Object.is(target.before[name], target.after[name])) continue;
        const value = target.after[name];
        const asset = typeof value === "string" && (value.includes(".bingo-assets/") || value.startsWith("/assets/") || value.startsWith("/public/"));
        patch[name] = asset && assetResolver ? assetResolver(value) : value;
      }
      if (instance?.renderChildren) nextChildren = instance.renderChildren(target.after);
    }
    nextChildren = visit(nextChildren, owner && !boundary);
    if (nextChildren !== node.props.children) patch.children = nextChildren;
    return Object.keys(patch).length ? cloneElement(node, patch) : node;
  };
  return { content: visit(children, true, root), owned, affected };
}
