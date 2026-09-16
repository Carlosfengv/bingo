/*
 * Preview entry. Everything rendered by this page is recovered source from
 * ../packages, styled by the stylesheet extracted out of the shipped bundle.
 */
import { createRoot } from "react-dom/client";
import "../../src/renderer/src/index.css";
import { Gallery } from "./gallery";
import { appI18n, I18nextProvider, initializeI18n, normalizeSupportedLocale } from "@bingo/i18n";

const locale = (navigator.languages ?? [navigator.language])
  .map(normalizeSupportedLocale)
  .find(Boolean) ?? "en";

await initializeI18n(locale);
createRoot(document.getElementById("root")).render(
  <I18nextProvider i18n={appI18n}><Gallery /></I18nextProvider>,
);
