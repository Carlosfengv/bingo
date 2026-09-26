/** Project IDs are absolute local paths, so they must occupy one encoded URL segment. */
export function projectApiPath(projectId: string, suffix = "") {
  if (!projectId || !suffix.startsWith("/") && suffix !== "") {
    throw new Error("Invalid project API path");
  }
  return `/projects/${encodeURIComponent(projectId)}${suffix}`;
}

export function parseProjectApiPath(input: string) {
  if (!input.startsWith("/projects/")) return null;
  const question = input.indexOf("?");
  const pathname = question < 0 ? input : input.slice(0, question);
  const query = new URLSearchParams(question < 0 ? "" : input.slice(question + 1));
  const remaining = pathname.slice("/projects/".length);
  const separator = remaining.indexOf("/");
  const encodedId = separator < 0 ? remaining : remaining.slice(0, separator);
  if (!encodedId) throw new Error("Project ID is required");
  const projectId = decodeURIComponent(encodedId);
  if (!projectId || encodeURIComponent(projectId) !== encodedId) {
    throw new Error("Project ID must be one encoded URL segment");
  }
  return { projectId, route: separator < 0 ? "" : remaining.slice(separator), query };
}
