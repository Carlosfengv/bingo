import fs from "node:fs";
import path from "node:path";

export function systemSkillsPath(options: {
  packaged: boolean;
  resourcesPath: string;
  appPath: string;
  exists?: (candidate: string) => boolean;
}) {
  if (options.packaged) return path.join(options.resourcesPath, "system-skills");
  const exists = options.exists ?? (candidate => fs.existsSync(path.join(candidate, "bingo-design", "SKILL.md")));
  let root = path.resolve(options.appPath);
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(root, "packages", "compiler", "skills");
    if (exists(candidate)) return candidate;
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  return path.join(path.resolve(options.appPath), "packages", "compiler", "skills");
}
