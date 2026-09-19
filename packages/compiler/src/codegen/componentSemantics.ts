type ComponentInfo = { path?: string; props?: Record<string, { type?: string }> };
export type ComponentCatalog = Record<string, ComponentInfo>;

// Discovery hints only: matching a synonym does not establish API compatibility.
const SYNONYMS = [
  ["badge", "pill", "chip", "tag", "标签", "徽章"],
  ["button", "btn", "按钮"],
  ["input", "textfield", "textinput", "输入框"],
  ["textarea", "multiline", "文本域"],
  ["select", "combobox", "dropdown", "选择器", "下拉框"],
  ["card", "panel", "卡片"],
  ["tabs", "tab", "tablist", "选项卡"],
  ["dialog", "modal", "对话框", "弹窗"],
  ["avatar", "头像"],
];

function words(value: string) {
  return value.replace(/([a-z\d])([A-Z])/g, "$1 $2").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Direct name/path matches first; semantic candidates require source inspection. */
export function findComponentCandidates(index: ComponentCatalog, query: string) {
  const normalized = query.trim().toLowerCase();
  const compact = words(query).join("");
  const synonyms = SYNONYMS.find(group => group.includes(normalized) || group.includes(compact));
  const terms = new Set(synonyms ?? []);
  return Object.entries(index).map(([name, info]) => {
    const direct = !normalized || name.toLowerCase().includes(normalized) || (info.path ?? "").toLowerCase().includes(normalized);
    const nameWords = words(name);
    const related = terms.size > 0 && (nameWords.some(word => terms.has(word)) || terms.has(nameWords.join("")));
    return { name, info, rank: direct ? 0 : related ? 1 : 2 };
  }).filter(entry => entry.rank < 2).sort((a, b) => a.rank - b.rank).map(({ name, info }) => [name, info] as const);
}
