import crypto from "node:crypto";
import type { readProjectVariables } from "./projectVariables";

type Snapshot = ReturnType<typeof readProjectVariables> & { snapshotKey: string };
type Entry = {
  manifest: any; signature: string; generation: number; validatedAt: number;
  snapshot?: Snapshot; pending?: Promise<Snapshot>; bytes: number; disposed: boolean;
};

/** Read cache only. Writes must continue to validate against current disk contents. */
export class ProjectVariableCache {
  private entries = new Map<string, Entry>();
  constructor(private read: (root: string, manifest: any) => Promise<ReturnType<typeof readProjectVariables>>,
    private options = { ttlMs: 30_000, maxEntries: 32, maxBytes: 64 * 1024 * 1024, now: Date.now }) {}

  invalidate(root: string) {
    const entry = this.entries.get(root);
    if (!entry) return;
    entry.generation++;
    entry.validatedAt = -Infinity;
  }
  delete(root: string) {
    const entry = this.entries.get(root);
    if (entry) entry.disposed = true;
    this.entries.delete(root);
  }
  clear() { for (const root of this.entries.keys()) this.delete(root); }

  async get(root: string, manifest?: any, knownSnapshotKey?: string, force = false) {
    const signature = JSON.stringify(manifest ?? null);
    let entry = this.entries.get(root);
    if (!entry) {
      entry = { manifest, signature, generation: 0, validatedAt: -Infinity, bytes: 0, disposed: false };
      this.entries.set(root, entry);
    } else if (entry.signature !== signature) {
      entry.signature = signature;
      entry.manifest = manifest;
      this.invalidate(root);
    }
    this.entries.delete(root); this.entries.set(root, entry);
    // Explicit concurrent rechecks share their already-running validation.
    if (force && !entry.pending) this.invalidate(root);
    let snapshot = entry.snapshot;
    if (!snapshot || this.options.now() - entry.validatedAt >= this.options.ttlMs) {
      if (!entry.pending) {
        const current = entry;
        current.pending = this.refresh(root, current).finally(() => { current.pending = undefined; });
      }
      snapshot = await entry.pending;
    }
    this.trim();
    return knownSnapshotKey && knownSnapshotKey === snapshot.snapshotKey
      ? { unchanged: true as const, snapshotKey: snapshot.snapshotKey }
      : snapshot;
  }
  private async refresh(root: string, entry: Entry): Promise<Snapshot> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const generation = entry.generation, signature = entry.signature;
      const value = await this.read(root, entry.manifest);
      if (entry.disposed) throw new Error("Project variable read was closed.");
      if (generation !== entry.generation || signature !== entry.signature) continue;
      const text = JSON.stringify({ signature, ...value });
      const snapshot = { ...value, snapshotKey: crypto.createHash("sha256").update(text).digest("hex") };
      entry.bytes = Buffer.byteLength(text);
      entry.snapshot = entry.bytes <= this.options.maxBytes ? snapshot : undefined;
      entry.validatedAt = this.options.now();
      return snapshot;
    }
    throw new Error("Project variables are changing. Retry after the files settle.");
  }
  private trim() {
    let bytes = [...this.entries.values()].reduce((sum, entry) => sum + entry.bytes, 0);
    for (const [root, entry] of this.entries) {
      if (this.entries.size <= this.options.maxEntries && bytes <= this.options.maxBytes) break;
      if (entry.pending) continue;
      bytes -= entry.bytes; this.delete(root);
    }
  }
}

const excluded = new Set(["node_modules", ".git", ".next", ".nuxt", "dist", "build", "out", "coverage", ".cache", ".turbo"]);
/** Also invalidate discovery on unknown directory rename events, not just old source files. */
export function variableFileChangeMatters(file: string, watched: Set<string> = new Set(), renamed = false) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || watched.has(normalized) || normalized === ".bingo/config.json" || normalized === ".bingo/design/variables.json") return true;
  const parts = normalized.split("/");
  if (parts.some(part => excluded.has(part)) || parts[0] === ".bingo") return false;
  return renamed || /\.css$/i.test(normalized) || !parts.at(-1)?.includes(".");
}
