/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/inlineChatComposer.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function createReference(ref, renderWithReact) {
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.refId = ref.id;
  chip.dataset.refName = ref.name;
  chip.dataset.refType = ref.type;
  if (ref.elementKind) chip.dataset.refKind = ref.elementKind;
  chip.className = "inline-block max-w-full align-baseline";
  if (!renderWithReact) chip.textContent = ref.displayName ?? ref.name;
  return chip;
}
/** Share one gap between neighboring chips, including the caret space between them. */
function syncInlineReferenceSpacing(input) {
  const nodes = Array.from(input.querySelectorAll("[data-ref-key]"));
  for (const node of nodes) {
    node.removeAttribute("data-ref-gap-before");
    node.removeAttribute("data-ref-gap-after");
  }
  for (const node of nodes) {
    let previous = node.previousSibling;
    let hasSpace = false;
    while (previous?.nodeType === Node.TEXT_NODE && !previous.textContent?.trim()) {
      if (previous.textContent?.includes("\n")) break;
      hasSpace ||= !!previous.textContent;
      previous = previous.previousSibling;
    }
    if (!(previous instanceof HTMLElement) || !previous.hasAttribute("data-ref-key")) continue;
    previous.setAttribute("data-ref-gap-after", "none");
    if (hasSpace) node.setAttribute("data-ref-gap-before", "none");
  }
}
/** Owns only the unmanaged contenteditable DOM, including its caret across canvas clicks. */
var InlineChatComposer = class {
  constructor(input, renderWithReact = false) {
    this.range = null;
    this.frozen = false;
    this.previewHTML = "";
    this.mounts = new Map();
    this.freeze = () => {
      this.frozen = true;
    };
    this.focusPreview = () => {
      if (!this.frozen && this.contentHTML() === this.previewHTML) this.restoreCaret(this.endRange());
    };
    this.rememberCaret = () => {
      const selection = this.input.ownerDocument.getSelection();
      if (selection?.rangeCount && this.input.contains(selection.getRangeAt(0).commonAncestorContainer)) this.range = selection.getRangeAt(0).cloneRange();
    };
    this.input = input;
    this.renderWithReact = renderWithReact;
  }
  createReference(ref) {
    const node = createReference(ref, this.renderWithReact);
    const key = crypto.randomUUID();
    node.dataset.refKey = key;
    this.mounts.set(key, {
      key,
      node,
      reference: ref
    });
    return node;
  }
  getReferenceMounts() {
    return Array.from(this.input.querySelectorAll("[data-ref-key]")).flatMap(node => {
      const mount = this.mounts.get(node.dataset.refKey);
      return mount ? [mount] : [];
    });
  }
  parseInput() {
    return parseInlineChatInput(this.input, new Map(Array.from(this.mounts, ([key, mount]) => [key, mount.reference])));
  }
  removeReference(key) {
    this.freeze();
    this.mounts.get(key)?.node.remove();
  }
  removeReferences(id) {
    for (const mount of this.getReferenceMounts()) if (mount.reference.id === id) this.removeReference(mount.key);
  }
  prepareInsertion() {
    this.freeze();
    this.rememberCaret();
  }
  contentHTML() {
    const clone = this.input.cloneNode(true);
    clone.querySelectorAll("[data-ref-id]").forEach(chip => {
      chip.replaceChildren();
      chip.removeAttribute("data-ref-gap-before");
      chip.removeAttribute("data-ref-gap-after");
    });
    if (!clone.textContent?.trim() && !clone.querySelector("[data-ref-id], [data-change-badge]")) return "";
    return clone.innerHTML;
  }
  connect() {
    this.input.addEventListener("beforeinput", this.freeze);
    this.input.addEventListener("input", this.freeze);
    this.input.addEventListener("paste", this.freeze);
    this.input.addEventListener("focus", this.focusPreview);
    this.input.addEventListener("blur", this.rememberCaret);
    this.input.ownerDocument.addEventListener("selectionchange", this.rememberCaret);
  }
  dispose() {
    this.input.removeEventListener("beforeinput", this.freeze);
    this.input.removeEventListener("input", this.freeze);
    this.input.removeEventListener("paste", this.freeze);
    this.input.removeEventListener("focus", this.focusPreview);
    this.input.removeEventListener("blur", this.rememberCaret);
    this.input.ownerDocument.removeEventListener("selectionchange", this.rememberCaret);
  }
  endRange() {
    const range = this.input.ownerDocument.createRange();
    range.selectNodeContents(this.input);
    range.collapse(false);
    return range;
  }
  restoreCaret(range) {
    this.input.focus();
    const selection = this.input.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.range = range.cloneRange();
  }
  /** Selection follows the canvas only until the user starts composing. */
  syncSelection(refs) {
    if (this.frozen) return;
    if (this.contentHTML() !== this.previewHTML) {
      this.freeze();
      return;
    }
    const focused = this.input.ownerDocument.activeElement === this.input;
    this.input.replaceChildren(...refs.flatMap(ref => [this.createReference(ref), document.createTextNode("\xA0")]));
    this.previewHTML = this.contentHTML();
    this.range = this.endRange();
    if (focused) this.restoreCaret(this.range);
  }
  insertSelection(refs, commitPreview = true) {
    if (!refs.length) return;
    const previewIds = Array.from(this.input.querySelectorAll("[data-ref-id]"), node => node.dataset.refId);
    if (commitPreview && !this.frozen && this.contentHTML() === this.previewHTML && previewIds.length === refs.length && refs.every((ref, index) => ref.id === previewIds[index])) {
      this.freeze();
      this.restoreCaret(this.endRange());
      return;
    }
    this.prepareInsertion();
    const range = this.range && this.input.contains(this.range.commonAncestorContainer) ? this.range : this.endRange();
    range.deleteContents();
    const fragment = this.input.ownerDocument.createDocumentFragment();
    for (const ref of refs) fragment.append(this.createReference(ref), document.createTextNode("\xA0"));
    const last = fragment.lastChild;
    range.insertNode(fragment);
    range.setStartAfter(last);
    range.collapse(true);
    this.restoreCaret(range);
  }
  reset(refs) {
    this.input.replaceChildren();
    this.mounts.clear();
    this.frozen = false;
    this.previewHTML = "";
    this.range = null;
    this.syncSelection(refs);
  }
};
function parseInlineChatInput(input, referenceData = new Map()) {
  const refs = [];
  const mentions = [];
  let text = "";
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent || "";else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.dataset.changeBadge) return;
      if (el.dataset.refId && el.dataset.refType) {
        const ref = referenceData.get(el.dataset.refKey ?? "") ?? {
          type: el.dataset.refType,
          id: el.dataset.refId,
          name: el.dataset.refName || "",
          elementKind: el.dataset.refKind
        };
        const start = text.length;
        text += `[@${ref.name}]`;
        mentions.push({
          start,
          end: text.length,
          referenceIndex: refs.length
        });
        refs.push(ref);
      } else if (el.tagName === "BR") text += "\n";else {
        if ((el.tagName === "DIV" || el.tagName === "P") && text && !text.endsWith("\n")) text += "\n";
        el.childNodes.forEach(walk);
      }
    }
  };
  input.childNodes.forEach(walk);
  const normalized = text.replace(/\u00a0/g, " ");
  const leadingSpace = normalized.length - normalized.trimStart().length;
  return {
    text: normalized.trim(),
    refs,
    mentions: mentions.map(mention => ({
      ...mention,
      start: mention.start - leadingSpace,
      end: mention.end - leadingSpace
    }))
  };
}
/** Resolve repeated labels in occurrence order, so two <div>s keep their own targets. */
function splitInlineChatReferences(content, refs, mentions) {
  if (mentions) {
    const parts = [];
    const used = new Set();
    let offset = 0;
    for (const mention of mentions) {
      const reference = refs[mention.referenceIndex];
      if (!reference || mention.start < offset || mention.end > content.length || content.slice(mention.start, mention.end) !== `[@${reference.name}]`) continue;
      parts.push(content.slice(offset, mention.start), {
        reference,
        offset: mention.start
      });
      used.add(mention.referenceIndex);
      offset = mention.end;
    }
    parts.push(content.slice(offset));
    return {
      parts,
      remaining: refs.filter((_, index) => !used.has(index))
    };
  }
  const remaining = [...refs];
  const parts = [];
  let offset = 0;
  for (const match of content.matchAll(/\[@([^\]]+)\]/g)) {
    const index = remaining.findIndex(ref => ref.name === match[1]);
    if (index < 0) continue;
    parts.push(content.slice(offset, match.index), {
      reference: remaining.splice(index, 1)[0],
      offset: match.index
    });
    offset = match.index + match[0].length;
  }
  parts.push(content.slice(offset));
  return {
    parts,
    remaining
  };
}
/** Put each exact target beside its occurrence, not only in a detached reference list. */
function inlineChatPrompt(content, refs, mentions) {
  return splitInlineChatReferences(content, refs, mentions).parts.map(part => {
    if (typeof part === "string") return part;
    const ref = part.reference;
    const target = ref.type === "element" ? {
      element_id: ref.id
    } : ref.type === "page" ? {
      canvas_id: ref.pageId
    } : ref.type === "component" ? {
      component: ref.name,
      source: ref.path
    } : ref.type === "connection" ? {
      connection: ref.name
    } : {
      type: ref.type,
      id: ref.id,
      path: ref.path
    };
    return `[@${ref.displayName ?? ref.name}] (${JSON.stringify(target)})`;
  }).join("");
}

export { InlineChatComposer, inlineChatPrompt, splitInlineChatReferences, syncInlineReferenceSpacing };
