import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { beginCanvasSelection, commitCanvasSelection, getCanvasPerformance, measureCanvasWork, resetCanvasPerformance, setCanvasPerformanceEnabled, summarizeSample } from "../../canvas/lib/canvasPerformance";

const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
const originals = { raf: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame, document: globalThis.document };
globalThis.requestAnimationFrame = cb => { const id = ++nextId; frames.set(id, cb); return id; };
globalThis.cancelAnimationFrame = id => { frames.delete(id); };
globalThis.document = { hidden: false } as Document;
afterEach(() => { setCanvasPerformanceEnabled(false); frames.clear(); });
process.on("exit", () => Object.assign(globalThis, { requestAnimationFrame: originals.raf, cancelAnimationFrame: originals.cancel, document: originals.document }));
const viewport = (...ids: string[]) => ({ querySelectorAll: () => ids.map(id => ({ dataset: { selectionOverlayId: id } })) }) as unknown as HTMLElement;
const flushFrames = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(performance.now())); };

test("disabled diagnostics do not collect, work values and exceptions are preserved", () => {
  assert.equal(measureCanvasWork("tree", () => 42), 42);
  assert.equal(getCanvasPerformance().tree.count, 0);
  setCanvasPerformanceEnabled(true);
  assert.throws(() => measureCanvasWork("tree", () => { throw new Error("render failed"); }), /render failed/);
  assert.equal(getCanvasPerformance().tree.count, 1);
});
test("selection waits for the matching overlay and excludes unchanged selections", () => {
  setCanvasPerformanceEnabled(true);
  beginCanvasSelection(performance.now(), ["a"]);
  commitCanvasSelection(new Set(["a"]), viewport("a"));
  commitCanvasSelection(new Set(["b"]), viewport("a"));
  assert.equal(getCanvasPerformance().selection.count, 0);
  commitCanvasSelection(new Set(["b"]), viewport("b"));
  assert.equal(getCanvasPerformance().selection.count, 1);
  assert.equal(getCanvasPerformance().nextFrame.count, 0);
  flushFrames();
  assert.equal(getCanvasPerformance().nextFrame.count, 1);
});
test("no-op clicks expire; reset cancels pending frame samples", () => {
  setCanvasPerformanceEnabled(true);
  beginCanvasSelection(performance.now(), ["a"]);
  flushFrames();
  commitCanvasSelection(new Set(["b"]), viewport("b"));
  assert.equal(getCanvasPerformance().selection.count, 0);
  beginCanvasSelection(performance.now(), ["a"]);
  commitCanvasSelection(new Set(), viewport());
  assert.equal(getCanvasPerformance().selection.count, 1);
  resetCanvasPerformance();
  flushFrames();
  assert.equal(getCanvasPerformance().nextFrame.count, 0);
});
test("P95 uses nearest rank and empty samples have no fabricated timing", () => {
  assert.equal(summarizeSample({ count: 0, total: 0, values: [] }).p95, null);
  assert.equal(summarizeSample({ count: 20, total: 210, values: Array.from({ length: 20 }, (_, i) => 20 - i) }).p95, 19);
});
