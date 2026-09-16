/*
 * Renderer-side bridge for the self-contained desktop build.
 *
 * Some recovered UI modules still speak the original HTTP-shaped API.  Keep
 * that contract, but terminate it in Electron IPC so a missed call can never
 * leave the machine or reach a hosted backend.
 */

const LOCAL_API_ORIGIN = "http://bingo.local";
const LOCAL_WEB_ORIGIN = LOCAL_API_ORIGIN;

let installed = false;

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input?.url ?? String(input);
}

function headersObject(headers) {
  if (!headers) return undefined;
  try {
    return Object.fromEntries(new Headers(headers).entries());
  } catch {
    return undefined;
  }
}

function isLocalApiUrl(raw) {
  try {
    return new URL(raw).origin === LOCAL_API_ORIGIN;
  } catch {
    return false;
  }
}

/** Install before React mounts, so even legacy hooks are forced through IPC. */
function installLocalApiBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const networkFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const rawUrl = requestUrl(input);
    if (!isLocalApiUrl(rawUrl)) return networkFetch(input, init);

    const url = new URL(rawUrl);
    const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const result = await window.api.invoke("bingo:api-fetch", {
      path: `${url.pathname}${url.search}`,
      init: {
        method: init?.method ?? request?.method ?? "GET",
        headers: headersObject(init?.headers ?? request?.headers),
        body: init?.body ?? (request && request.method !== "GET" && request.method !== "HEAD"
          ? await request.clone().text()
          : undefined),
      },
    });

    return new Response(result.body ?? "", {
      status: result.status ?? 500,
      headers: result.headers ?? { "Content-Type": "application/json" },
    });
  };
}

const invokeLocalStore = (op, root, args = {}) =>
  window.api.invoke("bingo:store", { op, root, ...args });

export {
  LOCAL_API_ORIGIN,
  LOCAL_WEB_ORIGIN,
  installLocalApiBridge,
  invokeLocalStore,
};
