import fs from "node:fs";
import path from "node:path";
import { isLocalePreference, type LocalePreference } from "@bingo/i18n";

const APP_PREFERENCES_SCHEMA_VERSION = 1;
const APP_PREFERENCES_FILENAME = "preferences.json";

function appPreferencesPath(userDataPath: string) {
  return path.join(userDataPath, APP_PREFERENCES_FILENAME);
}

function readAppPreferences(userDataPath: string): {
  localePreference: LocalePreference;
  warning: string | null;
} {
  const file = appPreferencesPath(userDataPath);
  if (!fs.existsSync(file)) return { localePreference: "system", warning: null };

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return { localePreference: "system", warning: "Preferences file does not contain an object." };
    }
    if (!isLocalePreference(parsed.localePreference)) {
      return { localePreference: "system", warning: "Preferences file contains an unsupported locale." };
    }
    return { localePreference: parsed.localePreference, warning: null };
  } catch (error) {
    return {
      localePreference: "system",
      warning: `Could not read preferences: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function writeAppPreferences(userDataPath: string, localePreference: LocalePreference) {
  if (!isLocalePreference(localePreference)) throw new TypeError("Unsupported locale preference.");
  const file = appPreferencesPath(userDataPath);
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${APP_PREFERENCES_FILENAME}.${process.pid}.${Date.now()}.tmp`,
  );
  const content = JSON.stringify(
    { schemaVersion: APP_PREFERENCES_SCHEMA_VERSION, localePreference },
    null,
    2,
  );
  try {
    fs.writeFileSync(temporary, `${content}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.unlinkSync(temporary);
    } catch {}
    throw error;
  }
}

export {
  APP_PREFERENCES_FILENAME,
  APP_PREFERENCES_SCHEMA_VERSION,
  appPreferencesPath,
  readAppPreferences,
  writeAppPreferences,
};
