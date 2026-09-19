/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useCanvasToolHandler.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, createInsertOperation, createRemoveOperation, createReplaceOperation } from "../../shared/utils/operations";
import { CanvasRevisionConflictError, appendCanvasCandidateOperation, commitCanvasCandidate, createCanvasCommitCandidate } from "./canvasOperationCommit";
import { lintCanvasDesign, parseCanvasJsx } from "@bingo/compiler";
import { UNKNOWN_ROOT_WIDTH, nextRootPlacement } from "./nextRootPlacement";
import { isDrawPreviewId, occupiedRootBoxes, rootOccupancyBox } from "./rootBoxes";
import { CANVAS_OPERATION_PROTOCOL_VERSION, ancestorChainMatchesQuery, applyJsxStringEdit, ensureV2, generateJSX, generateJSXWithinBudget, getById, getChildren$2, getDescendantIds, getIndex, getParentId, getRootIds, hashAllElementSubtreesFrom, hashElementSubtreeFrom, isDescendant, jsxContainsTruncationStub, lintNewlyIntroducedRawHtmlControls, lintRawHtmlControls, matchElementGrep, normalizeUpdateSubtree, storeSubtreeToLegacyNested, summarizeSubtreeChange, walk } from "@bingo/compiler";
import * as import_react from "react";
import * as import_react_dom from "react-dom";

/**
* Canvas tool IPC handler hook.
*
* Listens for `canvas_tool_request` IPC messages from the MCP server
* (Electron main process) and applies canvas operations to the editor state.
*
* Operations: list_pages, read_canvas, claim_element, release_element,
* add_to_canvas, update_element, edit_element, insert_element, grep_canvas,
* query_canvas, delete_element, claims_covering_element, claim_has_locks, search_icons,
* preview_draw, preview_drop
*/
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var GREP_MAX_RESULTS = 40;
var QUERY_MAX_RESULTS = 100;
var CANVAS_MUTATION_OPERATIONS = new Set(["add_to_canvas", "update_element", "edit_element", "insert_element", "delete_element"]);
function describeRootForAgent(store, id) {
  const el = getById(store, id);
  if (!el || isDrawPreviewId(id)) return null;
  const box = rootOccupancyBox(store, id);
  if (!box) return null;
  return {
    id,
    name: el.name?.trim() || (el.type === "component" ? el.componentName : "tag" in el ? el.tag : el.type),
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height)
  };
}
var CLAIM_SWEEP_INTERVAL_MS = 5e3;
/**
* Claim ids that no live agent is behind any more.
*
* A claim whose chat tab is still streaming is alive however long it stays quiet — the
* agent may be reading or thinking. One whose tab has stopped (or belongs to a tab this
* renderer has never streamed, which is what an agent orphaned by a closed window looks
* like) gets a short grace and goes. Claims with no chat tab at all are external MCP
* clients, held to the idle TTL.
*/
function selectStaleClaims({
  now,
  locks,
  claimChatTabs,
  touchedAt,
  isChatTabStreaming
}) {
  const stale = [];
  for (const claimId of new Set(locks.values())) {
    const chatTabId = claimChatTabs.get(claimId);
    if (chatTabId && isChatTabStreaming?.(chatTabId)) continue;
    if (now - (touchedAt.get(claimId) ?? 0) >= (chatTabId ? 15e3 : 3e5)) stale.push(claimId);
  }
  return stale;
}
function clearLocksForClaimIds(claimIds, elementLocksRef, claimIdToChatTabIdRef, setElementLocksVersion) {
  const unlock = claimIds instanceof Set ? claimIds : new Set(claimIds);
  if (unlock.size === 0) return [];
  const released = [];
  for (const [elemId, owner] of [...elementLocksRef.current.entries()]) if (unlock.has(owner)) {
    elementLocksRef.current.delete(elemId);
    released.push(elemId);
  }
  for (const id of unlock) claimIdToChatTabIdRef.current.delete(id);
  if (released.length > 0) setElementLocksVersion(v => v + 1);
  return released;
}
/** True if any descendant of elementId in the store is locked by a claim other than claimId. */
function hasLockedDescendant(store, elementId, claimId, locks) {
  let result = null;
  walk(store, elementId, descendantId => {
    if (result) return;
    const owner = locks.get(descendantId);
    if (owner && owner !== claimId) result = descendantId;
  });
  return result;
}
/** True if claimId locks elementId or an ancestor of elementId. */
function claimCoversElement(store, elementId, claimId, locks) {
  if (locks.get(elementId) === claimId) return true;
  for (const [lockedId, owner] of locks) if (owner === claimId && isDescendant(store, lockedId, elementId)) return true;
  return false;
}
function resolveActiveStore(targetTabId, currentActiveTabId, storeRef, tabs, foundStore) {
  if (targetTabId === currentActiveTabId) return storeRef.current;
  return foundStore ?? tabs.find(t => t.id === targetTabId)?.store ?? storeRef.current;
}
function applyStoreUpdate(targetTabId, currentActiveTabId, nextStore, setStore, storeRef, setTabStoreById) {
  if (targetTabId === currentActiveTabId) {
    setStore(nextStore);
    storeRef.current = nextStore;
  } else setTabStoreById(targetTabId, nextStore);
}
function claimedSubtreeIdSet(store, elementId) {
  return new Set([elementId, ...getDescendantIds(store, elementId)]);
}
function allStoreIdSet(store) {
  return new Set(store.byId.keys());
}
function elementLabel(store, id) {
  const el = getById(store, id);
  if (!el) return id;
  if (el.type === "component") return el.componentName;
  if (el.type === "html") return el.tag;
  if (el.type === "icon") return el.iconName;
  return el.type;
}
/** Descendants-or-self matching a space-separated tag/component selector. */
function queryCanvasIds(store, rootId, selector) {
  const parts = selector.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const roots = rootId ? [rootId] : [...getRootIds(store)];
  const results = [];
  function matchesPath(id) {
    const chain = [];
    let cur = id;
    while (cur && cur !== "ROOT") {
      chain.unshift(cur);
      const parent = getParentId(store, cur);
      cur = parent && parent !== "ROOT" ? parent : null;
    }
    let nodes = chain;
    if (rootId) {
      const idx = chain.indexOf(rootId);
      if (idx === -1) return false;
      nodes = chain.slice(idx);
    }
    return ancestorChainMatchesQuery(nodes.map(nodeId => getById(store, nodeId)).filter(el => !!el).map(el => el), parts);
  }
  for (const r of roots) {
    const candidates = [r, ...getDescendantIds(store, r)];
    for (const id of candidates) if (matchesPath(id)) {
      results.push(id);
      if (results.length >= QUERY_MAX_RESULTS) return results;
    }
  }
  return results;
}
/** First "Page", "Page 2", … not taken by an existing tab or an in-flight creation. */
function nextDefaultPageName(tabs, pending) {
  const taken = new Set(tabs.map(tab => tab.name.trim().toLocaleLowerCase()));
  for (const name of pending) taken.add(name);
  for (let n = 1;; n++) {
    const candidate = n === 1 ? "Page" : `Page ${n}`;
    if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  }
}
function useCanvasToolHandler(deps) {
  const latestDeps = (0, import_react.useEffectEvent)(() => deps);
  const pendingPageCreationsRef = (0, import_react.useRef)(new Map());
  const drawPreviewsRef = (0, import_react.useRef)(new Map());
  const completedCanvasOperationsRef = (0, import_react.useRef)(new Map());
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined" || !window.api?.on) return;
    /** claim_id → last time an MCP operation named it. */
    const claimTouchedAt = new Map();
    let sweepTimer = null;
    const stopClaimSweep = () => {
      if (sweepTimer === null) return;
      clearInterval(sweepTimer);
      sweepTimer = null;
    };
    const sweepStaleClaims = () => {
      const {
        elementLocksRef,
        claimIdToChatTabIdRef,
        setElementLocksVersion,
        isChatTabStreaming
      } = latestDeps();
      const stale = selectStaleClaims({
        now: Date.now(),
        locks: elementLocksRef.current,
        claimChatTabs: claimIdToChatTabIdRef.current,
        touchedAt: claimTouchedAt,
        isChatTabStreaming
      });
      if (stale.length > 0) clearLocksForClaimIds(stale, elementLocksRef, claimIdToChatTabIdRef, setElementLocksVersion);
      const live = new Set(elementLocksRef.current.values());
      for (const claimId of [...claimTouchedAt.keys()]) if (!live.has(claimId)) claimTouchedAt.delete(claimId);
      if (elementLocksRef.current.size === 0) stopClaimSweep();
    };
    /** Keep a claim alive; starts the sweeper on the first live claim so idle editors run no timer. */
    const touchClaim = claimId_0 => {
      claimTouchedAt.set(claimId_0, Date.now());
      if (sweepTimer === null) sweepTimer = setInterval(sweepStaleClaims, CLAIM_SWEEP_INTERVAL_MS);
    };
    const unsub = window.api.on("canvas_tool_request", async request => {
      const {
        requestId,
        operationId,
        projectId: requestProjectId,
        operation,
        args
      } = request;
      let resolvedCanvasId = null;
      let createdElementIdsForResult = [];
      let parentElementIdForResult = typeof args?.parent_id === "string" ? args.parent_id : null;
      let expectedRevisionForResult = null;
      let committedRevisionForResult = null;
      let jsxRecovery = null;
      let designDiagnostics = [];
      const respond = result => {
        if (designDiagnostics.length) {
          result = { ...result, structuredContent: { ...result?.structuredContent, designDiagnostics: designDiagnostics.slice(0, 40), designDiagnosticsTotal: designDiagnostics.length } };
          if (!result.isError) result.content = [...(result.content ?? []), {
            type: "text",
            text: "Design review (write applied; inspect these candidates in the changed region):\n" + designDiagnostics.slice(0, 12).map(issue => `${issue.code}: ${issue.message}`).join("\n")
              + (designDiagnostics.length > 12 ? `\n${designDiagnostics.length - 12} additional issues; inspect the region's JSX.` : "")
          }];
        }
        if (jsxRecovery && jsxRecovery.status !== "unchanged") {
          const recovery = jsxRecovery.status === "recovered"
            ? { ...jsxRecovery, status: result?.isError ? "failed" : "recovered", stage: "commit" }
            : jsxRecovery;
          result = { ...result, structuredContent: { ...result?.structuredContent, recovery } };
        }
        let nextResult = result;
        if (operationId && CANVAS_MUTATION_OPERATIONS.has(operation)) {
          const supplied = result?.structuredContent?.operation ?? {};
          nextResult = {
            ...result,
            structuredContent: {
              ...(result?.structuredContent ?? {}),
              operation: {
                protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
                operationId,
                requestedCanvasId: typeof args?.canvas_id === "string" ? args.canvas_id : null,
                resolvedCanvasId,
                createdElementIds: createdElementIdsForResult,
                parentElementId: parentElementIdForResult,
                expectedRevision: expectedRevisionForResult,
                committedRevision: committedRevisionForResult,
                persistenceState: result?.isError ? null : "pending",
                applied: result?.isError ? false : true,
                ...supplied
              }
            }
          };
        }
        if (operationId && CANVAS_MUTATION_OPERATIONS.has(operation)) {
          completedCanvasOperationsRef.current.set(operationId, {
            result: nextResult,
            completedAt: Date.now()
          });
          while (completedCanvasOperationsRef.current.size > 1e3) completedCanvasOperationsRef.current.delete(completedCanvasOperationsRef.current.keys().next().value);
          const committedOperation = nextResult?.structuredContent?.operation;
          if (committedOperation?.applied === true && committedOperation.persistenceState === "pending") {
            latestDeps().onCanvasOperationCommitted?.(committedOperation);
          }
        }
        window.api.send("canvas_tool_result", {
          requestId,
          operationId,
          result: nextResult
        });
      };
      const editorProjectId = latestDeps().projectId;
      if (editorProjectId && requestProjectId && String(editorProjectId) !== String(requestProjectId)) {
        respond({
          isError: true,
          content: [{
            type: "text",
            text: `Project mismatch: this canvas is ${editorProjectId}, but the MCP request targets ${requestProjectId}. No canvas changes were applied.`
          }]
        });
        return;
      }
      if (operationId && CANVAS_MUTATION_OPERATIONS.has(operation) && request.protocolVersion !== CANVAS_OPERATION_PROTOCOL_VERSION) {
        respond({
          isError: true,
          content: [{
            type: "text",
            text: `Unsupported canvas operation protocol: ${request.protocolVersion}`
          }],
          structuredContent: {
            operation: {
              errorCode: "CANVAS_UNSUPPORTED_PROTOCOL",
              applied: false
            }
          }
        });
        return;
      }
      if (operationId && CANVAS_MUTATION_OPERATIONS.has(operation)) {
        const cached = completedCanvasOperationsRef.current.get(operationId);
        if (cached && Date.now() - cached.completedAt <= 18e5) {
          window.api.send("canvas_tool_result", {
            requestId,
            operationId,
            result: cached.result
          });
          return;
        }
        if (cached) completedCanvasOperationsRef.current.delete(operationId);
      }
      if (typeof args?.claim_id === "string" && args.claim_id) touchClaim(args.claim_id);
      const {
        tabs,
        activeTabIdRef,
        storeRef,
        iconLibraries,
        componentIndex,
        history,
        setStore,
        setTabStoreById,
        getCanvasRevision,
        findElementTab,
        elementLocksRef: elementLocksRef_0,
        claimIdToChatTabIdRef: claimIdToChatTabIdRef_0,
        setElementLocksVersion: setElementLocksVersion_0
      } = latestDeps();
      const parseCanvasInput = (jsx, canvasOperation, forceNewIds = false, beforeJsx = undefined) => {
        try {
          designDiagnostics = lintCanvasDesign(jsx, componentIndex, beforeJsx);
          const invalid = designDiagnostics.find(issue => issue.severity === "error");
          if (invalid) {
            const error: any = new Error(invalid.message);
            error.code = invalid.code;
            throw error;
          }
          const parsed = parseCanvasJsx(jsx, iconLibraries, componentIndex, undefined, { operation: canvasOperation, forceNewIds });
          jsxRecovery = parsed.recovery;
          return parsed.store;
        } catch (error) {
          jsxRecovery = error.recovery ?? null;
          throw error;
        }
      };
      const currentTabs = tabs;
      const currentActiveTabId = activeTabIdRef.current;
      const publishStore = (tabId, next) => {
        applyStoreUpdate(tabId, currentActiveTabId, next, setStore, storeRef, setTabStoreById);
      };
      const currentStoreForTab = tabId => {
        const current = latestDeps();
        if (current.activeTabIdRef.current === tabId) return current.storeRef.current;
        return current.tabs.find(tab => tab.id === tabId)?.store;
      };
      const dropPreviewsOnTab = (_tabId, store) => store;
      try {
        if (operation === "preview_drop") {
          drawPreviewsRef.current.clear();
          respond({
            content: [{
              type: "text",
              text: "previews dropped"
            }]
          });
          return;
        }
        if (operation === "preview_draw") {
          respond({
            content: [{
              type: "text",
              text: "preview skipped (formal store isolation)"
            }]
          });
          return;
        }
        if (operation === "search_icons") {
          const query = args.query?.toLowerCase() || "";
          const results = [];
          for (const [, lib] of Object.entries(iconLibraries)) {
            if (lib.icons) {
              for (const iconName of Object.keys(lib.icons)) if (iconName.toLowerCase().includes(query)) {
                results.push(iconName);
                if (results.length >= 20) break;
              }
            }
            if (results.length >= 20) break;
          }
          respond({
            content: [{
              type: "text",
              text: results.length > 0 ? results.join(", ") : `No icons matching "${query}"`
            }]
          });
          return;
        }
        if (operation === "list_pages") {
          const pages = currentTabs.map(t_0 => {
            const roots = getRootIds(t_0.store).map(id => describeRootForAgent(t_0.store, id)).filter(root => !!root);
            return {
              id: t_0.canvasId || t_0.id,
              name: t_0.name,
              loaded: t_0.loaded,
              active: t_0.id === currentActiveTabId,
              rootCount: roots.length,
              roots
            };
          });
          const active = pages.find(page => page.active);
          respond({
            content: [{
              type: "text",
              text: `${active && active.rootCount > 0 ? `Active page "${active.name}" already has ${active.rootCount} top-level frame(s). New root canvas_add is auto-placed to their right — do not draw on top of existing work. To change existing work, canvas_read + claim those ids.` : "Active page is empty. New root canvas_add starts at the origin."}\n${JSON.stringify(pages, null, 2)}`
            }]
          });
          return;
        }
        if (operation === "create_page") {
          const requestedName = typeof args.name === "string" && args.name.trim() ? args.name.trim() : null;
          const name = requestedName ?? nextDefaultPageName(currentTabs, new Set(pendingPageCreationsRef.current.keys()));
          const normalizedName = name.toLocaleLowerCase();
          const existing_0 = requestedName ? currentTabs.find(tab => tab.name.trim().toLocaleLowerCase() === normalizedName) : void 0;
          if (existing_0) {
            if (existing_0.id !== currentActiveTabId) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Page "${existing_0.name}" already exists (id ${existing_0.canvasId || existing_0.id}) but is not active. Open that page before continuing; a duplicate was not created.`
                }]
              });
              return;
            }
            respond({
              content: [{
                type: "text",
                text: `Reusing existing active page "${existing_0.name}" (id ${existing_0.canvasId || existing_0.id}). No duplicate page was created.`
              }]
            });
            return;
          }
          let creation = pendingPageCreationsRef.current.get(normalizedName);
          const joinedInFlight = !!creation;
          if (!creation) {
            creation = latestDeps().createCanvasPage(name);
            pendingPageCreationsRef.current.set(normalizedName, creation);
            creation.catch(() => {}).finally(() => pendingPageCreationsRef.current.delete(normalizedName));
          }
          const res = await creation;
          if (!res.success || !res.id) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Failed to create page: ${res.error || "unknown error"}`
              }]
            });
            return;
          }
          respond({
            content: [{
              type: "text",
              text: `${joinedInFlight ? "Reusing page" : "Created page"} "${res.name}" (id ${res.id}). It is now the active canvas — subsequent canvas_add calls target it.`
            }]
          });
          return;
        }
        if (operation === "read_canvas") {
          const canvasId = args.canvas_id;
          const elementId = args.element_id;
          const tab_0 = currentTabs.find(t_1 => t_1.canvasId === canvasId || t_1.id === canvasId);
          if (!tab_0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Canvas not found: ${canvasId}`
              }]
            });
            return;
          }
          if (!tab_0.loaded) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Canvas not loaded: ${canvasId}`
              }]
            });
            return;
          }
          if (elementId) {
            if (!getById(tab_0.store, elementId)) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Element not found: ${elementId}`
                }]
              });
              return;
            }
            const opts = {
              includeDataElementId: true,
              rootId: elementId
            };
            const hashes = hashAllElementSubtreesFrom(tab_0.store, elementId);
            const {
              jsx: jsx_0
            } = generateJSXWithinBudget(tab_0.store, opts);
            respond({
              content: [{
                type: "text",
                text: jsx_0
              }],
              _coveringReads: Object.fromEntries(hashes)
            });
          } else {
            const jsx_1 = generateJSX(tab_0.store, 0, {
              includeDataElementId: true
            });
            const rootIds = getRootIds(tab_0.store);
            if (jsx_1.length > 8e3) {
              const summary = rootIds.map(id_0 => {
                const el = getById(tab_0.store, id_0);
                if (!el) return `- ${id_0} (missing)`;
                const childCount = getChildren$2(tab_0.store, id_0).length;
                return `- ${el.type === "component" ? el.componentName : "tag" in el ? el.tag : el.type} id="${el.id}"${childCount > 0 ? ` (${childCount} children)` : ""}`;
              }).join("\n");
              respond({
                content: [{
                  type: "text",
                  text: `${rootIds.length} top-level elements:\n${summary}\n\nUse canvas_read with element_id to read specific elements.`
                }]
              });
            } else respond({
              content: [{
                type: "text",
                text: jsx_1
              }]
            });
          }
          return;
        }
        if (operation === "claims_covering_element") {
          const elementId_0 = args.element_id;
          if (!elementId_0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "element_id is required"
              }]
            });
            return;
          }
          const found_0 = findElementTab(elementId_0);
          if (!found_0) {
            respond({
              content: [{
                type: "text",
                text: JSON.stringify({
                  claim_ids: []
                })
              }]
            });
            return;
          }
          const claimIds = new Set();
          for (const [lockedId, claimId_1] of elementLocksRef_0.current) if (lockedId === elementId_0 || isDescendant(found_0.store, lockedId, elementId_0)) claimIds.add(claimId_1);
          respond({
            content: [{
              type: "text",
              text: JSON.stringify({
                claim_ids: [...claimIds]
              })
            }]
          });
          return;
        }
        if (operation === "claim_has_locks") {
          const claimId_2 = args.claim_id;
          if (!claimId_2 || typeof claimId_2 !== "string") {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required"
              }]
            });
            return;
          }
          let hasLocks = false;
          for (const owner of elementLocksRef_0.current.values()) if (owner === claimId_2) {
            hasLocks = true;
            break;
          }
          respond({
            content: [{
              type: "text",
              text: JSON.stringify({
                has_locks: hasLocks
              })
            }]
          });
          return;
        }
        if (operation === "unlock_claims") {
          const unlockClaimIds = Array.isArray(args.claim_ids) ? args.claim_ids.filter(id_1 => typeof id_1 === "string" && !!id_1) : [];
          clearLocksForClaimIds(unlockClaimIds, elementLocksRef_0, claimIdToChatTabIdRef_0, setElementLocksVersion_0);
          respond({
            content: [{
              type: "text",
              text: `Unlocked ${unlockClaimIds.length} claim(s)`
            }]
          });
          return;
        }
        if (operation === "grep_canvas") {
          const patternStr = args.pattern;
          if (!patternStr || typeof patternStr !== "string") {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "pattern is required"
              }]
            });
            return;
          }
          let regex;
          try {
            regex = new RegExp(patternStr, args.case_insensitive ? "i" : "");
          } catch (e) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Invalid regex: ${e.message}`
              }]
            });
            return;
          }
          let store_1 = storeRef.current;
          let rootId = typeof args.root_id === "string" ? args.root_id : null;
          if (args.canvas_id) {
            const tab_1 = currentTabs.find(t_2 => t_2.canvasId === args.canvas_id || t_2.id === args.canvas_id);
            if (!tab_1) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Canvas not found: ${args.canvas_id}`
                }]
              });
              return;
            }
            if (!tab_1.loaded) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Canvas not loaded: ${args.canvas_id}`
                }]
              });
              return;
            }
            store_1 = tab_1.store;
          }
          if (rootId) {
            const found_1 = findElementTab(rootId);
            if (!found_1 || !getById(found_1.store, rootId)) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Element not found: ${rootId}`
                }]
              });
              return;
            }
            store_1 = found_1.store;
          }
          const candidates = rootId ? [rootId, ...getDescendantIds(store_1, rootId)] : [...getRootIds(store_1)].flatMap(id_2 => [id_2, ...getDescendantIds(store_1, id_2)]);
          const hits = new Map();
          for (const id_3 of candidates) {
            const hit = matchElementGrep(id_3, generateJSX(ensureV2([storeSubtreeToLegacyNested(store_1, id_3)]), 0, {
              includeDataElementId: true
            }), new RegExp(regex.source, regex.flags));
            if (hit) hits.set(id_3, hit.snippet);
          }
          const shadowed = new Set();
          for (const id_4 of hits.keys()) {
            let parent = getParentId(store_1, id_4);
            while (parent && parent !== "ROOT") {
              if (hits.has(parent)) shadowed.add(parent);
              parent = getParentId(store_1, parent);
            }
          }
          const matches = [];
          for (const [id_5, snippet] of hits) {
            if (shadowed.has(id_5)) continue;
            matches.push(`- ${id_5} (${elementLabel(store_1, id_5)}): ${snippet}`);
            if (matches.length >= GREP_MAX_RESULTS) break;
          }
          const kept = hits.size - shadowed.size;
          const truncated = kept > GREP_MAX_RESULTS ? `\n… truncated at ${GREP_MAX_RESULTS} of ${kept} matches` : "";
          respond({
            content: [{
              type: "text",
              text: matches.length > 0 ? `${matches.length} match(es):\n${matches.join("\n")}${truncated}` : `No matches for /${patternStr}/`
            }]
          });
          return;
        }
        if (operation === "query_canvas") {
          const selector = args.selector;
          if (!selector || typeof selector !== "string") {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "selector is required (e.g. \"table\", \"tbody tr\", \"th\")"
              }]
            });
            return;
          }
          let store_2 = storeRef.current;
          let rootId_0 = typeof args.root_id === "string" ? args.root_id : null;
          if (args.canvas_id) {
            const tab_2 = currentTabs.find(t_3 => t_3.canvasId === args.canvas_id || t_3.id === args.canvas_id);
            if (!tab_2) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Canvas not found: ${args.canvas_id}`
                }]
              });
              return;
            }
            store_2 = tab_2.store;
          }
          if (rootId_0) {
            const found_2 = findElementTab(rootId_0);
            if (!found_2 || !getById(found_2.store, rootId_0)) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Element not found: ${rootId_0}`
                }]
              });
              return;
            }
            store_2 = found_2.store;
          }
          const ids = queryCanvasIds(store_2, rootId_0, selector);
          const lines = ids.map(id_6 => `- ${id_6} (${elementLabel(store_2, id_6)})`);
          respond({
            content: [{
              type: "text",
              text: ids.length > 0 ? `${ids.length} element(s) matching "${selector}":\n${lines.join("\n")}` : `No elements matching "${selector}"`
            }]
          });
          return;
        }
        if (operation === "claim_element") {
          const elementId_1 = args.element_id;
          const claimId_3 = crypto.randomUUID();
          const chatTabId = args.chat_tab_id;
          clearLocksForClaimIds(Array.isArray(args.unlock_claim_ids) ? args.unlock_claim_ids.filter(id_7 => typeof id_7 === "string" && !!id_7) : [], elementLocksRef_0, claimIdToChatTabIdRef_0, setElementLocksVersion_0);
          const found_3 = findElementTab(elementId_1);
          if (!found_3 || !getById(found_3.store, elementId_1)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element not found: ${elementId_1}`
              }]
            });
            return;
          }
          const coveringHash = typeof args.covering_hash === "string" ? args.covering_hash : void 0;
          if (!coveringHash) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Cannot claim ${elementId_1}: no covering canvas_read. Call canvas_read with this element_id (or an ancestor) first, then canvas_claim.`
              }]
            });
            return;
          }
          if (hashElementSubtreeFrom(found_3.store, elementId_1) !== coveringHash) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Cannot claim ${elementId_1}: element changed since canvas_read. canvas_read again, then claim.`
              }]
            });
            return;
          }
          const lockOwner = elementLocksRef_0.current.get(elementId_1);
          if (lockOwner && lockOwner !== claimId_3) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element ${elementId_1} is already claimed by another agent.`
              }]
            });
            return;
          }
          for (const [lockedId_0, owner_0] of elementLocksRef_0.current) {
            if (owner_0 === claimId_3) continue;
            if (isDescendant(found_3.store, lockedId_0, elementId_1)) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Cannot claim ${elementId_1} — its parent ${lockedId_0} is claimed by another agent.`
                }]
              });
              return;
            }
          }
          const lockedChild = hasLockedDescendant(found_3.store, elementId_1, claimId_3, elementLocksRef_0.current);
          if (lockedChild) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Cannot claim ${elementId_1} — its child ${lockedChild} is claimed by another agent.`
              }]
            });
            return;
          }
          elementLocksRef_0.current.set(elementId_1, claimId_3);
          if (chatTabId) claimIdToChatTabIdRef_0.current.set(claimId_3, chatTabId);
          touchClaim(claimId_3);
          setElementLocksVersion_0(v => v + 1);
          respond({
            content: [{
              type: "text",
              text: `claim_id: ${claimId_3}`
            }]
          });
          return;
        }
        if (operation === "release_element") {
          const claimId_4 = args.claim_id;
          if (!claimId_4) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required"
              }]
            });
            return;
          }
          const locksForClaimBefore = clearLocksForClaimIds([claimId_4], elementLocksRef_0, claimIdToChatTabIdRef_0, setElementLocksVersion_0);
          if (locksForClaimBefore.length === 0) {
            respond({
              content: [{
                type: "text",
                text: `No locks held for claim_id ${claimId_4}`
              }]
            });
            return;
          }
          respond({
            content: [{
              type: "text",
              text: locksForClaimBefore.length === 1 ? `Released element ${locksForClaimBefore[0]}` : `Released ${locksForClaimBefore.length} elements: ${locksForClaimBefore.join(", ")}`
            }]
          });
          return;
        }
        if (operation === "add_to_canvas") {
          const canvasId_0 = args.canvas_id;
          const parentId_0 = args.parent_id;
          const jsx_3 = args.jsx;
          const claimId_5 = args.claim_id;
          const chatTabId_0 = args.chat_tab_id;
          if (parentId_0 && !claimId_5) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required when adding to a parent. Call canvas_claim on the parent element first."
              }]
            });
            return;
          }
          if (claimId_5 && chatTabId_0) claimIdToChatTabIdRef_0.current.set(claimId_5, chatTabId_0);
          const lintErr = lintRawHtmlControls(jsx_3, componentIndex)?.message ?? null;
          if (lintErr) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: lintErr
              }]
            });
            return;
          }
          const parsed_0 = parseCanvasInput(jsx_3, "canvas_add", true);
          const parsedRootIds = getRootIds(parsed_0);
          if (parsedRootIds.length === 0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "Failed to parse JSX"
              }]
            });
            return;
          }
          let targetTabId_0 = currentActiveTabId;
          if (canvasId_0) {
            const tab_3 = currentTabs.find(t_4 => t_4.canvasId === canvasId_0 || t_4.id === canvasId_0);
            if (!tab_3) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `Canvas not found: ${canvasId_0}`
                }]
              });
              return;
            }
            if (tab_3.id !== currentActiveTabId) {
              respond({
                isError: true,
                content: [{
                  type: "text",
                  text: `canvas_add can only write to the active canvas page. "${tab_3.name}" is not active; ask the user to open it, or call canvas_create_page to create and activate a new page.`
                }]
              });
              return;
            }
            targetTabId_0 = tab_3.id;
          }
          if (parentId_0) {
            const found_4 = findElementTab(parentId_0);
            if (found_4) {
              if (found_4.tabId !== currentActiveTabId) {
                respond({
                  isError: true,
                  content: [{
                    type: "text",
                    text: `canvas_add can only write to the active canvas page. The parent element is on a different page; ask the user to open that page first.`
                  }]
                });
                return;
              }
              targetTabId_0 = found_4.tabId;
            }
          }
          const targetStore_1 = resolveActiveStore(targetTabId_0, currentActiveTabId, storeRef, currentTabs);
          const targetCanvasId = currentTabs.find(t_5 => t_5.id === targetTabId_0)?.canvasId;
          if (!targetCanvasId || !UUID_RE.test(targetCanvasId)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Canvas not yet loaded — pages are still bootstrapping. Wait a moment and retry. (Internal: target canvasId is '${targetCanvasId ?? "undefined"}', not a UUID.)`
              }]
            });
            return;
          }
          resolvedCanvasId = targetCanvasId;
          expectedRevisionForResult = getCanvasRevision?.(targetTabId_0) ?? 0;
          let workingStore = dropPreviewsOnTab(targetTabId_0, targetStore_1);
          const candidate = createCanvasCommitCandidate(workingStore);
          const recorded = [];
          const explicitX = typeof args.x === "number" ? args.x : null;
          const explicitY = typeof args.y === "number" ? args.y : null;
          let xCursor = explicitX;
          const insertedIds = [];
          for (const rootId_1 of parsedRootIds) {
            const nested_1 = storeSubtreeToLegacyNested(parsed_0, rootId_1);
            insertedIds.push(rootId_1);
            if (parentId_0) {
              const index = getById(workingStore, parentId_0) ? getChildren$2(workingStore, parentId_0).length : 0;
              const insert = createInsertOperation(nested_1, parentId_0, index);
              recorded.push(insert);
              workingStore = appendCanvasCandidateOperation(candidate, insert);
            } else {
              const auto = nextRootPlacement(occupiedRootBoxes(workingStore));
              nested_1.canvasPosition = {
                x: xCursor ?? auto.x,
                y: explicitY ?? auto.y
              };
              if (xCursor !== null) xCursor += UNKNOWN_ROOT_WIDTH + 240;
              const index_0 = getRootIds(workingStore).length;
              const insert_0 = createInsertOperation(nested_1, null, index_0);
              recorded.push(insert_0);
              workingStore = appendCanvasCandidateOperation(candidate, insert_0);
            }
          }
          if (recorded.length > 0) {
            commitCanvasCandidate(candidate, currentStoreForTab(targetTabId_0), prepared => {
              (0, import_react_dom.flushSync)(() => {
                publishStore(targetTabId_0, prepared.nextStore);
                history.recordOperations(targetTabId_0, prepared.operations, prepared.nextStore);
                if (claimId_5) for (const insertedId of insertedIds) elementLocksRef_0.current.set(insertedId, claimId_5);
              });
            });
            setElementLocksVersion_0(v_1 => v_1 + 1);
          }
          createdElementIdsForResult = insertedIds;
          committedRevisionForResult = getCanvasRevision?.(targetTabId_0) ?? expectedRevisionForResult + 1;
          const lockNote = claimId_5 ? "\n\nThese elements are locked under your claim_id — use canvas_update/canvas_edit with the same claim_id to edit them." : "";
          respond({
            content: [{
              type: "text",
              text: `Added ${insertedIds.length} element(s). Element IDs:\n${insertedIds.map(id_8 => `- ${id_8}`).join("\n")}${lockNote}`
            }]
          });
          return;
        }
        if (operation === "insert_element") {
          const jsx_4 = args.jsx;
          const claimId_6 = args.claim_id;
          const beforeId = typeof args.before_id === "string" ? args.before_id : void 0;
          const afterId = typeof args.after_id === "string" ? args.after_id : void 0;
          const parentId_1 = typeof args.parent_id === "string" ? args.parent_id : void 0;
          const modeCount = [beforeId, afterId, parentId_1].filter(Boolean).length;
          if (!jsx_4) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "jsx is required"
              }]
            });
            return;
          }
          if (!claimId_6) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required. Call canvas_claim on the parent (or a claimed ancestor) first."
              }]
            });
            return;
          }
          if (modeCount !== 1) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "Provide exactly one of before_id, after_id, or parent_id."
              }]
            });
            return;
          }
          const lintErr_0 = lintRawHtmlControls(jsx_4, componentIndex)?.message ?? null;
          if (lintErr_0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: lintErr_0
              }]
            });
            return;
          }
          const anchorId = beforeId || afterId || parentId_1;
          const found_5 = findElementTab(anchorId);
          if (!found_5 || !getById(found_5.store, anchorId)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element not found: ${anchorId}`
              }]
            });
            return;
          }
          if (found_5.tabId !== currentActiveTabId) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "canvas_insert can only write to the active canvas page."
              }]
            });
            return;
          }
          let insertParentId;
          let insertIndex_0;
          if (parentId_1) {
            insertParentId = parentId_1;
            insertIndex_0 = typeof args.index === "number" ? args.index : getChildren$2(found_5.store, parentId_1).length;
          } else if (beforeId) {
            const p = getParentId(found_5.store, beforeId);
            insertParentId = p === "ROOT" || p === null ? null : p;
            insertIndex_0 = getIndex(found_5.store, beforeId);
          } else {
            const p_0 = getParentId(found_5.store, afterId);
            insertParentId = p_0 === "ROOT" || p_0 === null ? null : p_0;
            insertIndex_0 = getIndex(found_5.store, afterId) + 1;
          }
          const parentForClaim = insertParentId;
          if (!parentForClaim) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "canvas_insert cannot insert at the canvas root — use canvas_add for new top-level sections."
              }]
            });
            return;
          }
          if (!claimCoversElement(found_5.store, parentForClaim, claimId_6, elementLocksRef_0.current)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `claim_id does not cover parent ${parentForClaim}. Claim the parent (or an ancestor) first.`
              }]
            });
            return;
          }
          const parsed_1 = parseCanvasInput(jsx_4, "canvas_insert", true);
          const parsedRootIds_0 = getRootIds(parsed_1);
          if (parsedRootIds_0.length === 0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "Failed to parse JSX"
              }]
            });
            return;
          }
          let workingStore_0 = dropPreviewsOnTab(found_5.tabId, resolveActiveStore(found_5.tabId, currentActiveTabId, storeRef, currentTabs, found_5.store));
          resolvedCanvasId = currentTabs.find(tab => tab.id === found_5.tabId)?.canvasId ?? null;
          expectedRevisionForResult = getCanvasRevision?.(found_5.tabId) ?? 0;
          const candidate_0 = createCanvasCommitCandidate(workingStore_0);
          const recorded_0 = [];
          const insertedIds_0 = [];
          let indexCursor = insertIndex_0;
          for (const rootId_2 of parsedRootIds_0) {
            const nested_2 = storeSubtreeToLegacyNested(parsed_1, rootId_2);
            insertedIds_0.push(rootId_2);
            const insert_1 = createInsertOperation(nested_2, insertParentId, indexCursor);
            recorded_0.push(insert_1);
            workingStore_0 = appendCanvasCandidateOperation(candidate_0, insert_1);
            indexCursor += 1;
          }
          commitCanvasCandidate(candidate_0, currentStoreForTab(found_5.tabId), prepared_0 => {
            (0, import_react_dom.flushSync)(() => {
              publishStore(found_5.tabId, prepared_0.nextStore);
              history.recordOperations(found_5.tabId, prepared_0.operations, prepared_0.nextStore);
              for (const insertedId_0 of insertedIds_0) elementLocksRef_0.current.set(insertedId_0, claimId_6);
            });
          });
          createdElementIdsForResult = insertedIds_0;
          parentElementIdForResult = insertParentId;
          committedRevisionForResult = getCanvasRevision?.(found_5.tabId) ?? expectedRevisionForResult + 1;
          setElementLocksVersion_0(v_2 => v_2 + 1);
          respond({
            content: [{
              type: "text",
              text: `Inserted ${insertedIds_0.length} element(s) at index ${insertIndex_0} under ${insertParentId}.\n${insertedIds_0.map(id_9 => `- ${id_9}`).join("\n")}`
            }]
          });
          return;
        }
        if (operation === "edit_element") {
          const elementId_2 = args.element_id;
          const oldString = args.old_string;
          const newString = args.new_string;
          const claimId_7 = args.claim_id;
          if (!elementId_2 || oldString === void 0 || newString === void 0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "element_id, old_string, and new_string are required"
              }]
            });
            return;
          }
          if (!claimId_7) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required. Call canvas_claim on this element first."
              }]
            });
            return;
          }
          const found_6 = findElementTab(elementId_2);
          if (!found_6 || !getById(found_6.store, elementId_2)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element not found: ${elementId_2}`
              }]
            });
            return;
          }
          if (!claimCoversElement(found_6.store, elementId_2, claimId_7, elementLocksRef_0.current)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element ${elementId_2} is not covered by claim_id. Claim it (or an ancestor) first.`
              }]
            });
            return;
          }
          const previousNested = storeSubtreeToLegacyNested(found_6.store, elementId_2);
          const currentJsx = generateJSX(ensureV2([previousNested]), 0, {
            includeDataElementId: true
          });
          const edited = applyJsxStringEdit(currentJsx, oldString, newString, !!args.replace_all);
          if (edited.error || !edited.content) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: edited.error || "Edit failed"
              }]
            });
            return;
          }
          const lintErr_1 = lintNewlyIntroducedRawHtmlControls(currentJsx, edited.content, componentIndex)?.message ?? null;
          if (lintErr_1) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: lintErr_1
              }]
            });
            return;
          }
          const parsed_2 = parseCanvasInput(edited.content, "canvas_edit", false, currentJsx);
          const parsedRootIds_1 = getRootIds(parsed_2);
          if (parsedRootIds_1.length === 0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "Failed to parse edited JSX"
              }]
            });
            return;
          }
          const claimedIds = claimedSubtreeIdSet(found_6.store, elementId_2);
          const storeIds = allStoreIdSet(found_6.store);
          const normalized = normalizeUpdateSubtree(previousNested, storeSubtreeToLegacyNested(parsed_2, parsedRootIds_1[0]), claimedIds, storeIds);
          if (normalized.error) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: normalized.error
              }]
            });
            return;
          }
          const newElement = normalized.element;
          if (previousNested.canvasPosition) newElement.canvasPosition = previousNested.canvasPosition;
          newElement.id = elementId_2;
          const summary_0 = summarizeSubtreeChange(previousNested, newElement);
          const targetStore_2 = resolveActiveStore(found_6.tabId, currentActiveTabId, storeRef, currentTabs, found_6.store);
          resolvedCanvasId = currentTabs.find(tab => tab.id === found_6.tabId)?.canvasId ?? null;
          expectedRevisionForResult = getCanvasRevision?.(found_6.tabId) ?? 0;
          const op = createReplaceOperation(targetStore_2, elementId_2, newElement);
          if (op) {
            const nextStore_0 = history.pushOperation(found_6.tabId, targetStore_2, op);
            applyStoreUpdate(found_6.tabId, currentActiveTabId, nextStore_0, setStore, storeRef, setTabStoreById);
            committedRevisionForResult = getCanvasRevision?.(found_6.tabId) ?? expectedRevisionForResult + 1;
          }
          respond({
            content: [{
              type: "text",
              text: `Edited element ${elementId_2} (${edited.replacements ?? 1} replacement(s)). Change summary: preserved=${summary_0.nodes_preserved}, added=${summary_0.nodes_added}, removed=${summary_0.nodes_removed}`
            }]
          });
          return;
        }
        if (operation === "update_element") {
          const elementId_3 = args.element_id;
          const jsx_5 = args.jsx;
          const claimId_8 = args.claim_id;
          if (!claimId_8) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required"
              }]
            });
            return;
          }
          if (typeof jsx_5 === "string" && jsxContainsTruncationStub(jsx_5)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "jsx contains bingo:truncated stubs from a truncated canvas_read. Drill with canvas_read on stub ids (or claim a smaller root) and send complete JSX without truncation stubs."
              }]
            });
            return;
          }
          const found_7 = findElementTab(elementId_3);
          if (!found_7 || !getById(found_7.store, elementId_3)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element not found: ${elementId_3}`
              }]
            });
            return;
          }
          if (!claimCoversElement(found_7.store, elementId_3, claimId_8, elementLocksRef_0.current)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element ${elementId_3} is not covered by claim_id. Claim it (or an ancestor) first.`
              }]
            });
            return;
          }
          const lintErr_2 = lintRawHtmlControls(jsx_5, componentIndex)?.message ?? null;
          if (lintErr_2) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: lintErr_2
              }]
            });
            return;
          }
          const parsed_3 = parseCanvasInput(jsx_5, "canvas_update");
          const parsedRootIds_2 = getRootIds(parsed_3);
          if (parsedRootIds_2.length === 0) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "Failed to parse JSX"
              }]
            });
            return;
          }
          const newElementNested = storeSubtreeToLegacyNested(parsed_3, parsedRootIds_2[0]);
          const targetTabId_1 = found_7.tabId;
          resolvedCanvasId = currentTabs.find(tab => tab.id === targetTabId_1)?.canvasId ?? null;
          expectedRevisionForResult = getCanvasRevision?.(targetTabId_1) ?? 0;
          const targetStore_3 = resolveActiveStore(targetTabId_1, currentActiveTabId, storeRef, currentTabs, found_7.store);
          const previousNested_0 = storeSubtreeToLegacyNested(targetStore_3, elementId_3);
          const normalized_0 = normalizeUpdateSubtree(previousNested_0, newElementNested, claimedSubtreeIdSet(targetStore_3, elementId_3), allStoreIdSet(targetStore_3));
          if (normalized_0.error) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: normalized_0.error
              }]
            });
            return;
          }
          const newElement_0 = normalized_0.element;
          if (previousNested_0.canvasPosition) newElement_0.canvasPosition = previousNested_0.canvasPosition;
          newElement_0.id = elementId_3;
          const summary_1 = summarizeSubtreeChange(previousNested_0, newElement_0);
          const op_0 = createReplaceOperation(targetStore_3, elementId_3, newElement_0);
          if (op_0) {
            applyStoreUpdate(targetTabId_1, currentActiveTabId, history.pushOperation(targetTabId_1, targetStore_3, op_0), setStore, storeRef, setTabStoreById);
            committedRevisionForResult = getCanvasRevision?.(targetTabId_1) ?? expectedRevisionForResult + 1;
          }
          respond({
            content: [{
              type: "text",
              text: `Updated element ${elementId_3}. Change summary: preserved=${summary_1.nodes_preserved}, added=${summary_1.nodes_added}, removed=${summary_1.nodes_removed}`
            }]
          });
          return;
        }
        if (operation === "delete_element") {
          const elementId_4 = args.element_id;
          const claimId_9 = args.claim_id;
          if (!claimId_9) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: "claim_id is required"
              }]
            });
            return;
          }
          const found_8 = findElementTab(elementId_4);
          if (!found_8 || !getById(found_8.store, elementId_4)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element not found: ${elementId_4}`
              }]
            });
            return;
          }
          if (!claimCoversElement(found_8.store, elementId_4, claimId_9, elementLocksRef_0.current)) {
            respond({
              isError: true,
              content: [{
                type: "text",
                text: `Element ${elementId_4} is not covered by claim_id. Claim it (or an ancestor) first.`
              }]
            });
            return;
          }
          const targetTabId_2 = found_8.tabId;
          resolvedCanvasId = currentTabs.find(tab => tab.id === targetTabId_2)?.canvasId ?? null;
          expectedRevisionForResult = getCanvasRevision?.(targetTabId_2) ?? 0;
          const targetStore_4 = resolveActiveStore(targetTabId_2, currentActiveTabId, storeRef, currentTabs, found_8.store);
          const descendantIds = getDescendantIds(targetStore_4, elementId_4);
          const op_1 = createRemoveOperation(targetStore_4, elementId_4);
          if (op_1) {
            applyStoreUpdate(targetTabId_2, currentActiveTabId, history.pushOperation(targetTabId_2, targetStore_4, op_1), setStore, storeRef, setTabStoreById);
            committedRevisionForResult = getCanvasRevision?.(targetTabId_2) ?? expectedRevisionForResult + 1;
          }
          elementLocksRef_0.current.delete(elementId_4);
          for (const id_10 of descendantIds) elementLocksRef_0.current.delete(id_10);
          setElementLocksVersion_0(v_3 => v_3 + 1);
          respond({
            content: [{
              type: "text",
              text: `Deleted element ${elementId_4}`
            }]
          });
          return;
        }
        respond({
          isError: true,
          content: [{
            type: "text",
            text: `Unknown canvas operation: ${operation}`
          }]
        });
      } catch (err) {
        respond({
          isError: true,
          content: [{
            type: "text",
            text: `Canvas operation error: ${err}`
          }],
          ...(err instanceof CanvasRevisionConflictError || err.code ? {
            structuredContent: {
              operation: {
                errorCode: err.code,
                applied: false
              }
            }
          } : {})
        });
      }
    });
    return () => {
      unsub();
      stopClaimSweep();
    };
  }, []);
}

export { useCanvasToolHandler };
