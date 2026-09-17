/*
 * Local API router.
 *
 * The app's MCP server uses Response-shaped calls internally. This router maps
 * those calls onto the local store without opening a network connection.
 *
 * A project id is an absolute folder path in local mode, and it is interpolated
 * raw into the URL, so paths are parsed by suffix rather than by a segment
 * regex.
 */

import path from "node:path";

import {
  listProjectFiles,
  deleteProjectFile,
  projectEntry,
  readProjectFile,
  readProjectSettings,
  addProjectIconLibrarySettings,
  listProjectCanvases,
  writeProjectFile,
  writeProjectBinaryFile,
  writeProjectSettings,
} from "./localStore";

/** Minimal stand-in for the parts of `Response` the callers actually use. */
function respond(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const notFound = (what) => respond(404, { error: `${what} not found` });

/** Split `/projects/<absolute/path><tail>` into its two halves. */
const TAILS = [
  "/settings/icon-libraries",
  "/assets/by-path",
  "/files/by-path",
  "/pages/reorder",
  "/pages/",
  "/pages",
  "/files/",
  "/settings",
  "/files",
];

function parseProjectPath(p) {
  if (!p.startsWith("/projects/")) return null;
  const rest = p.slice("/projects/".length);
  for (const tail of TAILS) {
    const at = rest.lastIndexOf(tail);
    // `at > 0` matters: an empty project id means the URL was not what we think.
    if (at > 0) {
      return {
        projectId: rest.slice(0, at),
        tail,
        rest: rest.slice(at + tail.length).replace(/^\?path=/, ""),
      };
    }
  }
  return { projectId: rest, tail: "", rest: "" };
}

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function readBody(init) {
  try {
    return init?.body ? JSON.parse(init.body) : {};
  } catch {
    return {};
  }
}

async function routeProjects(pathname, init) {
  const parsed = parseProjectPath(pathname);
  if (!parsed) return null;
  const { projectId, tail, rest } = parsed;
  const method = (init?.method || "GET").toUpperCase();
  const entry = projectEntry(projectId);
  const root = entry?.rootPath || projectId;

  if (tail === "") {
    return respond(200, { id: entry?.id ?? projectId, name: entry?.name ?? path.basename(root), rootPath: root });
  }

  if (tail === "/files" && method === "GET") {
    return respond(200, listProjectFiles(root));
  }

  if (tail === "/files" && method === "POST") {
    const body = readBody(init);
    if (!body.path || body.content == null) {
      return respond(400, { error: "path and content are required" });
    }
    writeProjectFile(root, body.path, body.content);
    return respond(201, {
      id: encodeURIComponent(body.path),
      path: body.path,
      fileType: body.fileType ?? "other",
    });
  }

  if (tail === "/pages" && method === "GET") {
    return respond(200, listProjectCanvases(root));
  }

  if (tail === "/files/by-path") {
    const rel = decode(rest);
    const content = readProjectFile(root, rel);
    if (method === "PATCH") {
      if (content == null) return notFound(`File ${rel}`);
      writeProjectFile(root, rel, readBody(init).content ?? "");
      return respond(200, { id: encodeURIComponent(rel), path: rel });
    }
    if (content == null) return notFound(`File ${rel}`);
    // The caller reads `id` and PATCHes by it, so the id has to round-trip.
    return respond(200, { id: encodeURIComponent(rel), path: rel, content });
  }

  if (tail === "/files/" && rest && !rest.includes("/")) {
    const rel = decode(rest);
    const content = readProjectFile(root, rel);
    if (method === "DELETE") {
      const result = deleteProjectFile(root, rel);
      return result.success ? respond(200, result) : notFound(`File ${rel}`);
    }
    if (method === "PATCH") {
      if (content == null) return notFound(`File ${rel}`);
      writeProjectFile(root, rel, readBody(init).content ?? "");
      return respond(200, { id: rest, path: rel });
    }
    if (content == null) return notFound(`File ${rel}`);
    return respond(200, { id: rest, path: rel, content });
  }

  // `/settings` reads return the project's own settings file, which is what the
  // cloud served from its settings endpoint. The icon-libraries PATCH merges.
  if (tail === "/settings" && method === "GET") {
    const settings = await readProjectSettings(root);
    return respond(200, {
      iconLibraries: settings.iconLibraries ?? [],
      ...settings,
    });
  }

  if (tail === "/settings/icon-libraries" && method === "PATCH") {
    const body = readBody(init);
    const written = Array.isArray(body.additions)
      ? await addProjectIconLibrarySettings(root, body.additions)
      : await writeProjectSettings(root, {
          iconLibraries: body.iconLibraries ?? body.libraries ?? [],
          ...(body.iconLibraryPolicy ? { iconLibraryPolicy: body.iconLibraryPolicy } : {}),
        });
    return respond(200, { iconLibraries: written.iconLibraries ?? [] });
  }

  return respond(404, { error: `Unhandled local route: ${method} ${pathname}` });
}

/** Batch write, and asset upload — the two non-project routes the MCP server uses. */
async function routeImport(pathname, init) {
  const body = readBody(init);

  if (pathname === "/import/files") {
    const root = body.projectId;
    const written = [];
    const failed = [];
    for (const file of body.files || []) {
      try {
        writeProjectFile(root, file.path, file.content ?? "");
        written.push(file.path);
      } catch {
        failed.push(file.path);
      }
    }
    return respond(200, { written, failed });
  }

  if (pathname === "/import/assets") {
    const root = body.projectId;
    let uploaded = 0;
    const failed = [];
    const assets = Array.isArray(body.assets) ? body.assets.slice(0, 500) : [];
    let totalBytes = 0;
    for (const asset of assets) {
      try {
        if (typeof asset?.path !== "string" || !asset.path || typeof asset?.data !== "string") {
          throw new Error("Asset path and data are required");
        }
        const bytes = Buffer.from(asset.data, "base64");
        if (bytes.length > 20 * 1024 * 1024) throw new Error("Asset exceeds 20 MB");
        totalBytes += bytes.length;
        if (totalBytes > 100 * 1024 * 1024) throw new Error("Asset batch exceeds 100 MB");
        writeProjectBinaryFile(root, asset.path, bytes);
        uploaded += 1;
      } catch {
        failed.push(asset?.path);
      }
    }
    if (Array.isArray(body.assets) && body.assets.length > assets.length) {
      failed.push(...body.assets.slice(assets.length).map(asset => asset?.path));
    }
    return respond(200, { uploaded, failed });
  }

  return null;
}

/**
 * Handle a request locally, or return null if it is something the local store
 * does not model.
 */
async function localApiFetch(pathname, init) {
  if (pathname.startsWith("/projects/")) return routeProjects(pathname, init);
  if (pathname.startsWith("/import/")) return routeImport(pathname, init);
  return null;
}

export { localApiFetch };
