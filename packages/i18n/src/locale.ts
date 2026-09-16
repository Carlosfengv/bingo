const LOCALE_PREFERENCES = ["system", "en", "zh-CN"] as const;
const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

type LocalePreference = (typeof LOCALE_PREFERENCES)[number];
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isLocalePreference(value: unknown): value is LocalePreference {
  return typeof value === "string" && LOCALE_PREFERENCES.includes(value as LocalePreference);
}

function normalizeSupportedLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

function resolveLocale(
  preference: LocalePreference,
  preferredSystemLanguages: readonly string[] = [],
): SupportedLocale {
  if (preference !== "system") return preference;
  for (const language of preferredSystemLanguages) {
    const supported = normalizeSupportedLocale(language);
    if (supported) return supported;
  }
  return "en";
}

export {
  LOCALE_PREFERENCES,
  SUPPORTED_LOCALES,
  isLocalePreference,
  normalizeSupportedLocale,
  resolveLocale,
};
export type { LocalePreference, SupportedLocale };
