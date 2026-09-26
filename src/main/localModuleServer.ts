import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

type ModuleRef = { path: string; codeUrl: string; cssImports?: string[] };

const token = crypto.randomBytes(24).toString("hex");
const sources = new Map<string, string>();
const projectDigests = new Map<string, Set<string>>();
const staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const assetTypes = new Map([
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".gif", "image/gif"], [".webp", "image/webp"], [".avif", "image/avif"],
  [".svg", "image/svg+xml"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"],
  [".ttf", "font/ttf"], [".otf", "font/otf"],
  [".mp4", "video/mp4"], [".webm", "video/webm"],
]);
let runtimeDirectory: string | null = null;
let server: http.Server | null = null;
let starting: Promise<number> | null = null;

function ensureRuntimeDirectory(): string {
  runtimeDirectory ||= fs.mkdtempSync(path.join(os.tmpdir(), "bingo-compiled-modules-"));
  return runtimeDirectory;
}

function decodeModule(codeUrl: string): Buffer {
  const comma = codeUrl.indexOf(",");
  if (comma < 0 || !codeUrl.slice(0, comma).endsWith(";base64")) throw new Error("Invalid compiled module URL");
  return Buffer.from(codeUrl.slice(comma + 1), "base64");
}

function digestFromUrl(codeUrl: string): string | null {
  const match = new RegExp(`^http://127\\.0\\.0\\.1:\\d+/module/${token}/([a-f0-9]{64})\\.js$`).exec(codeUrl);
  return match?.[1] || null;
}

function moduleUrl(port: number, digest: string): string {
  return `http://127.0.0.1:${port}/module/${token}/${digest}.js`;
}

async function serveProjectAsset(req: http.IncomingMessage, res: http.ServerResponse, requestUrl: URL): Promise<void> {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") throw new Error("Invalid method");
    const root = requestUrl.searchParams.get("root") || "";
    const assetPath = requestUrl.searchParams.get("path") || "";
    if (!projectDigests.has(root) || !assetPath || assetPath.includes("\0")) throw new Error("Invalid project asset");
    const portable = /^bingo-asset:([a-f0-9]{64}\.[a-z0-9]{1,12})$/i.exec(assetPath);
    const projectRoot = await fsPromises.realpath(root);
    const assetRoot = await fsPromises.realpath(path.join(projectRoot, portable ? ".bingo/design/assets" : "public"));
    const requested = path.join(assetRoot, portable ? portable[1] : assetPath.replace(/^\/+/, ""));
    const file = await fsPromises.realpath(requested);
    if (!assetRoot.startsWith(projectRoot + path.sep) || !file.startsWith(assetRoot + path.sep)) {
      throw new Error("Forbidden project asset");
    }
    const stat = await fsPromises.stat(file);
    if (!stat.isFile()) throw new Error("Invalid project asset");
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Content-Type": assetTypes.get(path.extname(file).toLowerCase()) || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(file).once("error", () => res.destroy()).pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(404).end();
    else res.destroy();
  }
}

function startServer(): Promise<number> {
  if (starting) return starting;
  starting = new Promise((resolve, reject) => {
    const next = http.createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      if (requestUrl.pathname === `/asset/${token}`) {
        void serveProjectAsset(req, res, requestUrl);
        return;
      }
      const match = /^\/module\/([a-f0-9]{48})\/([a-f0-9]{64})\.js$/.exec(req.url || "");
      const file = match?.[1] === token ? sources.get(match[2]) : null;
      if (!file || (req.method !== "GET" && req.method !== "HEAD")) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (req.method === "HEAD") { res.writeHead(200).end(); return; }
      const stream = fs.createReadStream(file);
      stream.once("error", () => {
        if (!res.headersSent) res.writeHead(404).end();
        else res.destroy();
      });
      stream.pipe(res);
    });
    next.once("error", error => { starting = null; reject(error); });
    next.listen(0, "127.0.0.1", () => {
      server = next;
      next.unref();
      const address = next.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
  return starting;
}

/** Write each esbuild output once, before the next entry is compiled. */
export async function storeCompiledModule(contents: Uint8Array): Promise<string> {
  const digest = crypto.createHash("sha256").update(contents).digest("hex");
  if (!sources.has(digest) || !fs.existsSync(sources.get(digest)!)) {
    const file = path.join(ensureRuntimeDirectory(), `${digest}.js`);
    await fsPromises.writeFile(file, contents);
    sources.set(digest, file);
  }
  return moduleUrl(await startServer(), digest);
}

/** Register verified bytes from a persistent build cache without loading them into memory. */
export async function registerCachedModule(file: string, digest: string): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("Invalid cached module hash");
  if (!sources.has(digest) || !fs.existsSync(sources.get(digest)!)) {
    const retained = path.join(ensureRuntimeDirectory(), `${digest}.js`);
    try {
      await fsPromises.link(file, retained);
    } catch (error) {
      if (error?.code !== "EEXIST") {
        if (error?.code !== "EXDEV") throw error;
        await fsPromises.copyFile(file, retained);
      }
    }
    sources.set(digest, retained);
  }
  return moduleUrl(await startServer(), digest);
}

export async function readLocalModuleBytes(codeUrl: string): Promise<Buffer> {
  const digest = digestFromUrl(codeUrl);
  if (!digest) return decodeModule(codeUrl);
  const file = sources.get(digest);
  if (!file) throw new Error("Compiled module is no longer available");
  return fsPromises.readFile(file);
}

export async function publishLocalModules(root: string, modules: ModuleRef[]): Promise<ModuleRef[]> {
  const current = new Set<string>();
  const refs: ModuleRef[] = [];
  for (const module of modules) {
    const codeUrl = digestFromUrl(module.codeUrl)
      ? module.codeUrl
      : await storeCompiledModule(decodeModule(module.codeUrl));
    const digest = digestFromUrl(codeUrl)!;
    if (!sources.has(digest)) throw new Error("Compiled module is no longer available");
    current.add(digest);
    const stale = staleTimers.get(digest);
    if (stale) { clearTimeout(stale); staleTimers.delete(digest); }
    refs.push({ path: module.path, codeUrl, cssImports: module.cssImports || [] });
  }
  const previous = projectDigests.get(root);
  projectDigests.set(root, current);
  for (const digest of previous || []) {
    if (current.has(digest)) continue;
    if ([...projectDigests.values()].some(set => set.has(digest))) continue;
    const timer = setTimeout(() => {
      staleTimers.delete(digest);
      if (![...projectDigests.values()].some(set => set.has(digest))) sources.delete(digest);
    }, 60_000);
    timer.unref?.();
    staleTimers.set(digest, timer);
  }
  return refs;
}

export function stopLocalModuleServer(): void {
  for (const timer of staleTimers.values()) clearTimeout(timer);
  staleTimers.clear();
  projectDigests.clear();
  sources.clear();
  server?.close();
  server = null;
  starting = null;
  if (runtimeDirectory) fs.rmSync(runtimeDirectory, { recursive: true, force: true });
  runtimeDirectory = null;
}
