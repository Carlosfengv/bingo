import { parentPort } from "node:worker_threads";
import { readProjectVariables } from "./projectVariables";

parentPort!.on("message", ({ id, root, manifest }) => {
  try { parentPort!.postMessage({ id, value: readProjectVariables(root, manifest) }); }
  catch (error) { parentPort!.postMessage({ id, error: { message: String(error?.message || error), code: error?.code } }); }
});
