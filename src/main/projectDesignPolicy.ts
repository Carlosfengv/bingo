import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = 1;
const PROJECT_DATA_DIR = "local-project-data";

let userDataRoot = null;

function configureProjectDesignPolicy(options = {}) {
  userDataRoot = typeof options.userDataRoot === "string" ? path.resolve(options.userDataRoot) : null;
}

function projectStorageKey(root) {
  return crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
}

function policyFile(root) {
  if (!userDataRoot) return null;
  return path.join(userDataRoot, PROJECT_DATA_DIR, projectStorageKey(root), "design-storage-policy.json");
}

function readProjectDesignPolicy(root) {
  const file = policyFile(root);
  if (!file) return null;
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value?.schemaVersion !== SCHEMA_VERSION || !["app", "project"].includes(value.mode)) return null;
    return { schemaVersion: SCHEMA_VERSION, mode: value.mode };
  } catch {
    return null;
  }
}

function writeProjectDesignPolicy(root, mode) {
  if (!["app", "project"].includes(mode)) throw new Error(`Invalid design storage mode: ${mode}`);
  const file = policyFile(root);
  if (!file) throw new Error("Design storage policy has not been configured.");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const value = { schemaVersion: SCHEMA_VERSION, mode };
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try { if (fs.readFileSync(file, "utf8") === text) return value; } catch {}
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(temporary); } catch {}
  }
  return value;
}

export { configureProjectDesignPolicy, readProjectDesignPolicy, writeProjectDesignPolicy };
