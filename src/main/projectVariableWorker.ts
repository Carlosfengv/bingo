import { parentPort } from "node:worker_threads";
import { readProjectVariables, writeProjectVariables } from "./projectVariables";

parentPort!.on("message", ({ id, operation, root, manifest, input }) => {
  parentPort!.postMessage({ id, started: true });
  try { parentPort!.postMessage({ id, value: operation === "write" ? writeProjectVariables(root, input, manifest) : readProjectVariables(root, manifest) }); }
  catch (error) { parentPort!.postMessage({ id, error: { message: String(error?.message || error), code: error?.code } }); }
});
