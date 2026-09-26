import postcss from "postcss";

/** Keep the editor's reset and utility classes out of authored project content.
 * @scope stops selector matching, not inheritance; projectStyleBaseline supplies
 * the project document's inherited values at the existing canvas boundary. */
export function editorCssBoundary() {
  return {
    postcssPlugin: "bingo-editor-css-boundary",
    Once(root) {
      if (!root.source?.input.file?.replaceAll("\\", "/").endsWith("src/renderer/src/index.css")) return;
      // Registered custom properties are document-global even inside @scope.
      // In particular our Tailwind version must not register the project's --tw-*.
      root.walkDecls(decl => {
        decl.prop = decl.prop.replaceAll("--tw-", "--ed-tw-");
        decl.value = decl.value.replaceAll("--tw-", "--ed-tw-");
      });
      root.walkAtRules(rule => { rule.params = rule.params.replaceAll("--tw-", "--ed-tw-"); });
      root.walkRules(rule => {
        // Selectors inside @scope are relative. Match the scope root explicitly
        // for document tokens/preflight instead of looking for a nested html.
        rule.selector = rule.selector.replaceAll(":root", ":scope")
          .replace(/(^|[\s,>+~(])html(?=[.#[:\s,>+~)]|$)/g, "$1:scope");
        if (rule.selector === ".dark") rule.selector = ":scope.dark, .dark";
        if (rule.selector.startsWith(".editor-dark ")) rule.selector = ":scope" + rule.selector;
      });
      const scope = postcss.atRule({ name: "scope", params: "(:root) to ([data-canvas-content], [data-drag-overlay])" });
      for (const node of [...root.nodes]) scope.append(node);
      root.append(scope);
      // Declare this first, before any project layers. Project rules always win
      // over the inherited baseline, including layered theme/base declarations.
      root.prepend(postcss.atRule({ name: "layer", params: "bingo-project-baseline" }));
    },
  };
}
