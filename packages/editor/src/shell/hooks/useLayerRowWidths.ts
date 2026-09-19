import { useLayoutEffect, useState, type RefObject } from "react";

type RowMeasurement = {
  element: HTMLElement;
  children: Element[];
  widths: Map<Element, number>;
  depth: string | undefined;
  spacing: number;
};

/** Observe intrinsic row content, independent of selection and render callbacks. */
export function useLayerRowWidths(listRef: RefObject<HTMLElement | null>, resetKey: object) {
  const [minWidth, setMinWidth] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = new Map<HTMLElement, RowMeasurement>();
    const owners = new Map<Element, RowMeasurement>();
    // Virtual rows share the editor's spacing classes. Cache layout variants,
    // not labels or measured widths; a long label still updates through RO.
    const spacingByLayout = new Map<string, number>();
    const readSpacing = (element: HTMLElement, children: Element[]) => {
      const key = JSON.stringify([element.className, element.style.cssText,
        ...children.map(child => [child.tagName, child.getAttribute("class"), child.getAttribute("style")])]);
      const cached = spacingByLayout.get(key);
      if (cached !== undefined) return cached;
      const style = getComputedStyle(element);
      let spacing = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
        + (parseFloat(style.columnGap) || 0) * Math.max(0, children.length - 1);
      for (const child of children) {
        const childStyle = getComputedStyle(child);
        if (!child.classList.contains("ml-auto")) spacing += parseFloat(childStyle.marginLeft) || 0;
        spacing += parseFloat(childStyle.marginRight) || 0;
      }
      if (spacingByLayout.size >= 128) spacingByLayout.clear();
      spacingByLayout.set(key, spacing);
      return spacing;
    };
    // Keep offscreen widths as rows are virtualized, until the list is reset.
    const widthsById = new Map<string, number>();
    const publishWidth = () => {
      let maximum = 0;
      for (const width of widthsById.values()) maximum = Math.max(maximum, width);
      setMinWidth(previous => previous === maximum ? previous : maximum);
    };
    const updateWidth = (row: RowMeasurement) => {
      if (row.children.some(child => !row.widths.has(child))) return;
      const width = row.spacing + row.children.reduce((sum, child) => sum + row.widths.get(child)!, 0);
      widthsById.set(row.element.dataset.layerId!, Math.ceil(width));
    };
    const observer = new ResizeObserver(entries => {
      const dirty = new Set<RowMeasurement>();
      for (const entry of entries) {
        const row = owners.get(entry.target);
        if (!row) continue;
        const width = entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width;
        if (row.widths.get(entry.target) === width) continue;
        row.widths.set(entry.target, width);
        dirty.add(row);
      }
      if (!dirty.size) return;
      for (const row of dirty) updateWidth(row);
      publishWidth();
    });
    const untrack = (row: RowMeasurement) => {
      for (const child of row.children) {
        observer.unobserve(child);
        owners.delete(child);
      }
      rows.delete(row.element);
    };
    const track = (element: HTMLElement) => {
      if (!list.contains(element)) return;
      const children = Array.from(element.children);
      const previous = rows.get(element);
      const depth = element.dataset.layerDepth;
      if (previous && previous.depth === depth && children.length === previous.children.length
        && children.every((child, index) => child === previous.children[index])) return;
      if (previous) untrack(previous);
      // Spacing changes on mount, reparenting or a rename input being mounted,
      // not when the selection/background changes. Sizes come from the RO batch.
      const spacing = readSpacing(element, children);
      const widths = new Map<Element, number>();
      for (const child of children) {
        const width = previous?.widths.get(child);
        if (width !== undefined) widths.set(child, width);
      }
      const row = { element, children, depth, spacing, widths };
      rows.set(element, row);
      for (const child of children) {
        owners.set(child, row);
        observer.observe(child, { box: "border-box" });
      }
      updateWidth(row);
      return true;
    };
    for (const element of list.querySelectorAll<HTMLElement>("[data-layer-id]")) track(element);
    publishWidth();
    const mutations = new MutationObserver(records => {
      const candidates = new Set<HTMLElement>();
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const row = target?.closest<HTMLElement>("[data-layer-id]");
        if (row) candidates.add(row);
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches("[data-layer-id]")) candidates.add(node);
          for (const added of node.querySelectorAll<HTMLElement>("[data-layer-id]")) candidates.add(added);
        }
      }
      for (const row of rows.values()) if (!list.contains(row.element)) untrack(row);
      let changed = false;
      for (const row of candidates) changed = !!track(row) || changed;
      if (changed) publishWidth();
    });
    mutations.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-layer-depth"] });
    const invalidateSpacing = () => {
      spacingByLayout.clear();
      widthsById.clear();
      for (const row of rows.values()) {
        row.spacing = readSpacing(row.element, row.children);
        updateWidth(row);
      }
      publishWidth();
    };
    window.addEventListener("bingo-css-updated", invalidateSpacing);
    window.addEventListener("resize", invalidateSpacing);
    const fontsLoaded = (event: FontFaceSetLoadEvent) => {
      if (event.fontfaces.some(font => font.status === "loaded")) invalidateSpacing();
    };
    document.fonts?.addEventListener("loadingdone", fontsLoaded);
    const rootStyles = new MutationObserver(invalidateSpacing);
    rootStyles.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      observer.disconnect(); mutations.disconnect(); rootStyles.disconnect();
      window.removeEventListener("bingo-css-updated", invalidateSpacing);
      window.removeEventListener("resize", invalidateSpacing);
      document.fonts?.removeEventListener("loadingdone", fontsLoaded);
    };
  }, [listRef, resetKey]);
  return minWidth;
}
