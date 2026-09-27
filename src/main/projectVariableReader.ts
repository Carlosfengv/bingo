import { Worker } from "node:worker_threads";
import path from "node:path";

let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer?: ReturnType<typeof setTimeout>; operation: "read" | "write" }>();
const pendingWrites = new Set<Promise<any>>();

function stop(current: Worker, error: Error) {
  if (worker !== current) return;
  worker = undefined;
  for (const request of pending.values()) { if (request.timer) clearTimeout(request.timer); request.reject(error); }
  pending.clear();
  void current.terminate();
}
export function disposeProjectVariableReader() {
  if (worker) stop(worker, new Error("Project variable reader closed."));
}
export function hasPendingProjectVariableWrites() { return pendingWrites.size > 0; }
export async function waitForProjectVariableWrites() { await Promise.allSettled([...pendingWrites]); }
function requestProjectVariables(operation: "read" | "write", root: string, manifest: any, input?: any): Promise<any> {
  if (!worker) {
    const current = worker = new Worker(path.join(__dirname, "projectVariableWorker.js"));
    current.on("message", ({ id, value, error, started }) => {
      if (worker !== current) return;
      const request = pending.get(id);
      if (!request) return;
      if (started) {
        if (request.operation === "read") request.timer = setTimeout(() => stop(current, new Error("Project variable scan timed out.")), 10_000);
        return;
      }
      pending.delete(id); if (request.timer) clearTimeout(request.timer);
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
    pending.set(id, { resolve, reject, operation });
    try { current.postMessage({ id, operation, root, manifest, input }); }
    catch (error) { stop(current, error as Error); }
  });
}

export function readProjectVariablesAsync(root: string, manifest: any): Promise<any> {
  return requestProjectVariables("read", root, manifest);
}

export function writeProjectVariablesAsync(root: string, input: any, manifest: any): Promise<any> {
  const request = requestProjectVariables("write", root, manifest, input);
  pendingWrites.add(request);
  void request.then(() => pendingWrites.delete(request), () => pendingWrites.delete(request));
  return request;
}
