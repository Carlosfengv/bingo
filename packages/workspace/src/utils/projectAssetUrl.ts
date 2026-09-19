/** Shared by canvas elements, fonts, and compiled component asset references. */
export function projectAssetUrl(projectId, assetPath) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("presentation") === "1" && params.has("token")) {
    return `/__luna/asset?token=${encodeURIComponent(params.get("token"))}&path=${encodeURIComponent(assetPath)}`;
  }
  const portable = /^bingo-asset:([a-f0-9]{64}\.[a-z0-9]{1,12})$/i.exec(assetPath);
  const rel = portable ? portable[1] : String(assetPath || "").replace(/^\/+/, "");
  const joined = `${projectId.replace(/[\\/]+$/, "")}/${portable ? ".bingo/design/assets" : "public"}/${rel}`.replace(/\\/g, "/");
  const encoded = joined.split("/").map((part, index) =>
    index === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)
  ).join("/");
  return `file://${encoded.startsWith("/") ? "" : "/"}${encoded}`;
}
