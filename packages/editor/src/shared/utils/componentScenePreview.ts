import { getById, getChildren$2, getParentId } from "@bingo/compiler";
import type { PreviewTarget } from "../state/componentPreview";

/** Validate changed components and component ancestors affected by new children.
 * The candidate is rendered on the actual canvas, so props are already applied;
 * equal before/after values tell ComponentPreview to observe without patching. */
export function componentSceneTargets(before, after): PreviewTarget[] {
  const affected = new Set<string>();
  const includeAncestors = (store, startId: string) => {
    let id = startId;
    while (id && id !== "ROOT") {
      if (getById(after, id)?.type === "component") affected.add(id);
      id = getParentId(store, id);
    }
  };
  for (const id of new Set<string>([...before.byId.keys(), ...after.byId.keys()])) {
    const previous = getById(before, id), next = getById(after, id);
    if ((previous === next || JSON.stringify(previous) === JSON.stringify(next))
      && getParentId(before, id) === getParentId(after, id)
      && JSON.stringify(getChildren$2(before, id)) === JSON.stringify(getChildren$2(after, id))) continue;
    includeAncestors(before, id);
    includeAncestors(after, id);
  }
  return [...affected].map(id => {
    const props = getById(after, id).props ?? {};
    return { id, before: props, after: props };
  });
}
// Theme resolution produces a render-only store. Keep its authored identity
// without serializing runtime metadata or allowing an older tree to pass a new edit.
const projectionSources = new WeakMap<object, object>();
export function registerComponentPreviewProjection(source: object, projection: object) {
  if (source !== projection) projectionSources.set(projection, source);
}
export function matchesComponentPreviewScene(candidate: object, rendered: object | undefined) {
  return rendered === candidate || !!rendered && projectionSources.get(rendered) === candidate;
}
