import { Worker } from "node:worker_threads";
import path from "node:path";

let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function stop(current: Worker, error: Error) {
  if (worker !== current) return;
  worker = undefined;
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
  pending.clear();
  void current.terminate();
}
export function disposeProjectVariableReader() {
  if (worker) stop(worker, new Error("Project variable reader closed."));
}
export function readProjectVariablesAsync(root: string, manifest: any): Promise<any> {
  if (!worker) {
    const current = worker = new Worker(path.join(__dirname, "projectVariableWorker.js"));
    current.on("message", ({ id, value, error }) => {
      if (worker !== current) return;
      const request = pending.get(id);
      if (!request) return;
      pending.delete(id); clearTimeout(request.timer);
      if (error) request.reject(Object.assign(new Error(error.message), { code: error.code }));
      else request.resolve(value);
      if (!pending.size) current.unref();
    });
    current.on("error", error => stop(current, error));
    current.on("exit", code => stop(current, new Error(`Project variable reader exited (${code}).`)));
    current.unref();
  }
  const current = worker;
  current.ref();
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => stop(current, new Error("Project variable scan timed out.")), 10_000);
    pending.set(id, { resolve, reject, timer });
    try { current.postMessage({ id, root, manifest }); }
    catch (error) { stop(current, error as Error); }
  });
}
