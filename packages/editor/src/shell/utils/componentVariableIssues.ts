/** Read-only diagnostics. Null means syntax outside this diagnostic's proof. */
export function unresolvedStyleVariables(value: unknown, read: (name: string) => string): string[] | null {
  if (typeof value !== "string") return [];
  if (value.includes("\\") || value.includes("/*")) return null;
  const missing = new Set<string>();
  const visit = (text: string): boolean => {
    let quote = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quote) { if (char === quote) quote = ""; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (text.slice(i, i + 4) !== "var(" || i > 0 && /[\w-]/.test(text[i - 1])) continue;
      let depth = 1, comma = -1, innerQuote = "", end = i + 4;
      for (; end < text.length; end++) {
        const token = text[end];
        if (innerQuote) { if (token === innerQuote) innerQuote = ""; continue; }
        if (token === '"' || token === "'") { innerQuote = token; continue; }
        if (token === "(") depth++;
        if (token === ")") { depth--; if (depth === 0) break; }
        if (token === "," && depth === 1 && comma < 0) comma = end;
      }
      if (depth || innerQuote) return false;
      const name = text.slice(i + 4, comma < 0 ? end : comma).trim();
      if (!/^--[\w-]+$/.test(name)) return false;
      if (!read(name).trim()) {
        if (comma < 0) missing.add(name);
        else if (!visit(text.slice(comma + 1, end))) return false;
      }
      i = end;
    }
    return !quote;
  };
  return visit(value) ? [...missing] : null;
}
