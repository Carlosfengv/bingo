/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/tailwindScale.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Tailwind scale data, class parsing, and smart class merging.
*/
var SPACING_SCALE = {
  "0": "0px",
  "px": "1px",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "1.5": "0.375rem",
  "2": "0.5rem",
  "2.5": "0.625rem",
  "3": "0.75rem",
  "3.5": "0.875rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "9": "2.25rem",
  "10": "2.5rem",
  "11": "2.75rem",
  "12": "3rem",
  "14": "3.5rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "28": "7rem",
  "32": "8rem",
  "36": "9rem",
  "40": "10rem",
  "44": "11rem",
  "48": "12rem",
  "52": "13rem",
  "56": "14rem",
  "60": "15rem",
  "64": "16rem",
  "72": "18rem",
  "80": "20rem",
  "96": "24rem"
};
var SIZING_SCALE = {
  ...SPACING_SCALE,
  "auto": "auto",
  "full": "100%",
  "screen": "100vw",
  "1/2": "50%",
  "1/3": "33.333%",
  "2/3": "66.667%",
  "1/4": "25%",
  "2/4": "50%",
  "3/4": "75%",
  "min": "min-content",
  "max": "max-content",
  "fit": "fit-content"
};
var FONT_SIZE_SCALE = {
  "xs": "0.75rem",
  "sm": "0.875rem",
  "base": "1rem",
  "lg": "1.125rem",
  "xl": "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
  "9xl": "8rem"
};
var FONT_WEIGHT_SCALE = {
  "thin": "100",
  "extralight": "200",
  "light": "300",
  "normal": "400",
  "medium": "500",
  "semibold": "600",
  "bold": "700",
  "extrabold": "800",
  "black": "900"
};
var BORDER_RADIUS_SCALE = {
  "none": "0px",
  "sm": "0.125rem",
  "DEFAULT": "0.25rem",
  "md": "0.375rem",
  "lg": "0.5rem",
  "xl": "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  "full": "9999px"
};
var OPACITY_SCALE = {
  "0": "0",
  "5": "0.05",
  "10": "0.1",
  "15": "0.15",
  "20": "0.2",
  "25": "0.25",
  "30": "0.3",
  "35": "0.35",
  "40": "0.4",
  "45": "0.45",
  "50": "0.5",
  "55": "0.55",
  "60": "0.6",
  "65": "0.65",
  "70": "0.7",
  "75": "0.75",
  "80": "0.8",
  "85": "0.85",
  "90": "0.9",
  "95": "0.95",
  "100": "1"
};
var BORDER_STYLE_TOKENS = new Set(["solid", "dashed", "dotted", "double", "none"]);
function isArbitraryBorderWidth(token) {
  return /^\[(?:length:)?-?(?:\d*\.)?\d+(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)\]$/.test(token) || /^\(length:/.test(token);
}
function arbitraryBorderWidthValue(token) {
  return token.match(/^\[(?:length:)?(.+)\]$/)?.[1] ?? null;
}
function tailwindColorValue(token) {
  const colorToken = token.split("/")[0];
  if (colorToken === "black") return "#000000";
  if (colorToken === "white") return "#ffffff";
  if (colorToken === "transparent") return "transparent";
  if (colorToken === "current") return "currentColor";
  if (colorToken === "inherit") return "inherit";
  const match = colorToken.match(/^([a-z]+)-(\d{2,3})$/);
  return match ? TW_COLORS[match[1]]?.[match[2]] ?? null : null;
}
function parseTailwindClass(cls) {
  const spacingMatch = cls.match(/^(-?)([mp])([trblxy]?)-(.+)$/);
  if (spacingMatch) {
    const [, neg, type, side, scaleKey] = spacingMatch;
    const val = SPACING_SCALE[scaleKey];
    if (!val) return null;
    const value = neg ? `-${val}` : val;
    const propBase = type === "p" ? "padding" : "margin";
    const props = {
      "": [propBase + "Top", propBase + "Right", propBase + "Bottom", propBase + "Left"],
      "t": [propBase + "Top"],
      "r": [propBase + "Right"],
      "b": [propBase + "Bottom"],
      "l": [propBase + "Left"],
      "x": [propBase + "Left", propBase + "Right"],
      "y": [propBase + "Top", propBase + "Bottom"]
    }[side];
    if (!props) return null;
    const result = {};
    for (const p of props) result[p] = value;
    return result;
  }
  const whMatch = cls.match(/^(w|h|min-w|max-w|min-h|max-h)-(.+)$/);
  if (whMatch) {
    const [, prefix, scaleKey] = whMatch;
    const val = SIZING_SCALE[scaleKey] || SPACING_SCALE[scaleKey];
    if (!val) return null;
    return {
      [{
        "w": "width",
        "h": "height",
        "min-w": "minWidth",
        "max-w": "maxWidth",
        "min-h": "minHeight",
        "max-h": "maxHeight"
      }[prefix]]: val
    };
  }
  const gapMatch = cls.match(/^gap-(.+)$/);
  if (gapMatch) {
    const val = SPACING_SCALE[gapMatch[1]];
    if (val) return {
      gap: val
    };
  }
  const textSizeMatch = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/);
  if (textSizeMatch) {
    const val = FONT_SIZE_SCALE[textSizeMatch[1]];
    if (val) return {
      fontSize: val
    };
  }
  const fontWeightMatch = cls.match(/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/);
  if (fontWeightMatch) {
    const val = FONT_WEIGHT_SCALE[fontWeightMatch[1]];
    if (val) return {
      fontWeight: val
    };
  }
  if (cls === "rounded") return {
    borderRadius: BORDER_RADIUS_SCALE["DEFAULT"]
  };
  const roundedMatch = cls.match(/^rounded-(none|sm|md|lg|xl|2xl|3xl|full)$/);
  if (roundedMatch) {
    const val = BORDER_RADIUS_SCALE[roundedMatch[1]];
    if (val) return {
      borderRadius: val
    };
  }
  const opacityMatch = cls.match(/^opacity-(\d+)$/);
  if (opacityMatch) {
    const val = OPACITY_SCALE[opacityMatch[1]];
    if (val) return {
      opacity: val
    };
  }
  const displayMap = {
    "block": "block",
    "inline-block": "inline-block",
    "inline": "inline",
    "flex": "flex",
    "inline-flex": "inline-flex",
    "grid": "grid",
    "inline-grid": "inline-grid",
    "hidden": "none"
  };
  if (displayMap[cls]) return {
    display: displayMap[cls]
  };
  const flexDirMap = {
    "flex-row": "row",
    "flex-col": "column",
    "flex-row-reverse": "row-reverse",
    "flex-col-reverse": "column-reverse"
  };
  if (flexDirMap[cls]) return {
    flexDirection: flexDirMap[cls]
  };
  if (cls === "flex-wrap") return {
    flexWrap: "wrap"
  };
  if (cls === "flex-nowrap") return {
    flexWrap: "nowrap"
  };
  const justifyMap = {
    "justify-start": "flex-start",
    "justify-end": "flex-end",
    "justify-center": "center",
    "justify-between": "space-between",
    "justify-around": "space-around",
    "justify-evenly": "space-evenly"
  };
  if (justifyMap[cls]) return {
    justifyContent: justifyMap[cls]
  };
  const alignMap = {
    "items-start": "flex-start",
    "items-end": "flex-end",
    "items-center": "center",
    "items-baseline": "baseline",
    "items-stretch": "stretch"
  };
  if (alignMap[cls]) return {
    alignItems: alignMap[cls]
  };
  const posMap = {
    "static": "static",
    "relative": "relative",
    "absolute": "absolute",
    "fixed": "fixed",
    "sticky": "sticky"
  };
  if (posMap[cls]) return {
    position: posMap[cls]
  };
  const overflowMatch = cls.match(/^overflow-(auto|hidden|visible|scroll|clip)$/);
  if (overflowMatch) return {
    overflow: overflowMatch[1]
  };
  if (cls === "border") return {
    borderWidth: "1px",
    borderStyle: "solid"
  };
  const borderWidthMatch = cls.match(/^border-(\d+)$/);
  if (borderWidthMatch) return {
    borderWidth: `${borderWidthMatch[1]}px`,
    borderStyle: "solid"
  };
  const borderSideMatch = cls.match(/^border-([trblxy])(?:-(.+))?$/);
  if (borderSideMatch) {
    const [, side, token] = borderSideMatch;
    const names = {
      t: ["Top"],
      r: ["Right"],
      b: ["Bottom"],
      l: ["Left"],
      x: ["Left", "Right"],
      y: ["Top", "Bottom"]
    }[side];
    const result = {};
    if (!token || /^\d+$/.test(token) || isArbitraryBorderWidth(token)) {
      const width = !token ? "1px" : arbitraryBorderWidthValue(token) ?? `${token}px`;
      for (const name of names) {
        result[`border${name}Width`] = width;
        result[`border${name}Style`] = "solid";
      }
      return result;
    }
    if (BORDER_STYLE_TOKENS.has(token)) {
      for (const name of names) result[`border${name}Style`] = token;
      return result;
    }
    const color = tailwindColorValue(token);
    if (color) {
      for (const name of names) result[`border${name}Color`] = color;
      return result;
    }
  }
  const borderStyleMatch = cls.match(/^border-(solid|dashed|dotted|double|none)$/);
  if (borderStyleMatch) return {
    borderStyle: borderStyleMatch[1]
  };
  const zMatch = cls.match(/^z-(\d+|auto)$/);
  if (zMatch) return {
    zIndex: zMatch[1]
  };
  const textAlignMap = {
    "text-left": "left",
    "text-center": "center",
    "text-right": "right",
    "text-justify": "justify"
  };
  if (textAlignMap[cls]) return {
    textAlign: textAlignMap[cls]
  };
  const colorMatch = cls.match(/^(bg|text|border)-(black|white|transparent)$/) || cls.match(/^(bg|text|border)-([a-z]+)-(\d{2,3})$/);
  if (colorMatch) {
    const [, prefix, colorName, shade] = colorMatch;
    const cssProp = {
      bg: "backgroundColor",
      text: "color",
      border: "borderColor"
    }[prefix];
    if (!cssProp) return null;
    if (colorName === "black") return {
      [cssProp]: "#000000"
    };
    if (colorName === "white") return {
      [cssProp]: "#ffffff"
    };
    if (colorName === "transparent") return {
      [cssProp]: "transparent"
    };
    const hex = TW_COLORS[colorName]?.[shade];
    if (hex) return {
      [cssProp]: hex
    };
  }
  return null;
}
var TAILWIND_CATEGORY_PATTERNS = [[/^w-/, "width"], [/^min-w-/, "min-width"], [/^max-w-/, "max-width"], [/^h-/, "height"], [/^min-h-/, "min-height"], [/^max-h-/, "max-height"], [/^p-/, "padding"], [/^px-/, "padding-x"], [/^py-/, "padding-y"], [/^pt-/, "padding-top"], [/^pr-/, "padding-right"], [/^pb-/, "padding-bottom"], [/^pl-/, "padding-left"], [/^m-/, "margin"], [/^mx-/, "margin-x"], [/^my-/, "margin-y"], [/^mt-/, "margin-top"], [/^mr-/, "margin-right"], [/^mb-/, "margin-bottom"], [/^ml-/, "margin-left"], [/^-m/, "margin"], [/^bg-/, "background"], [/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/, "text-size"], [/^text-(left|center|right|justify)$/, "text-align"], [/^text-(?!xs$|sm$|base$|lg$|xl$|2xl$|3xl$|4xl$|5xl$|6xl$|7xl$|8xl$|9xl$|left$|center$|right$|justify$|wrap$|nowrap$|ellipsis$|clip$)/, "text-color"], [/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, "font-weight"], [/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden)$/, "display"], [/^flex-(row|col|row-reverse|col-reverse)$/, "flex-direction"], [/^flex-(wrap|wrap-reverse|nowrap)$/, "flex-wrap"], [/^justify-/, "justify-content"], [/^items-/, "align-items"], [/^gap-/, "gap"], [/^rounded/, "border-radius"], [/^opacity-/, "opacity"], [/^(static|fixed|absolute|relative|sticky)$/, "position"], [/^overflow-/, "overflow"], [/^z-/, "z-index"], [/^shadow(-2xs|-xs|-sm|-md|-lg|-xl|-2xl|-none|-inner)?$/, "shadow-size"], [/^shadow-(?!2xs$|xs$|sm$|md$|lg$|xl$|2xl$|none$|inner$)[a-z]/, "shadow-color"], [/^ring(-0|-1|-2|-4|-8)?$/, "ring-width"], [/^ring-(?!0$|1$|2$|4$|8$|offset|inset)[a-z]/, "ring-color"], [/^ring-offset-\d/, "ring-offset"], [/^ring-offset-(?!\d)[a-z]/, "ring-offset-color"], [/^blur(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/, "blur"], [/^backdrop-blur(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/, "backdrop-blur"]];
var BORDER_DIRECTIONS = {
  t: "top",
  r: "right",
  b: "bottom",
  l: "left",
  x: "x",
  y: "y",
  s: "start",
  e: "end"
};
/** Every class category owned by the Border inspector section. */
var BORDER_TAILWIND_CATEGORIES = ["border-width", "border-color", "border-style", ...Object.values(BORDER_DIRECTIONS).flatMap(side => [`border-width-${side}`, `border-color-${side}`, `border-style-${side}`])];
/**
* Border utility names overlap heavily: `border-b` is a bottom width while
* `border-b-blue-500` is a bottom color. Classify the complete token before
* the general Tailwind patterns so one border property cannot consume another.
*/
function getBorderTailwindCategory(className) {
  if (className === "border") return "border-width";
  if (!className.startsWith("border-")) return null;
  const token = className.slice(7);
  if (/^(?:collapse|separate|spacing)(?:-|$)/.test(token)) return null;
  const directional = token.match(/^([trblxyse])(?:-(.+))?$/);
  if (directional) {
    const side = BORDER_DIRECTIONS[directional[1]];
    const value = directional[2];
    if (!value || /^\d+(?:\.\d+)?$/.test(value) || isArbitraryBorderWidth(value)) return `border-width-${side}`;
    if (BORDER_STYLE_TOKENS.has(value)) return `border-style-${side}`;
    return `border-color-${side}`;
  }
  if (/^\d+(?:\.\d+)?$/.test(token) || isArbitraryBorderWidth(token)) return "border-width";
  if (BORDER_STYLE_TOKENS.has(token)) return "border-style";
  return "border-color";
}
function getTailwindCategory(className) {
  const borderCategory = getBorderTailwindCategory(className);
  if (borderCategory) return borderCategory;
  for (const [pattern, category] of TAILWIND_CATEGORY_PATTERNS) if (pattern.test(className)) return category;
  return null;
}
var CATEGORY_CONFLICTS = {
  "padding": ["padding-x", "padding-y", "padding-top", "padding-right", "padding-bottom", "padding-left"],
  "padding-x": ["padding"],
  "padding-y": ["padding"],
  "margin": ["margin-x", "margin-y", "margin-top", "margin-right", "margin-bottom", "margin-left"],
  "margin-x": ["margin"],
  "margin-y": ["margin"],
  "border-width": Object.values(BORDER_DIRECTIONS).map(side => `border-width-${side}`),
  "border-color": Object.values(BORDER_DIRECTIONS).map(side => `border-color-${side}`),
  "border-style": Object.values(BORDER_DIRECTIONS).map(side => `border-style-${side}`)
};
function getConflictingCategories(cat) {
  return [cat, ...(CATEGORY_CONFLICTS[cat] || [])];
}
function smartMergeClasses(existing, newOnes) {
  const result = [...existing];
  for (const nc of newOnes) {
    const cat = getTailwindCategory(nc);
    if (cat) {
      const conflicts = getConflictingCategories(cat);
      for (let i = result.length - 1; i >= 0; i--) {
        const existingCat = getTailwindCategory(result[i]);
        if (existingCat && conflicts.includes(existingCat)) result.splice(i, 1);
      }
    }
    if (!result.includes(nc)) result.push(nc);
  }
  return result;
}
var TW_COLORS = {
  slate: {
    "50": "#f8fafc",
    "100": "#f1f5f9",
    "200": "#e2e8f0",
    "300": "#cbd5e1",
    "400": "#94a3b8",
    "500": "#64748b",
    "600": "#475569",
    "700": "#334155",
    "800": "#1e293b",
    "900": "#0f172a",
    "950": "#020617"
  },
  gray: {
    "50": "#f9fafb",
    "100": "#f3f4f6",
    "200": "#e5e7eb",
    "300": "#d1d5db",
    "400": "#9ca3af",
    "500": "#6b7280",
    "600": "#4b5563",
    "700": "#374151",
    "800": "#1f2937",
    "900": "#111827",
    "950": "#030712"
  },
  zinc: {
    "50": "#fafafa",
    "100": "#f4f4f5",
    "200": "#e4e4e7",
    "300": "#d4d4d8",
    "400": "#a1a1aa",
    "500": "#71717a",
    "600": "#52525b",
    "700": "#3f3f46",
    "800": "#27272a",
    "900": "#18181b",
    "950": "#09090b"
  },
  neutral: {
    "50": "#fafafa",
    "100": "#f5f5f5",
    "200": "#e5e5e5",
    "300": "#d4d4d4",
    "400": "#a3a3a3",
    "500": "#737373",
    "600": "#525252",
    "700": "#404040",
    "800": "#262626",
    "900": "#171717",
    "950": "#0a0a0a"
  },
  red: {
    "50": "#fef2f2",
    "100": "#fee2e2",
    "200": "#fecaca",
    "300": "#fca5a5",
    "400": "#f87171",
    "500": "#ef4444",
    "600": "#dc2626",
    "700": "#b91c1c",
    "800": "#991b1b",
    "900": "#7f1d1d",
    "950": "#450a0a"
  },
  orange: {
    "50": "#fff7ed",
    "100": "#ffedd5",
    "200": "#fed7aa",
    "300": "#fdba74",
    "400": "#fb923c",
    "500": "#f97316",
    "600": "#ea580c",
    "700": "#c2410c",
    "800": "#9a3412",
    "900": "#7c2d12",
    "950": "#431407"
  },
  amber: {
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03"
  },
  yellow: {
    "50": "#fefce8",
    "100": "#fef9c3",
    "200": "#fef08a",
    "300": "#fde047",
    "400": "#facc15",
    "500": "#eab308",
    "600": "#ca8a04",
    "700": "#a16207",
    "800": "#854d0e",
    "900": "#713f12",
    "950": "#422006"
  },
  lime: {
    "50": "#f7fee7",
    "100": "#ecfccb",
    "200": "#d9f99d",
    "300": "#bef264",
    "400": "#a3e635",
    "500": "#84cc16",
    "600": "#65a30d",
    "700": "#4d7c0f",
    "800": "#3f6212",
    "900": "#365314",
    "950": "#1a2e05"
  },
  green: {
    "50": "#f0fdf4",
    "100": "#dcfce7",
    "200": "#bbf7d0",
    "300": "#86efac",
    "400": "#4ade80",
    "500": "#22c55e",
    "600": "#16a34a",
    "700": "#15803d",
    "800": "#166534",
    "900": "#14532d",
    "950": "#052e16"
  },
  emerald: {
    "50": "#ecfdf5",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
    "950": "#022c22"
  },
  teal: {
    "50": "#f0fdfa",
    "100": "#ccfbf1",
    "200": "#99f6e4",
    "300": "#5eead4",
    "400": "#2dd4bf",
    "500": "#14b8a6",
    "600": "#0d9488",
    "700": "#0f766e",
    "800": "#115e59",
    "900": "#134e4a",
    "950": "#042f2e"
  },
  cyan: {
    "50": "#ecfeff",
    "100": "#cffafe",
    "200": "#a5f3fc",
    "300": "#67e8f9",
    "400": "#22d3ee",
    "500": "#06b6d4",
    "600": "#0891b2",
    "700": "#0e7490",
    "800": "#155e75",
    "900": "#164e63",
    "950": "#083344"
  },
  sky: {
    "50": "#f0f9ff",
    "100": "#e0f2fe",
    "200": "#bae6fd",
    "300": "#7dd3fc",
    "400": "#38bdf8",
    "500": "#0ea5e9",
    "600": "#0284c7",
    "700": "#0369a1",
    "800": "#075985",
    "900": "#0c4a6e",
    "950": "#082f49"
  },
  blue: {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554"
  },
  indigo: {
    "50": "#eef2ff",
    "100": "#e0e7ff",
    "200": "#c7d2fe",
    "300": "#a5b4fc",
    "400": "#818cf8",
    "500": "#6366f1",
    "600": "#4f46e5",
    "700": "#4338ca",
    "800": "#3730a3",
    "900": "#312e81",
    "950": "#1e1b4b"
  },
  violet: {
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
    "950": "#2e1065"
  },
  purple: {
    "50": "#faf5ff",
    "100": "#f3e8ff",
    "200": "#e9d5ff",
    "300": "#d8b4fe",
    "400": "#c084fc",
    "500": "#a855f7",
    "600": "#9333ea",
    "700": "#7e22ce",
    "800": "#6b21a8",
    "900": "#581c87",
    "950": "#3b0764"
  },
  fuchsia: {
    "50": "#fdf4ff",
    "100": "#fae8ff",
    "200": "#f5d0fe",
    "300": "#f0abfc",
    "400": "#e879f9",
    "500": "#d946ef",
    "600": "#c026d3",
    "700": "#a21caf",
    "800": "#86198f",
    "900": "#701a75",
    "950": "#4a044e"
  },
  pink: {
    "50": "#fdf2f8",
    "100": "#fce7f3",
    "200": "#fbcfe8",
    "300": "#f9a8d4",
    "400": "#f472b6",
    "500": "#ec4899",
    "600": "#db2777",
    "700": "#be185d",
    "800": "#9d174d",
    "900": "#831843",
    "950": "#500724"
  },
  rose: {
    "50": "#fff1f2",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
    "950": "#4c0519"
  }
};
/**
* Get all Tailwind color classes for a CSS property (bg, text, border).
* Returns the full static palette — not dependent on compiled CSS.
*/
function getAllTailwindColors(cssProperty) {
  const prefix = cssProperty === "backgroundColor" ? "bg" : cssProperty === "color" ? "text" : cssProperty === "borderColor" ? "border" : null;
  if (!prefix) return [];
  const results = [];
  results.push({
    className: `${prefix}-black`,
    value: "#000000"
  });
  results.push({
    className: `${prefix}-white`,
    value: "#ffffff"
  });
  results.push({
    className: `${prefix}-transparent`,
    value: "transparent"
  });
  for (const [colorName, shades] of Object.entries(TW_COLORS)) for (const [shade, hex] of Object.entries(shades)) results.push({
    className: `${prefix}-${colorName}-${shade}`,
    value: hex
  });
  return results;
}
/**
* Static Tailwind options for effect types (shadow, ring, ring-offset).
* These don't depend on compiled CSS — they're the full Tailwind scale.
*/
function getAllTailwindEffects(effectType) {
  switch (effectType) {
    case "shadow":
      return [{
        className: "shadow-2xs",
        value: "0 1px"
      }, {
        className: "shadow-xs",
        value: "0 1px 2px"
      }, {
        className: "shadow-sm",
        value: "0 1px 3px"
      }, {
        className: "shadow",
        value: "0 1px 3px, 0 1px 2px"
      }, {
        className: "shadow-md",
        value: "0 4px 6px"
      }, {
        className: "shadow-lg",
        value: "0 10px 15px"
      }, {
        className: "shadow-xl",
        value: "0 20px 25px"
      }, {
        className: "shadow-2xl",
        value: "0 25px 50px"
      }, {
        className: "shadow-inner",
        value: "inset 0 2px 4px"
      }, {
        className: "shadow-none",
        value: "none"
      }];
    case "shadow-color":
      return getAllTailwindColors("backgroundColor").map(c => ({
        className: c.className.replace(/^bg-/, "shadow-"),
        value: c.value
      }));
    case "ring":
      return [{
        className: "ring-0",
        value: "0px"
      }, {
        className: "ring-1",
        value: "1px"
      }, {
        className: "ring-2",
        value: "2px"
      }, {
        className: "ring",
        value: "3px"
      }, {
        className: "ring-4",
        value: "4px"
      }, {
        className: "ring-8",
        value: "8px"
      }, {
        className: "ring-inset",
        value: "inset"
      }];
    case "ring-color":
      return getAllTailwindColors("backgroundColor").map(c => ({
        className: c.className.replace(/^bg-/, "ring-"),
        value: c.value
      }));
    case "ring-offset":
      return [{
        className: "ring-offset-0",
        value: "0px"
      }, {
        className: "ring-offset-1",
        value: "1px"
      }, {
        className: "ring-offset-2",
        value: "2px"
      }, {
        className: "ring-offset-4",
        value: "4px"
      }, {
        className: "ring-offset-8",
        value: "8px"
      }];
    case "ring-offset-color":
      return getAllTailwindColors("backgroundColor").map(c => ({
        className: c.className.replace(/^bg-/, "ring-offset-"),
        value: c.value
      }));
    case "blur":
      return [{
        className: "blur-none",
        value: "0"
      }, {
        className: "blur-xs",
        value: "2px"
      }, {
        className: "blur-sm",
        value: "4px"
      }, {
        className: "blur",
        value: "8px"
      }, {
        className: "blur-md",
        value: "12px"
      }, {
        className: "blur-lg",
        value: "16px"
      }, {
        className: "blur-xl",
        value: "24px"
      }, {
        className: "blur-2xl",
        value: "40px"
      }, {
        className: "blur-3xl",
        value: "64px"
      }];
    case "backdrop-blur":
      return [{
        className: "backdrop-blur-none",
        value: "0"
      }, {
        className: "backdrop-blur-xs",
        value: "2px"
      }, {
        className: "backdrop-blur-sm",
        value: "4px"
      }, {
        className: "backdrop-blur",
        value: "8px"
      }, {
        className: "backdrop-blur-md",
        value: "12px"
      }, {
        className: "backdrop-blur-lg",
        value: "16px"
      }, {
        className: "backdrop-blur-xl",
        value: "24px"
      }, {
        className: "backdrop-blur-2xl",
        value: "40px"
      }, {
        className: "backdrop-blur-3xl",
        value: "64px"
      }];
    default:
      return [];
  }
}

export { BORDER_TAILWIND_CATEGORIES, getAllTailwindColors, getAllTailwindEffects, getTailwindCategory, parseTailwindClass, smartMergeClasses };
