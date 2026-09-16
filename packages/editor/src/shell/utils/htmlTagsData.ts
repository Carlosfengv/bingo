/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/htmlTagsData.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "../../shared/utils/idUtils";
import { CONTAINER_BG } from "../../shared/utils/toolElements";
import { appI18n } from "@bingo/i18n";

var htmlTags = [{
  tag: "div",
  title: "Div",
  description: "Generic container for grouping elements",
  defaultStyles: {
    width: "200px",
    height: "100px",
    backgroundColor: CONTAINER_BG,
    display: "flex",
    flexDirection: "column",
    padding: "16px"
  },
  previewColor: "#9ca3af",
  category: "layout"
}, {
  tag: "section",
  title: "Section",
  description: "Thematic grouping of content",
  defaultStyles: {
    width: "300px",
    height: "150px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "24px"
  },
  previewColor: "#8b5cf6",
  category: "semantic"
}, {
  tag: "header",
  title: "Header",
  description: "Introductory content or navigation",
  defaultStyles: {
    width: "100%",
    height: "80px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    alignItems: "center"
  },
  previewColor: "#3b82f6",
  category: "semantic"
}, {
  tag: "footer",
  title: "Footer",
  description: "Footer content for section or page",
  defaultStyles: {
    width: "100%",
    height: "80px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    alignItems: "center"
  },
  previewColor: "#6366f1",
  category: "semantic"
}, {
  tag: "nav",
  title: "Nav",
  description: "Navigation links section",
  defaultStyles: {
    width: "200px",
    height: "60px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    gap: "12px"
  },
  previewColor: "#10b981",
  category: "semantic"
}, {
  tag: "article",
  title: "Article",
  description: "Self-contained composition",
  defaultStyles: {
    width: "300px",
    height: "200px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "20px"
  },
  previewColor: "#f59e0b",
  category: "semantic"
}, {
  tag: "aside",
  title: "Aside",
  description: "Sidebar or tangentially related content",
  defaultStyles: {
    width: "200px",
    height: "300px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "16px"
  },
  previewColor: "#ec4899",
  category: "semantic"
}, {
  tag: "main",
  title: "Main",
  description: "Main content of the document",
  defaultStyles: {
    width: "100%",
    height: "400px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    padding: "24px"
  },
  previewColor: "#14b8a6",
  category: "semantic"
}, {
  tag: "h1",
  title: "Heading 1",
  description: "Main page heading",
  defaultStyles: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0"
  },
  previewColor: "#1f2937",
  category: "text"
}, {
  tag: "h2",
  title: "Heading 2",
  description: "Section heading",
  defaultStyles: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0"
  },
  previewColor: "#374151",
  category: "text"
}, {
  tag: "h3",
  title: "Heading 3",
  description: "Subsection heading",
  defaultStyles: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0"
  },
  previewColor: "#4b5563",
  category: "text"
}, {
  tag: "p",
  title: "Paragraph",
  description: "Block of text content",
  defaultStyles: {
    fontSize: "16px",
    color: "#374151",
    margin: "0",
    lineHeight: "1.5"
  },
  previewColor: "#6b7280",
  category: "text"
}, {
  tag: "span",
  title: "Span",
  description: "Inline text container",
  defaultStyles: {},
  previewColor: "#9ca3af",
  category: "text"
}, {
  tag: "a",
  title: "Link",
  description: "Hyperlink to other pages or resources",
  defaultStyles: {
    fontSize: "16px",
    color: "#3b82f6",
    textDecoration: "underline",
    cursor: "pointer"
  },
  previewColor: "#2563eb",
  category: "text"
}, {
  tag: "button",
  title: "Button",
  description: "Clickable button element",
  defaultStyles: {
    padding: "8px 16px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "14px"
  },
  previewColor: "#3b82f6",
  category: "form"
}, {
  tag: "input",
  title: "Input",
  description: "Text input field",
  defaultStyles: {
    width: "200px",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    fontSize: "14px"
  },
  previewColor: "#d1d5db",
  category: "form"
}, {
  tag: "textarea",
  title: "Textarea",
  description: "Multi-line text input",
  defaultStyles: {
    width: "250px",
    height: "100px",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    resize: "vertical"
  },
  previewColor: "#d1d5db",
  category: "form"
}, {
  tag: "select",
  title: "Select",
  description: "Dropdown selection menu",
  defaultStyles: {
    width: "200px",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    fontSize: "14px"
  },
  previewColor: "#d1d5db",
  category: "form"
}, {
  tag: "label",
  title: "Label",
  description: "Label for form inputs",
  defaultStyles: {
    fontSize: "14px",
    color: "#374151",
    fontWeight: "500"
  },
  previewColor: "#6b7280",
  category: "form"
}, {
  tag: "form",
  title: "Form",
  description: "Container for form inputs",
  defaultStyles: {
    width: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px"
  },
  previewColor: "#e5e7eb",
  category: "form"
}, {
  tag: "img",
  title: "Image",
  description: "Embedded image",
  defaultStyles: {
    display: "block"
  },
  previewColor: "#9ca3af",
  category: "media"
}, {
  tag: "video",
  title: "Video",
  description: "Video player",
  defaultStyles: {
    width: "400px",
    height: "225px"
  },
  previewColor: "#374151",
  category: "media"
}, {
  tag: "audio",
  title: "Audio",
  description: "Audio player",
  defaultStyles: {
    width: "300px"
  },
  previewColor: "#6b7280",
  category: "media"
}, {
  tag: "iframe",
  title: "Iframe",
  description: "Embed external content or webpage",
  defaultStyles: {
    width: "560px",
    height: "800px",
    border: "none"
  },
  previewColor: "#0ea5e9",
  category: "media"
}, {
  tag: "ul",
  title: "Unordered List",
  description: "Bulleted list container",
  defaultStyles: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 0 0 24px",
    margin: "0"
  },
  previewColor: "#6b7280",
  category: "text"
}, {
  tag: "ol",
  title: "Ordered List",
  description: "Numbered list container",
  defaultStyles: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 0 0 24px",
    margin: "0"
  },
  previewColor: "#6b7280",
  category: "text"
}, {
  tag: "li",
  title: "List Item",
  description: "Individual list item",
  defaultStyles: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.5"
  },
  previewColor: "#9ca3af",
  category: "text"
}];
var createElementFromTag = tagData => {
  const getTextContent = () => {
    switch (tagData.tag) {
      case "p":
        return appI18n.t("editor:insertDefaults.paragraph");
      case "span":
        return appI18n.t("editor:insertDefaults.text");
      case "a":
        return appI18n.t("editor:insertDefaults.link");
      case "h1":
        return appI18n.t("editor:insertDefaults.heading1");
      case "h2":
        return appI18n.t("editor:insertDefaults.heading2");
      case "h3":
        return appI18n.t("editor:insertDefaults.heading3");
      case "button":
        return appI18n.t("editor:insertDefaults.button");
      case "label":
        return appI18n.t("editor:insertDefaults.label");
      case "li":
        return appI18n.t("editor:insertDefaults.listItem");
      default:
        return;
    }
  };
  const textContent = getTextContent();
  if (tagData.tag === "textarea") return {
    id: generatePrefixedId("html"),
    type: "html",
    tag: tagData.tag,
    styles: tagData.defaultStyles,
    props: {
      placeholder: appI18n.t("editor:insertDefaults.textPlaceholder")
    },
    children: []
  };
  if (tagData.tag === "audio") return {
    id: generatePrefixedId("html"),
    type: "html",
    tag: tagData.tag,
    styles: tagData.defaultStyles,
    props: {
      controls: true
    },
    children: []
  };
  if (tagData.tag === "img") return {
    id: generatePrefixedId("html"),
    type: "html",
    tag: tagData.tag,
    styles: tagData.defaultStyles,
    props: {
      src: "",
      alt: appI18n.t("editor:insertDefaults.imageAlt")
    }
  };
  if (tagData.tag === "iframe") return {
    id: generatePrefixedId("html"),
    type: "html",
    tag: tagData.tag,
    styles: tagData.defaultStyles,
    props: {
      src: "about:blank",
      title: appI18n.t("editor:insertDefaults.embeddedTitle"),
      sandbox: "allow-scripts allow-same-origin",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowFullScreen: true,
      "data-interaction-enabled": "false",
      "data-use-proxy": "true",
      "data-scale": 1
    }
  };
  return {
    id: generatePrefixedId("html"),
    type: "html",
    tag: tagData.tag,
    styles: tagData.defaultStyles,
    children: textContent ? [{
      id: generatePrefixedId("text"),
      type: "text",
      tag: "span",
      text: textContent
    }] : []
  };
};

export { createElementFromTag, htmlTags };
