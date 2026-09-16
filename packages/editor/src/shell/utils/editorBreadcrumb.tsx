/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/editorBreadcrumb.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { CaretRightIcon, FolderIcon } from "@bingo/ui";
import { CubeIcon as o$14 } from "@phosphor-icons/react/dist/icons/Cube";
import { FileTs as c$10 } from "@phosphor-icons/react/dist/icons/FileTs";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var DECL_PATTERNS = [/^\s*export\s+default\s+function\s+(\w+)/, /^\s*export\s+function\s+(\w+)/, /^\s*function\s+(\w+)/, /^\s*export\s+const\s+(\w+)\s*=/, /^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/, /^\s*const\s+(\w+)\s*=\s*(?:async\s*)?function/, /^\s*class\s+(\w+)/];
function filePathSegments(path) {
  return path.split("/").filter(Boolean);
}
function symbolPathAtLine(source, line) {
  if (!source || line < 1) return [];
  const lines = source.split("\n");
  const target = Math.min(line, lines.length);
  const stack = [];
  let depth = 0;
  for (let i = 0; i < target; i++) {
    const text = lines[i];
    for (const pattern of DECL_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
        stack.push({
          name: match[1],
          depth
        });
        break;
      }
    }
    for (const ch of text) if (ch === "{") depth++;else if (ch === "}") depth = Math.max(0, depth - 1);
  }
  return stack.map(s => s.name);
}
function buildFileBreadcrumbItems(filePath, source, cursorLine, componentName) {
  const items = filePathSegments(filePath).map(seg => ({
    label: seg,
    kind: seg.includes(".") ? "file" : "folder"
  }));
  const symbols = symbolPathAtLine(source, cursorLine);
  if (symbols.length === 0 && componentName) items.push({
    label: componentName,
    kind: "symbol"
  });else for (const name of symbols) items.push({
    label: name,
    kind: "symbol"
  });
  return items;
}
function SegmentIcon(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    kind
  } = t0;
  if (kind === "folder") {
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <FolderIcon width={12} height={12} className="shrink-0 opacity-60" />;
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  if (kind === "file") {
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = (0, import_jsx_runtime.jsx)(c$10, {
        size: 12,
        weight: "bold",
        className: "shrink-0 text-sky-600 dark:text-sky-400"
      });
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (0, import_jsx_runtime.jsx)(o$14, {
      size: 12,
      weight: "fill",
      className: "shrink-0 text-violet-600 dark:text-violet-400"
    });
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
function EditorFileBreadcrumb(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    items
  } = t0;
  if (items.length === 0) return null;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp$13);
    $[0] = items;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== t1) {
    t2 = <div className="flex min-h-[22px] items-center gap-0.5 overflow-x-auto border-b border-ed-border bg-ed-background px-3 py-0.5 text-[11px] text-ed-muted-foreground">{t1}</div>;
    $[2] = t1;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
function _temp$13(item, index) {
  return <span key={`${item.kind}-${item.label}-${index}`} className="flex shrink-0 items-center gap-0.5">{index > 0 && <CaretRightIcon width={10} height={10} className="shrink-0 opacity-40" />}{<span className="flex items-center gap-1 whitespace-nowrap hover:text-ed-foreground">{<SegmentIcon kind={item.kind} />}{item.label}</span>}</span>;
}

export { EditorFileBreadcrumb, buildFileBreadcrumbItems };
