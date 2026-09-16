import i18next, { createInstance } from "i18next";
import { namespaces, resources } from "./resources";

export * from "./locale";
export * from "./format";
export { namespaces, resources } from "./resources";

const i18nOptions = (locale: "en" | "zh-CN") => ({
  lng: locale,
  fallbackLng: "en",
  supportedLngs: ["en", "zh-CN"],
  defaultNS: "common",
  ns: namespaces,
  resources,
  interpolation: { escapeValue: false },
  returnNull: false,
});

async function createI18n(locale: "en" | "zh-CN") {
  const instance = createInstance();
  await instance.init(i18nOptions(locale));
  return instance;
}

export { createI18n, i18nOptions, i18next };
