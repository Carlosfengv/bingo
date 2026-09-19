import type { VariableStyleUsage } from "../../../../compiler/src/runtime/variableGeometry";

type ParsedSheet = { text: string; usage: VariableStyleUsage; imports: Array<{ styleSheet?: CSSStyleSheet }> };
const parsedSheets = new WeakMap<CSSStyleSheet, ParsedSheet>();

/** Read the actual loaded CSS, including generated utilities and imports.
 * Validate cached analysis against CSS text: insertRule/replaceSync retain identity.
 * Inaccessible or still-loading sheets force the safe geometry fallback.
 */
export function readCssVariableUsage(document: Document): VariableStyleUsage & { sheets: string[] } {
  const usage: VariableStyleUsage & { sheets: string[] } = { complete: true, declarations: [], conditions: [], sheets: [] };
  const visited = new Set<CSSStyleSheet>();
  const visitSheet = (sheet: CSSStyleSheet | null) => {
    if (!sheet) { usage.complete = false; return; }
    if (visited.has(sheet) || sheet.disabled) return;
    visited.add(sheet);
    try {
      const rules = Array.from(sheet.cssRules);
      // cssText also changes for in-place rule edits; object identity alone
      // would incorrectly reuse a proof after insertRule or style.setProperty.
      const text = rules.map(rule => rule.cssText).join("\n");
      usage.sheets.push(sheet.media?.mediaText ?? "", text);
      let parsed = parsedSheets.get(sheet);
      if (!parsed || parsed.text !== text) {
        parsed = { text, usage: { complete: true, declarations: [], conditions: [] }, imports: [] };
        visitRules(rules, parsed);
        parsedSheets.set(sheet, parsed);
      }
      usage.complete &&= parsed.usage.complete;
      usage.declarations.push(...parsed.usage.declarations);
      usage.conditions.push(...parsed.usage.conditions);
      for (const imported of parsed.imports) visitSheet(imported.styleSheet ?? null);
    } catch { usage.complete = false; }
  };
  const visitRules = (rules: CSSRule[] | CSSRuleList, parsed: ParsedSheet) => {
    for (const rule of Array.from(rules)) {
      const item = rule as CSSRule & { style?: CSSStyleDeclaration; cssRules?: CSSRuleList; styleSheet?: CSSStyleSheet };
      const header = rule.cssText.split("{", 1)[0];
      if (header.includes("--") || /\[\s*style/i.test(header) || /(?<!\\)\[[^\]]*\\/.test(header)) parsed.usage.conditions.push(header);
      if (item.style) for (const property of Array.from(item.style)) {
        const value = item.style.getPropertyValue(property);
        // Anchor positioning may depend on an element in another canvas root.
        if (/^(anchor-|position-anchor)/.test(property) || /\banchor(?:-size)?\(/i.test(value)) parsed.usage.complete = false;
        if ((/var\(/i.test(value) || value.includes("\\") && value.includes("--"))) parsed.usage.declarations.push({ property, value });
      }
      if (rule.type === CSSRule.IMPORT_RULE) parsed.imports.push(item);
      else if (item.cssRules) visitRules(item.cssRules, parsed);
      else if (!item.style && /var\(/i.test(rule.cssText)) parsed.usage.complete = false;
    }
  };
  for (const sheet of [...Array.from(document.styleSheets), ...document.adoptedStyleSheets]) visitSheet(sheet);
  if (document.querySelector('link[rel="stylesheet"]:not([disabled])') &&
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]:not([disabled])')).some(link => !link.sheet)) usage.complete = false;
  return usage;
}
