export const PROJECT_TITLEBAR_HEIGHT = 40;
export type ProjectActivityState = { active: boolean; windowVisible: boolean; revision: number };
export type ProjectTabStatus = "idle" | "loading" | "running" | "attention" | "error";
export type ProjectTabFailure = {
  kind: "renderer" | "load";
  reason: string;
  exitCode: number | null;
  occurredAt: string;
  detail?: string;
};
export type ProjectTab = {
  id: string;
  name: string;
  status: ProjectTabStatus;
  closing?: boolean;
  failure?: ProjectTabFailure;
};
export type ProjectTabsState = { tabs: ProjectTab[]; activeId: string | null; revision: number; platform: string };
export type SavedProjectWindow = { id: string; projectIds: string[]; activeId: string | null };

/** Drop missing projects without guessing another root or opening duplicates. */
export function restoreProjectWindows(value: unknown, resolveProject: (id: string) => string | null): SavedProjectWindow[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 12).flatMap((entry, index) => {
    if (!entry || !Array.isArray(entry.projectIds)) return [];
    const projectIds: string[] = [];
    for (const id of entry.projectIds.slice(0, 30)) {
      if (typeof id !== "string") continue;
      const root = resolveProject(id);
      if (!root || seen.has(root)) continue;
      seen.add(root);
      projectIds.push(root);
    }
    const active = typeof entry.activeId === "string" ? resolveProject(entry.activeId) : null;
    return [{ id: `restored-${index}`, projectIds, activeId: active && projectIds.includes(active) ? active : null }];
  });
}
export function adjacentProjectAfterClose(ids: string[], activeId: string | null, closingId: string) {
  if (activeId !== closingId) return activeId;
  const index = ids.indexOf(closingId);
  return ids[index + 1] ?? ids[index - 1] ?? null;
}
