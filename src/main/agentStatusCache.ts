/** Shared by all project renderers; rejected requests are briefly cached too. */
export class AgentStatusCache<T> {
  private generation = 0;
  private value?: T;
  private error?: unknown;
  private expires = 0;
  private pending?: Promise<T>;
  constructor(private probe: (force: boolean) => Promise<T>, private healthy: (value: T) => boolean,
    private now = Date.now) {}
  invalidate() { this.generation++; this.expires = 0; }
  async get(force = false): Promise<T> {
    if (this.pending) return this.pending;
    if (!force && this.now() < this.expires) {
      if (this.error) throw this.error;
      return this.value!;
    }
    const run = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const generation = this.generation;
        try {
          const next = await this.probe(force || attempt > 0 || this.value === undefined || !this.healthy(this.value));
          if (generation !== this.generation) continue;
          this.value = next; this.error = undefined;
          this.expires = this.now() + (this.healthy(next) ? 30_000 : 3_000);
          return next;
        } catch (error) {
          if (generation !== this.generation) continue;
          this.error = error; this.expires = this.now() + 3_000;
          throw error;
        }
      }
      throw new Error("Agent configuration changed during detection. Retry.");
    };
    this.pending = run().finally(() => { this.pending = undefined; });
    return this.pending;
  }
}
