import type { SupportedLocale } from "./locale";

const FORMAT_LOCALES: Record<SupportedLocale, string> = {
  en: "en-US",
  "zh-CN": "zh-CN",
};

function intlLocale(locale: SupportedLocale) {
  return FORMAT_LOCALES[locale];
}

function formatNumber(value: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

function formatDate(
  value: Date | number | string,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
}

function formatRelativeTime(
  value: Date | number | string,
  locale: SupportedLocale,
  now = Date.now(),
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = (date.getTime() - now) / 1000;
  const absoluteSeconds = Math.abs(seconds);
  let unit: Intl.RelativeTimeFormatUnit = "second";
  let amount = seconds;
  if (absoluteSeconds >= 86400) {
    unit = "day";
    amount = seconds / 86400;
  } else if (absoluteSeconds >= 3600) {
    unit = "hour";
    amount = seconds / 3600;
  } else if (absoluteSeconds >= 60) {
    unit = "minute";
    amount = seconds / 60;
  }
  return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(Math.round(amount), unit);
}

export { formatDate, formatNumber, formatRelativeTime, intlLocale };
