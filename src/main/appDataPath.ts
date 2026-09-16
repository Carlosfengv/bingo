import path from "node:path";

export function bingoUserDataPath(appDataRoot: string, development: boolean): string {
  const bingoRoot = path.join(appDataRoot, "Bingo");
  return development ? path.join(bingoRoot, "dev") : bingoRoot;
}

export function resolvedUserDataPath(
  appDataRoot: string,
  development: boolean,
  requestedRoot = "",
): string {
  const explicitRoot = requestedRoot.trim();
  return explicitRoot ? path.resolve(explicitRoot) : bingoUserDataPath(appDataRoot, development);
}
