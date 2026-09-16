import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";
import { i18nOptions, i18next as appI18n } from "./index";

export * from "./index";
export { I18nextProvider, useTranslation } from "react-i18next";

let initialization: Promise<unknown> | null = null;

function updateDocumentLanguage(locale: "en" | "zh-CN") {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = "ltr";
}

async function initializeI18n(locale: "en" | "zh-CN") {
  if (!initialization) {
    initialization = appI18n.use(initReactI18next).init(i18nOptions(locale));
  }
  await initialization;
  if (appI18n.resolvedLanguage !== locale) await appI18n.changeLanguage(locale);
  updateDocumentLanguage(locale);
  return appI18n;
}

async function changeLanguage(locale: "en" | "zh-CN") {
  await initializeI18n(locale);
  if (appI18n.resolvedLanguage !== locale) await appI18n.changeLanguage(locale);
  updateDocumentLanguage(locale);
}

export { appI18n, changeLanguage, initializeI18n };
