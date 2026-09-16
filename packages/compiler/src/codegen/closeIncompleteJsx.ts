/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/closeIncompleteJsx.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Close truncated JSX so a streaming payload can be parsed before the model
* finishes the last tags. Used to paint the canvas while canvas_add / insert /
* update arguments are still arriving.
*/
var VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var TAG_NAME = /^[A-Za-z_:][\w:.-]*$/;
function closeIncompleteJsx(input) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("<") && !trimmed.startsWith("<>")) return null;
  let s = trimmed.replace(/<\/?[A-Za-z][\w:.-]*$/, "").replace(/<$/, "");
  if (!s.startsWith("<")) return null;
  s = closeOpenConstructs(s);
  const stack = collectOpenTags(s);
  if (stack === null) return null;
  let out = s;
  for (let i = stack.length - 1; i >= 0; i--) {
    const tag = stack[i];
    out += tag === "" ? "</>" : `</${tag}>`;
  }
  return out;
}
/**
* Close an unfinished string / JSX expression / comment so Babel can parse.
* Conservative: only touch the tail.
*/
function closeOpenConstructs(src) {
  let i = 0;
  let state = "text";
  let quote = null;
  let exprDepth = 0;
  let exprFromTag = false;
  let tagQuote = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (state === "lineComment") {
      if (c === "\n") state = "text";
      i++;
      continue;
    }
    if (state === "blockComment") {
      if (c === "*" && next === "/") {
        state = "text";
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (state === "tag") {
      if (tagQuote) {
        if (c === "\\" && i + 1 < src.length) {
          i += 2;
          continue;
        }
        if (c === tagQuote) tagQuote = null;
        i++;
        continue;
      }
      if (c === "\"" || c === "'") {
        tagQuote = c;
        i++;
        continue;
      }
      if (c === "{") {
        exprDepth++;
        exprFromTag = true;
        state = "text";
        i++;
        continue;
      }
      if (c === ">") {
        state = "text";
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (quote) {
      if (c === "\\" && i + 1 < src.length) {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (exprDepth > 0) {
      if (c === "\"" || c === "'" || c === "`") {
        quote = c;
        i++;
        continue;
      }
      if (c === "/" && next === "/") {
        state = "lineComment";
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        state = "blockComment";
        i += 2;
        continue;
      }
      if (c === "{") exprDepth++;else if (c === "}") {
        exprDepth--;
        if (exprDepth === 0 && exprFromTag) {
          state = "tag";
          exprFromTag = false;
        }
      }
      i++;
      continue;
    }
    if (c === "{") {
      exprDepth++;
      i++;
      continue;
    }
    if (c === "\"" || c === "'" || c === "`") {
      quote = c;
      i++;
      continue;
    }
    if (c === "<" && next !== "!" && next !== "?") {
      state = "tag";
      i++;
      continue;
    }
    i++;
  }
  let out = src;
  if (state === "blockComment") out += "*/";
  if (quote) out += quote;
  if (tagQuote) out += tagQuote;
  while (exprDepth > 0) {
    out += "}";
    exprDepth--;
  }
  if (exprFromTag) state = "tag";
  if (state === "tag") out += ">";
  return out;
}
/** Open tag names, or '' for a fragment. Null if the scan is unusable. */
function collectOpenTags(src) {
  const stack = [];
  let i = 0;
  let quote = null;
  let exprDepth = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === "\\" && i + 1 < src.length) {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (exprDepth > 0) {
      if (c === "\"" || c === "'" || c === "`") {
        quote = c;
        i++;
        continue;
      }
      if (c === "{") exprDepth++;else if (c === "}") exprDepth--;
      i++;
      continue;
    }
    if (c === "{") {
      exprDepth++;
      i++;
      continue;
    }
    if (c === "\"" || c === "'" || c === "`") {
      quote = c;
      i++;
      continue;
    }
    if (c !== "<") {
      i++;
      continue;
    }
    if (next === "!" || next === "?") {
      const end = src.indexOf(">", i + 2);
      i = end === -1 ? src.length : end + 1;
      continue;
    }
    const isClose = next === "/";
    const nameStart = isClose ? i + 2 : i + 1;
    let nameEnd = nameStart;
    if (src[nameStart] === ">" || src[nameStart] === "/" && src[nameStart + 1] === ">") {
      if (isClose) {
        if (stack.length === 0 || stack[stack.length - 1] !== "") return null;
        stack.pop();
      } else stack.push("");
      const close = src.indexOf(">", nameStart);
      i = close === -1 ? src.length : close + 1;
      continue;
    }
    while (nameEnd < src.length && /[\w:.-]/.test(src[nameEnd])) nameEnd++;
    const name = src.slice(nameStart, nameEnd);
    if (!name || !TAG_NAME.test(name)) {
      i++;
      continue;
    }
    let j = nameEnd;
    let selfClosing = false;
    let tagQuote = null;
    let tagExpr = 0;
    while (j < src.length) {
      const tc = src[j];
      if (tagQuote) {
        if (tc === "\\" && j + 1 < src.length) {
          j += 2;
          continue;
        }
        if (tc === tagQuote) tagQuote = null;
        j++;
        continue;
      }
      if (tagExpr > 0) {
        if (tc === "\"" || tc === "'") {
          tagQuote = tc;
          j++;
          continue;
        }
        if (tc === "{") tagExpr++;else if (tc === "}") tagExpr--;
        j++;
        continue;
      }
      if (tc === "\"" || tc === "'") {
        tagQuote = tc;
        j++;
        continue;
      }
      if (tc === "{") {
        tagExpr++;
        j++;
        continue;
      }
      if (tc === "/" && src[j + 1] === ">") {
        selfClosing = true;
        j += 2;
        break;
      }
      if (tc === ">") {
        j++;
        break;
      }
      j++;
    }
    if (isClose) {
      const open = stack.lastIndexOf(name);
      if (open === -1) return null;
      stack.length = open;
    } else if (!selfClosing && !VOID_TAGS.has(name.toLowerCase())) stack.push(name);
    i = j;
  }
  return stack;
}

export { closeIncompleteJsx };
