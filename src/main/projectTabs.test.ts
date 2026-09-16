import assert from "node:assert/strict";
import test from "node:test";
import { adjacentProjectAfterClose, restoreProjectWindows } from "../shared/projectTabs";
import { registerProjectRenderer, unregisterProjectRenderer, projectForWebContents,
  findWindowForProject, getOpenProjectIds, windowProjectMap, broadcastToEditors } from "./windowManager";

test("background tabs retain their own project ownership; shell and other projects cannot inherit it", () => {
  const win = { id: 601, isDestroyed: () => false };
  const first = { id: 701, isDestroyed: () => false };
  const second = { id: 702, isDestroyed: () => false };
  registerProjectRenderer(win, first, "/project/a", () => {});
  registerProjectRenderer(win, second, "/project/b", () => {});
  try {
    windowProjectMap.set(win.id, "/project/b");
    assert.equal(projectForWebContents(first), "/project/a");
    assert.equal(projectForWebContents(second), "/project/b");
    assert.equal(projectForWebContents({ id: 703 }), null);
    assert.equal(findWindowForProject("/project/a")?.webContents, first);
    assert.equal(findWindowForProject("/project/b")?.webContents, second);
    windowProjectMap.delete(win.id); // Home must leave both projects reachable.
    assert.equal(projectForWebContents(first), "/project/a");
    assert.deepEqual(getOpenProjectIds(), ["/project/a", "/project/b"]);
    unregisterProjectRenderer(first.id);
    assert.equal(projectForWebContents(first), null);
    assert.equal(findWindowForProject("/project/a"), null);
    assert.equal(findWindowForProject("/project/b")?.webContents, second);
  } finally {
    unregisterProjectRenderer(first.id);
    unregisterProjectRenderer(second.id);
    windowProjectMap.delete(win.id);
  }
});

test("MCP notification focus activates the requested background project before focusing its renderer", () => {
  const calls: string[] = [];
  const win = { id: 602, isDestroyed: () => false, focus: () => calls.push("window") };
  const contents = { id: 704, isDestroyed: () => false, focus: () => calls.push("renderer") };
  registerProjectRenderer(win, contents, "/project/c", () => calls.push("activate"));
  try {
    findWindowForProject("/project/c")?.focus();
    assert.deepEqual(calls, ["activate", "window", "renderer"]);
  } finally { unregisterProjectRenderer(contents.id); }
});

test("project events reach only their own renderer, including when it is in the background", () => {
  const sent: string[] = [];
  const win = { id: 603, isDestroyed: () => false };
  const first = { id: 705, isDestroyed: () => false, send: () => sent.push("a") };
  const second = { id: 706, isDestroyed: () => false, send: () => sent.push("b") };
  registerProjectRenderer(win, first, "/a", () => {});
  registerProjectRenderer(win, second, "/b", () => {});
  try {
    windowProjectMap.set(win.id, "/b");
    broadcastToEditors("file_changed", { projectId: "/a", content: "private project source" });
    assert.deepEqual(sent, ["a"]);
  } finally {
    unregisterProjectRenderer(first.id);
    unregisterProjectRenderer(second.id);
    windowProjectMap.delete(win.id);
  }
});

test("session restoration removes missing projects and canonical duplicates across windows", () => {
  const roots = new Map([["a", "/a"], ["alias-a", "/a"], ["b", "/b"]]);
  const windows = restoreProjectWindows([
    { projectIds: ["a", "alias-a", "missing", 42], activeId: "alias-a" },
    { projectIds: ["a", "b"], activeId: "missing" },
    { nonsense: true },
  ], id => roots.get(id) ?? null);
  assert.deepEqual(windows.map(({ projectIds, activeId }) => ({ projectIds, activeId })), [
    { projectIds: ["/a"], activeId: "/a" }, { projectIds: ["/b"], activeId: null },
  ]);
  assert.deepEqual(restoreProjectWindows(null, () => null), []);
});

test("closing a background tab preserves selection; closing the last tab returns Home", () => {
  assert.equal(adjacentProjectAfterClose(["a", "b", "c"], "a", "b"), "a");
  assert.equal(adjacentProjectAfterClose(["a", "b", "c"], "b", "b"), "c");
  assert.equal(adjacentProjectAfterClose(["a", "b"], "b", "b"), "a");
  assert.equal(adjacentProjectAfterClose(["a"], "a", "a"), null);
  assert.equal(adjacentProjectAfterClose(["a", "b"], null, "a"), null);
});
