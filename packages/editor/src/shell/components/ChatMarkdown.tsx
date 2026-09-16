/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatMarkdown.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ScrollArea } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import { default as Markdown } from "react-markdown";
import * as import_compiler_runtime from "react/compiler-runtime";
import { default as rehypeHighlight } from "rehype-highlight";
import { default as remarkGfm } from "remark-gfm";

var toolBlockNames = new Set(["ReadCanvas", "SearchIcons", "TakeScreenshot", "AddToCanvas", "UpdateElement", "DeleteElement", "ReplaceWithComponent", "Write", "Read", "EditCanvas", "InsertCanvas"]);
/** Legacy tool calls have their own activity UI. Filter parsed fences so code examples stay intact. */
function remarkHideToolCalls() {
  return function removeToolCalls(node) {
    if (!node.children) return;
    node.children = node.children.filter(child => child.type !== "code" || !toolBlockNames.has(child.lang?.replace(/^tool:/, "") ?? ""));
    node.children.forEach(removeToolCalls);
  };
}
function MarkdownTable({ node: _node, ...props }) {
  const { t } = useTranslation("editor");
  return <ScrollArea horizontal={true} className="ed-chat-markdown-table" role="region" aria-label={t("shell.table")}>{<table {...props} />}</ScrollArea>;
}
function MarkdownCodeBlock({ node: _node, ...props }) {
  const { t } = useTranslation("editor");
  return <ScrollArea horizontal={true} className="ed-chat-markdown-code" role="region" aria-label={t("shell.codeBlock")}>{<pre {...props} />}</ScrollArea>;
}
var components = {
  a: ({
    node: _node,
    ...props
  }) => <a {...props} target={props.href?.startsWith("#") ? void 0 : "_blank"} rel="noopener noreferrer" />,
  table: MarkdownTable,
  pre: MarkdownCodeBlock
};
var remarkPlugins = [remarkGfm, remarkHideToolCalls];
var rehypePlugins = [rehypeHighlight];
/** Shared by live responses, activity text, and archived conversations. */
var ChatMarkdown = (0, import_react.memo)(function ChatMarkdown(t0) {
  const $ = (0, import_compiler_runtime.c)(5);
  const {
    children
  } = t0;
  const t1 = `chat-${(0, import_react.useId)()}-`;
  let t2;
  if ($[0] !== t1) {
    t2 = {
      clobberPrefix: t1
    };
    $[0] = t1;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== children || $[3] !== t2) {
    t3 = <div className="ed-chat-markdown">{<Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} remarkRehypeOptions={t2} components={components}>{children}</Markdown>}</div>;
    $[2] = children;
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
});

export { ChatMarkdown };
