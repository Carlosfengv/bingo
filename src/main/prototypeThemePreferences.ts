import fs from "node:fs";
import path from "node:path";

import { normalizeThemeSelection } from "@bingo/compiler";
import { ensureProjectDesignData } from "./projectDesignData";

const PREFERENCES_VERSION = 1;
const PREFERENCES_FILE = "prototype-theme-preferences.json";

function preferencePath(root, userDataRoot) {
  return path.join(ensureProjectDesignData(root, userDataRoot), PREFERENCES_FILE);
}

function readPrototypeThemePreference(root, userDataRoot) {
  const file = preferencePath(root, userDataRoot);
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    const selection = normalizeThemeSelection(value?.selection);
    if (value?.version !== PREFERENCES_VERSION || !selection) return null;
    return {
      version: PREFERENCES_VERSION,
      selection,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null
    };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    return null;
  }
}

function writePrototypeThemePreference(root, userDataRoot, selectionInput) {
  const selection = normalizeThemeSelection(selectionInput);
  if (!selection) {
    const error = new Error("Theme preference must be a concrete theme selection or system.");
    error.code = "THEME_SELECTION_INVALID";
    throw error;
  }
  const file = preferencePath(root, userDataRoot);
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const value = { version: PREFERENCES_VERSION, selection, updatedAt: new Date().toISOString() };
  const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    const wrapped = new Error(`Could not save prototype theme preference: ${error?.message || error}`);
    wrapped.code = "THEME_STORAGE_FAILED";
    throw wrapped;
  }
  return value;
}

export { preferencePath as prototypeThemePreferencePath, readPrototypeThemePreference, writePrototypeThemePreference };
