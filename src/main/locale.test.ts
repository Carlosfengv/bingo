import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, formatNumber, formatRelativeTime, normalizeSupportedLocale, resolveLocale, resources } from "@bingo/i18n";

test("locale normalization accepts English and Chinese variants", () => {
  assert.equal(normalizeSupportedLocale("en-US"), "en");
  assert.equal(normalizeSupportedLocale("zh-Hans-CN"), "zh-CN");
  assert.equal(normalizeSupportedLocale("zh_Hant_TW"), "zh-CN");
  assert.equal(normalizeSupportedLocale("fr-FR"), null);
});

test("system locale resolution respects preference order", () => {
  assert.equal(resolveLocale("system", ["fr-FR", "zh-Hans-CN", "en-US"]), "zh-CN");
  assert.equal(resolveLocale("system", ["fr-FR"]), "en");
  assert.equal(resolveLocale("zh-CN", ["en-US"]), "zh-CN");
});

test("localized formatters use the resolved application locale", () => {
  assert.equal(formatNumber(12345, "en"), "12,345");
  assert.equal(formatNumber(12345, "zh-CN"), "12,345");
  assert.match(formatDate("2026-09-15T00:00:00Z", "zh-CN", { timeZone: "UTC", month: "long", day: "numeric" }), /9月15日/);
  assert.equal(formatRelativeTime(Date.now() - 2 * 60 * 1000, "zh-CN"), "2分钟前");
});

function leafKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [next] : leafKeys(child, next);
  });
}

function placeholders(value) {
  return Array.from(value.matchAll(/{{\s*([\w.-]+)\s*}}/g), match => match[1]).sort();
}

function leafValues(value, prefix = "", result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result.set(next, child);
    else leafValues(child, next, result);
  }
  return result;
}

test("English and Chinese resources have matching keys and placeholders", () => {
  const english = leafValues(resources.en);
  const chinese = leafValues(resources["zh-CN"]);
  assert.deepEqual(leafKeys(resources.en).sort(), leafKeys(resources["zh-CN"]).sort());
  for (const [key, value] of english) {
    assert.deepEqual(placeholders(value), placeholders(chinese.get(key) ?? ""), key);
  }
});
