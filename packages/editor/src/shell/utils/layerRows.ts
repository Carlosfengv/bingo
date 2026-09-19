import { hasChildren$1 } from "../../../../compiler/src/store/types";

type LayerStore = {
  byId: ReadonlyMap<string, { type: string; tag?: string }>;
  childrenByParent: ReadonlyMap<string, readonly string[]>;
};
export type LayerRow = { id: string; depth: number; subtreeEnd: number };
export type LayerRows = { rows: LayerRow[]; indexById: Map<string, number> };
export type LayerRange = { start: number; end: number };

function indexRows(rows: LayerRow[]): LayerRows {
  return { rows, indexById: new Map(rows.map((row, index) => [row.id, index])) };
}

/** A selection-independent index. Styles, names and modes do not change rows. */
export function createLayerRowsIndex() {
  let previousStore: LayerStore | undefined;
  let previousCollapsed: ReadonlySet<string> | undefined;
  let result: LayerRows | undefined;
  let containers: Array<[string, boolean]> = [];
  return {
    get(store: LayerStore, collapsed: ReadonlySet<string>): LayerRows {
      const sameTree = previousStore?.childrenByParent === store.childrenByParent
        && previousStore.byId.size === store.byId.size
        && (previousStore.byId === store.byId || containers.every(([id, expandable]) => {
          const element = store.byId.get(id);
          return !!element && hasChildren$1(element) === expandable;
        }));
      if (result && sameTree && previousCollapsed === collapsed) {
        previousStore = store;
        return result;
      }
      const rows: LayerRow[] = [];
      const walk = (id: string, depth: number) => {
        const element = store.byId.get(id);
        if (!element) return;
        const row = { id, depth, subtreeEnd: rows.length + 1 };
        rows.push(row);
        if (hasChildren$1(element) && !collapsed.has(id)) {
          for (const child of store.childrenByParent.get(id) ?? []) walk(child, depth + 1);
        }
        row.subtreeEnd = rows.length;
      };
      for (const id of store.childrenByParent.get("ROOT") ?? []) walk(id, 0);
      containers = [];
      for (const [id, children] of store.childrenByParent) {
        const element = store.byId.get(id);
        if (children.length && element) containers.push([id, hasChildren$1(element)]);
      }
      previousStore = store;
      previousCollapsed = collapsed;
      result = indexRows(rows);
      return result;
    },
  };
}

export function searchLayerRows(rows: Array<{ id: string; depth: number }>): LayerRows {
  return indexRows(rows.map((row, index) => ({ ...row, subtreeEnd: index + 1 })));
}

/** Work scales with selected ids, not with the number of expanded rows. */
export function selectedLayerRanges({ rows, indexById }: LayerRows, selected: ReadonlySet<string>) {
  const indexes: number[] = [];
  for (const id of selected) {
    const index = indexById.get(id);
    if (index !== undefined) indexes.push(index);
  }
  indexes.sort((a, b) => a - b);
  const shells: LayerRange[] = [];
  const stickyParents = new Map<number, number>();
  for (const start of indexes) {
    const end = rows[start].subtreeEnd;
    if (end > start + 1) stickyParents.set(start, end);
    if (!shells.length || start >= shells[shells.length - 1].end) shells.push({ start, end });
  }
  return { shells, stickyParents };
}

export function isInsideLayerSelection(index: number, shells: readonly LayerRange[]) {
  let left = 0, right = shells.length - 1;
  while (left <= right) {
    const middle = (left + right) >>> 1;
    const shell = shells[middle];
    if (index <= shell.start) right = middle - 1;
    else if (index >= shell.end) left = middle + 1;
    else return true;
  }
  return false;
}
