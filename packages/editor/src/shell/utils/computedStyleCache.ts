export type ComputedStyleSnapshot = Readonly<Record<string, string>>;
const emptySnapshot: ComputedStyleSnapshot = {};

/** Selection changes must not publish the previous element's computed styles. */
export function createComputedStyleCache(limit = 32) {
  const snapshots = new Map<string, ComputedStyleSnapshot>();
  return {
    get(id: string | null): ComputedStyleSnapshot { return id ? snapshots.get(id) ?? emptySnapshot : emptySnapshot; },
    publish(id: string, next: ComputedStyleSnapshot) {
      const previous = snapshots.get(id);
      const keys = Object.keys(next);
      if (previous && Object.keys(previous).length === keys.length && keys.every(key => previous[key] === next[key])) return false;
      if (!snapshots.has(id) && snapshots.size >= limit) snapshots.delete(snapshots.keys().next().value!);
      snapshots.set(id, next);
      return true;
    },
  };
}
