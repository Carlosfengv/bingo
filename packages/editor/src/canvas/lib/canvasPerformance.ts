// Opt-in diagnostics. Samples are bounded and the toolbar polls them independently
// so recording a render never schedules another canvas render.
export type WorkKind = "variables" | "tree" | "renderNode" | "geometry" | "codegen";
type Sample = { count: number; total: number; values: number[] };
const emptySample = (): Sample => ({ count: 0, total: 0, values: [] });
const limit = 120;
let enabled = false;
let generation = 0;
let pending: { startedAt: number; previous: string; generation: number } | null = null;
let frame: number | null = null;
let samples = freshSamples();

function freshSamples() {
  return { variables: emptySample(), tree: emptySample(), renderNode: emptySample(), geometry: emptySample(), codegen: emptySample(), selection: emptySample(), nextFrame: emptySample() };
}
function add(sample: Sample, ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  sample.count++;
  sample.total += ms;
  sample.values.push(ms);
  if (sample.values.length > limit) sample.values.shift();
}
export function summarizeSample(sample: Sample) {
  const sorted = [...sample.values].sort((a, b) => a - b);
  return { count: sample.count, total: sample.total, last: sample.values.at(-1) ?? null,
    p95: sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : null };
}
export function resetCanvasPerformance() {
  generation++;
  pending = null;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  samples = freshSamples();
}
export function setCanvasPerformanceEnabled(value: boolean) {
  enabled = value;
  resetCanvasPerformance();
}
export function measureCanvasWork<T>(kind: WorkKind, work: () => T): T {
  if (!enabled) return work();
  const startedAt = performance.now();
  try { return work(); } finally { add(samples[kind], performance.now() - startedAt); }
}
const selectionKey = (ids: Iterable<string>) => JSON.stringify([...ids].sort());
export function beginCanvasSelection(startedAt: number, previousIds: Iterable<string>) {
  if (!enabled) return;
  // A newer click supersedes a pending next-frame sample.
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  pending = { startedAt, previous: selectionKey(previousIds), generation };
  // Discrete selection commits synchronously. Ignore no-op clicks rather than
  // attributing a later keyboard/sidebar selection to an earlier canvas click.
  frame = requestAnimationFrame(() => { frame = null; pending = null; });
}
export function commitCanvasSelection(ids: Set<string>, viewport: HTMLElement | null) {
  if (!enabled || !pending || !viewport || document.hidden) return;
  if (performance.now() - pending.startedAt > 2000) { pending = null; return; }
  const key = selectionKey(ids);
  if (key === pending.previous) return;
  const paintedIds = Array.from(viewport.querySelectorAll<HTMLElement>("[data-selection-overlay-id]"), node => node.dataset.selectionOverlayId!);
  if (selectionKey(paintedIds) !== key) return;
  const click = pending;
  pending = null;
  if (frame !== null) cancelAnimationFrame(frame);
  add(samples.selection, performance.now() - click.startedAt);
  frame = requestAnimationFrame(() => {
    frame = null;
    if (enabled && generation === click.generation && !document.hidden) add(samples.nextFrame, performance.now() - click.startedAt);
  });
}
export function getCanvasPerformance() {
  return Object.fromEntries(Object.entries(samples).map(([key, sample]) => [key, summarizeSample(sample)])) as Record<WorkKind | "selection" | "nextFrame", ReturnType<typeof summarizeSample>>;
}
