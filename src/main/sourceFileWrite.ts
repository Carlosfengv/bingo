import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const sha256 = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");

export function readSourceSnapshot(file: string) {
  try {
    const bytes = fs.readFileSync(file);
    return { content: bytes.toString("utf8"), hash: sha256(bytes) };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function sourceConflict(file: string, expectedHash: string | null, actualHash: string | null) {
  const error = new Error(`Source changed while the edit was being prepared: ${file}`);
  error.code = "SOURCE_CONFLICT";
  error.details = { path: file, expectedHash, actualHash };
  return error;
}

/** The caller authorizes and validates the target; this function owns the final write. */
export function writeSourceFile(file: string, content: string, options: {
  expectedHash?: string;
  createOnly?: boolean;
  validate?: () => void;
  beforeWrite?: (oldContent: string) => void;
}) {
  if ((options.createOnly === true) === (typeof options.expectedHash === "string")) {
    throw new Error("A source write requires exactly one precondition");
  }
  options.validate?.();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  options.validate?.();
  const previous = readSourceSnapshot(file);
  if (options.createOnly ? previous !== null : previous?.hash !== options.expectedHash) {
    throw sourceConflict(file, options.createOnly ? null : options.expectedHash!, previous?.hash ?? null);
  }
  const bytes = Buffer.from(content ?? "", "utf8");
  const hash = sha256(bytes);
  if (previous?.hash === hash) return { success: true, hash, changed: false };

  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    const mode = previous ? fs.statSync(file).mode & 0o777 : 0o644;
    descriptor = fs.openSync(temporary, "wx", mode);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    options.validate?.();
    const latest = readSourceSnapshot(file);
    if (latest?.hash !== previous?.hash) {
      throw sourceConflict(file, previous?.hash ?? null, latest?.hash ?? null);
    }
    if (previous) options.beforeWrite?.(previous.content);
    fs.renameSync(temporary, file);
    return { success: true, hash, changed: true };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporary); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
}
