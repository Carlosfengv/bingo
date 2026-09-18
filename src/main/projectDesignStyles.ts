import fs from "node:fs";
import path from "node:path";

/** Only current pages supply CSS candidates; history and chats are not sources. */
export function designStyleSources(root) {
  const directory = path.join(root, ".bingo", "design", "pages");
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => path.join(directory, entry.name)).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export function isDesignStyleSource(relativePath) {
  return /^\.bingo\/design\/pages\/[^/]+\.json$/.test(relativePath.replace(/\\/g, "/"));
}
