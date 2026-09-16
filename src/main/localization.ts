import { app, ipcMain } from "electron";
import { broadcastToEditors } from "./windowManager";
import {
  createI18n,
  isLocalePreference,
  resolveLocale,
  type LocalePreference,
  type SupportedLocale,
} from "@bingo/i18n";
import { readAppPreferences, writeAppPreferences } from "./appPreferences";

type LocaleState = {
  preference: LocalePreference;
  resolvedLocale: SupportedLocale;
  revision: number;
};

let localeState: LocaleState = {
  preference: "system",
  resolvedLocale: "en",
  revision: 0,
};
let mainI18n: Awaited<ReturnType<typeof createI18n>> | null = null;
let localeWriteQueue: Promise<LocaleState> = Promise.resolve(localeState);
let registered = false;
let onLocaleChanged: (() => void) | null = null;

function preferredSystemLanguages() {
  try {
    return app.getPreferredSystemLanguages();
  } catch {
    return [app.getLocale()];
  }
}

function broadcastLocaleState() {
  broadcastToEditors("bingo:locale-changed", localeState);
}

async function applyLocaleState(preference: LocalePreference, persist: boolean) {
  const resolvedLocale = resolveLocale(preference, preferredSystemLanguages());
  if (persist) writeAppPreferences(app.getPath("userData"), preference);

  const changed =
    preference !== localeState.preference || resolvedLocale !== localeState.resolvedLocale;
  if (!changed) return localeState;

  if (!mainI18n) mainI18n = await createI18n(resolvedLocale);
  else if (mainI18n.resolvedLanguage !== resolvedLocale) await mainI18n.changeLanguage(resolvedLocale);

  localeState = {
    preference,
    resolvedLocale,
    revision: localeState.revision + 1,
  };
  onLocaleChanged?.();
  broadcastLocaleState();
  return localeState;
}

async function initializeLocalization(options: { onLocaleChanged?: () => void } = {}) {
  onLocaleChanged = options.onLocaleChanged ?? null;
  const preferences = readAppPreferences(app.getPath("userData"));
  if (preferences.warning) console.warn(`[i18n] ${preferences.warning}`);
  const resolvedLocale = resolveLocale(preferences.localePreference, preferredSystemLanguages());
  mainI18n = await createI18n(resolvedLocale);
  localeState = {
    preference: preferences.localePreference,
    resolvedLocale,
    revision: localeState.revision + 1,
  };

  if (!registered) {
    registered = true;
    ipcMain.handle("bingo:locale-get", () => localeState);
    ipcMain.handle("bingo:locale-set", (_event, args) => {
      const preference = args?.preference;
      if (!isLocalePreference(preference)) throw new TypeError("Unsupported locale preference.");
      localeWriteQueue = localeWriteQueue
        .catch(() => localeState)
        .then(() => applyLocaleState(preference, true));
      return localeWriteQueue;
    });
  }
  return localeState;
}

async function refreshSystemLocale() {
  if (localeState.preference !== "system") return localeState;
  return applyLocaleState("system", false);
}

function getLocaleState() {
  return localeState;
}

function tNative(key: string, options?: Record<string, unknown>) {
  return mainI18n?.t(key, { ns: "native", ...options }) ?? key;
}

export {
  getLocaleState,
  initializeLocalization,
  refreshSystemLocale,
  tNative,
};
export type { LocaleState };
