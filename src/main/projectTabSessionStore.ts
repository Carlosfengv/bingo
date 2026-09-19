import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

async function writeAtomic(file: string, text: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try { await fs.writeFile(temporary, text, { mode: 0o600 }); await fs.rename(temporary, file); }
  finally { await fs.unlink(temporary).catch(() => {}); }
}

/** One writer for every window: last snapshot wins, never parallel renames. */
export class ProjectTabSessionStore {
  private latest?: string;
  private persisted?: string;
  private pending?: Promise<void>;
  private debounce?: ReturnType<typeof setTimeout>;
  private deadline?: ReturnType<typeof setTimeout>;
  constructor(private file: () => string, private write = writeAtomic,
    private onError = (error: unknown) => console.warn("[ProjectTabs] Session save failed:", error)) {}
  set(value: unknown) {
    const text = JSON.stringify(value);
    if (this.latest === text) return;
    this.latest = text;
    clearTimeout(this.debounce);
    const save = () => { void this.flush().catch(this.onError); };
    this.debounce = setTimeout(save, 250); this.debounce.unref?.();
    if (!this.deadline) { this.deadline = setTimeout(save, 1000); this.deadline.unref?.(); }
  }
  flush(): Promise<void> {
    clearTimeout(this.debounce); clearTimeout(this.deadline);
    this.debounce = this.deadline = undefined;
    if (this.pending) return this.pending;
    this.pending = (async () => {
      while (this.latest !== undefined && this.latest !== this.persisted) {
        const text = this.latest;
        await this.write(this.file(), text);
        this.persisted = text;
      }
    })().finally(() => { this.pending = undefined; });
    return this.pending;
  }
}
