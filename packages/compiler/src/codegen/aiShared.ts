/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/aiShared.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Serialize element with max depth to prevent huge prompts.
*  depth=0 means just the element tag, depth=1 means its direct children, etc.
*  Beyond maxDepth, children are summarized as comments. */
function elementToJSXShallow(el, indent, maxDepth, currentDepth = 0) {
  const pad = "  ".repeat(indent);
  if (el.type === "text") return `${pad}${el.text || ""}`;
  if (el.type === "icon") {
    const props = [`id="${el.id}"`, `data-icon="${el.iconName}"`];
    if (el.library) props.push(`data-icon-library="${el.library}"`);
    if (el.props) {
      for (const [key, value] of Object.entries(el.props)) if (value !== void 0) props.push(typeof value === "string" ? `${key}="${value}"` : `${key}={${JSON.stringify(value)}}`);
    }
    return `${pad}<i ${props.join(" ")} />`;
  }
  if (el.type === "capture") {
    const children = el.children ?? [];
    if (children.length === 0) return `${pad}<></>`;
    if (children.length === 1) return elementToJSXShallow(children[0], indent, maxDepth, currentDepth);
    if (currentDepth >= maxDepth) return `${pad}<>\n${pad}  {/* ${children.length} children — use ReadCanvas("${el.id}") to see */}\n${pad}</>`;
    return `${pad}<>\n${children.map(c => elementToJSXShallow(c, indent + 1, maxDepth, currentDepth + 1)).join("\n")}\n${pad}</>`;
  }
  const tagName = el.type === "component" ? el.componentName : el.type === "html" ? el.tag : "unknown";
  const props = [`id="${el.id}"`];
  if (el.type === "html" || el.type === "component") {
    if (el.styles?.className) props.push(`className="${el.styles.className}"`);
    if (el.props) for (const [key, value] of Object.entries(el.props)) props.push(typeof value === "string" ? `${key}="${value}"` : `${key}={${JSON.stringify(value)}}`);
  }
  const propsStr = " " + props.join(" ");
  const children = "children" in el && el.children ? el.children : [];
  if (children.length === 0) return `${pad}<${tagName}${propsStr} />`;
  if (currentDepth >= maxDepth) return `${pad}<${tagName}${propsStr}>\n${pad}  {/* ${children.length} children — use ReadCanvas("${el.id}") to see */}\n${pad}</${tagName}>`;
  return `${pad}<${tagName}${propsStr}>\n${children.map(c => elementToJSXShallow(c, indent + 1, maxDepth, currentDepth + 1)).join("\n")}\n${pad}</${tagName}>`;
}
/** Build parent breadcrumb path for context (e.g. "div#root > section > ...") */
function findParentPath(elements, targetId) {
  function walk(el, path) {
    if (el.id === targetId) return path;
    if ("children" in el && el.children) {
      const tag = el.componentName || el.tag || el.type;
      for (const child of el.children) {
        const found = walk(child, [...path, `${tag}#${el.id}`]);
        if (found) return found;
      }
    }
    return null;
  }
  for (const root of elements) {
    const found = walk(root, []);
    if (found) return found;
  }
  return [];
}
function formatElementWithContext(el, allElements) {
  const jsx = elementToJSXShallow(el, 0, 2);
  const parentPath = findParentPath(allElements, el.id);
  const breadcrumb = parentPath.length > 0 ? `Parent path: ${parentPath.join(" > ")}\n` : "";
  return `**Element ID: \`${el.id}\`** ← USE THIS ID!\n${breadcrumb}\`\`\`jsx\n${jsx}\n\`\`\``;
}
function buildCanvasSummary(elements) {
  if (elements.length === 0) return "Empty canvas (no elements)";
  const lines = elements.map(el => {
    const tag = el.type === "component" ? el.componentName : el.type === "capture" ? el.original.componentName : el.type === "html" ? el.tag : el.type;
    const childCount = "children" in el && el.children ? el.children.length : 0;
    return `- ${tag} id="${el.id}"${childCount > 0 ? ` (${childCount} children)` : ""}`;
  });
  return `${elements.length} top-level element(s):\n${lines.join("\n")}\n\nUse canvas_read to see full element JSX and IDs before making changes.`;
}
function getIconsSection(libraryName) {
  if (!libraryName) return "";
  const isPhosphor = libraryName.includes("phosphor");
  const isLucide = libraryName.includes("lucide");
  const isHeroicons = libraryName.includes("@heroicons/react");
  const isTabler = libraryName === "@tabler/icons-react";
  const iconExamples = isHeroicons ? `<i data-icon="ArrowDownCircleIcon" data-icon-library="${libraryName}" size={20} />
<i data-icon="Cog6ToothIcon" data-icon-library="${libraryName}" size={16} className="text-gray-500" />
<i data-icon="ChevronDownIcon" data-icon-library="${libraryName}" size={16} />` : isTabler ? `<i data-icon="IconPlayerPlay" data-icon-library="${libraryName}" size={20} />
<i data-icon="IconSettings" data-icon-library="${libraryName}" size={16} className="text-muted-foreground" />
<i data-icon="IconChevronDown" data-icon-library="${libraryName}" size={16} />` : isPhosphor ? `<i data-icon="Play" data-icon-library="@phosphor-icons/react" size={20} />
<i data-icon="Gear" data-icon-library="@phosphor-icons/react" size={16} className="text-gray-500" weight="bold" />
<i data-icon="CaretDown" data-icon-library="@phosphor-icons/react" size={16} />` : isLucide ? `<i data-icon="CirclePlay" data-icon-library="lucide-react" size={20} />
<i data-icon="Settings" data-icon-library="lucide-react" size={16} className="text-gray-500" strokeWidth={1.5} />
<i data-icon="ChevronDown" data-icon-library="lucide-react" size={16} />` : `<!-- Call search_icons for ${libraryName}; use an exact returned name in data-icon. -->`;
  return `## Icons (${isHeroicons ? "Heroicons" : isPhosphor ? "Phosphor" : isLucide ? "Lucide" : libraryName})
Icon library: **${libraryName}**

### Canvas Icon Format (CRITICAL — follow exactly):
**NEVER use component syntax** like \`<Eye />\`, \`<Settings />\`, \`<Play />\` on canvas. Component imports don't exist on canvas — they render as broken/unknown components.

**ALWAYS use \`data-icon\` + \`data-icon-library\` attributes — BOTH are required:**
\`\`\`jsx
${iconExamples}
\`\`\`

Canvas readback may serialize an existing icon as a named tag. That alone is not a rendering failure; preserve existing icons during unrelated edits. When authoring a new icon, use an exact search_icons result in the attribute format above.

### Icon Props
**Use \`size\` prop for sizing, NOT className w-X h-X.** \`className="w-3.5 h-3.5"\` does NOT work on data-icon elements. Use className only for color/opacity (e.g. \`className="text-muted-foreground"\`).
${isHeroicons ? `- **size**: number — Bingo maps this to SVG width/height for Heroicons
- **className**: text color utilities (e.g., "text-gray-500")
- **strokeWidth**: outline icons accept SVG strokeWidth if needed` : isPhosphor ? `- **size**: number (default 24) — icon size in px
- **weight**: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" (default "regular")
- **color**: string — icon color (e.g., "currentColor", "#333")
- **mirrored**: boolean — flip horizontally` : `- **size**: number (default 24) — icon size in px
- **strokeWidth**: number (default 2) — stroke thickness
- **color**: string — icon color (e.g., "currentColor", "#333")`}

### Library
- Preferred icon library: **${libraryName}**. Always use icons from this library.
- For Heroicons, icon names include the \`Icon\` suffix (for example \`ArrowDownCircleIcon\`, NOT \`ArrowDownCircle\`).
- For Tabler, preserve the \`Icon\` prefix (for example \`IconClock\`, NOT \`clock\`).
- Preserve existing icons unless the user asks to change them or they fail to render.
- Use search_icons to find icon names by keyword.

### In Component Files (project_write tool):
Use real imports — \`data-icon\` does NOT work in .tsx files:
\`\`\`tsx
${isHeroicons ? `import { ArrowDownCircleIcon, Cog6ToothIcon } from '${libraryName}'
<ArrowDownCircleIcon width={20} height={20} className="text-primary" />
<Cog6ToothIcon width={16} height={16} className="text-muted-foreground" />` : isTabler ? `import { IconPlayerPlay, IconSettings } from '${libraryName}'
<IconPlayerPlay size={20} className="text-primary" />
<IconSettings size={16} className="text-muted-foreground" />` : isPhosphor || isLucide ? `import { ${isPhosphor ? "Play, Gear" : "Play, Settings"} } from '${libraryName}'
<${isPhosphor ? "Play size={20}" : "Play size={20}"} className="text-primary" />
<${isPhosphor ? "Gear size={16} weight=\"duotone\"" : "Settings size={16} strokeWidth={1.5}"} className="text-muted-foreground" />` : `// Use verified exports from '${libraryName}'; do not copy another pack's names.`}
\`\`\`
Component syntax (\`<Eye />\`) is ONLY valid inside .tsx files with real imports. On canvas, ALWAYS use data-icon.`;
}
function buildBingoGuidance(options = {}) {
  const iconsSection = (options.iconLibraryNames ?? []).map(lib => getIconsSection(lib)).filter(Boolean).join("\n\n");
  return `## Design Quality (CRITICAL)
- **MANDATORY — load bingo-design first.** Before your first \`canvas_add\` / \`canvas_update\` / \`canvas_edit\` / \`canvas_insert\` in ANY design task, call \`read_skill\` with name \`bingo-design\` and follow it (including the screenshot-critique loop). Those tools **return an error** until you do.
- **Be FAITHFUL to references.** Match every detail. Don't improvise or add extra elements.
- **Gather once.** Call \`get_design_context\` before drafting unless the prompt already contains sufficient theme, component, and active-page context. Do not separately call \`get_theme\`, unfiltered \`search_components\`, and \`canvas_list\` after it.
- **Use EXISTING components.** Use the combined context first; call \`search_components\` only for a specific unresolved noun. Never create raw \`<button>\`/\`<input>\`/\`<select>\`/\`<textarea>\` when project components exist — writes reject them.
- **Verify reuse and style sources.** Read real component APIs/compositions; an index miss is not proof of absence. Native layout/text is allowed, but do not imitate available components with div/span. Use source semantic tokens and scales for color, type, spacing, radius and shadow; example names such as \`bg-primary\` are valid only if the project defines them. Inspect written JSX and design diagnostics before the screenshot; matching pixels do not prove token/component reuse.
- Every component must have realistic mock data — never empty tables, lists, or forms.
- Use "use client" if using useState/useEffect.

## Images
When user shares an image: describe EXACTLY what you see, then replicate it precisely. If you cannot see an image, say so — never guess.

## Screenshots
**take_screenshot** captures an element for you and the user. @-referenced elements often already include an auto-screenshot. After mutating under a claim you MUST screenshot before \`canvas_release\` (release errors otherwise).

## Modifying Canvas Elements
When user references an element with [@...], they are pointing at a **canvas element** to edit — preserve everything not in the request:
1. Use the referenced IDs. Prefer \`canvas_grep\` / \`canvas_query\` to find anchors without loading huge trees.
2. \`canvas_read\` the element (or a small ancestor) — required before claim. Large trees may return \`bingo:truncated\` stubs; drill with \`canvas_read\` on stub ids when needed.
3. \`canvas_claim\` → surgical \`canvas_edit\` / \`canvas_insert\` (not a full rewrite). Locks expire after 5 minutes — re-claim if you still need them.
4. Reserve \`canvas_update\` for intentional full replacement. You MAY echo \`data-element-id\` from \`canvas_read\` to preserve child identity.
5. \`take_screenshot\` → \`canvas_release\`.
Canvas is NOT a file — it lives in memory. There is NO canvas.json file.

## Adding New Content
When creating new elements on the canvas:
1. State a one-sentence mood/palette/type/density commitment to the user.
2. If the active page already has frames (canvas_list lists them), do **not** draw a new root on top of them. Omit x/y so the editor parks the shell to the right of existing work. To change existing work, canvas_read + claim it — do not rebuild a parallel frame on top.
3. Use canvas_add with claim_new=true for a meaningful visible shell, not a generic "Building..." placeholder and not the entire finished page/card. This adds and locks the new root in one call. The canvas paints as the JSX streams in.
4. Use the returned claim_id to add 2–4 meaningful chunks with canvas_add(parent_id) / canvas_insert so the user watches it build.
5. Take one screenshot after the complete draft, fix only material issues, then release. Do not retry a failed screenshot as separate tool calls; the tool performs one bounded internal retry for render-timing failures.

## Element IDs
- Never guess IDs — they look like "html-abc123xyz" or "el-1234567890-0".
- Use canvas_read / canvas_grep / canvas_query (or referenced-element context) to get exact IDs before canvas_claim.

## Canvas Code Rules
- \`className\` for Tailwind classes, \`style\` for inline CSS — never mix them.
- Tailwind arbitrary values (w-[800px]) don't work — use style={{ width: 800 }}.
- With no usable project theme, prefer inline CSS for reference-exact geometry, type, and color; do not discover missing utility classes through trial and error.
- No .map() on canvas (write rows explicitly). .map() is fine inside component files.
- No TanStack Table / React Hook Form — use existing components or plain HTML.

## Three.js and WebGL (SUPPORTED)
- Bingo supports WebGL component files, including \`three\`, \`@react-three/fiber\`, and \`@react-three/drei\`. When the user asks for 3D/WebGL, use it; do not replace it with CSS 3D or SVG merely because the project has no \`package.json\`.
- Create the scene in a \`.tsx\` component with \`project_write\`, then place that component on the canvas. Direct Three.js (for example \`import * as THREE from 'three'\`) and React Three Fiber are both valid.
- Browser rendering resolves bare npm imports from packages already installed in the local project or its workspace. Check \`package.json\` before using a package and do not assume an undeclared package is available.
- Bingo automatically preserves WebGL drawing buffers so \`take_screenshot\` can capture the scene. Verify the result with \`take_screenshot\`; if capture fails, report the actual tool error instead of assuming WebGL or the import is unsupported.
- WebGL scenes are file-edited rather than converted into editable DOM layers. This does not limit rendering, canvas placement, props, or screenshots.

## Component Workflow (creating new components)
- Use project_write to create component files in components/ directory (e.g. components/Modal.tsx, components/ui/Card.tsx).
- A component MUST exist as a file before it can be used on canvas — otherwise "Component not found".
- **Never reserve a name with a stub.** Do not write a green/red/empty placeholder so the component "registers." Copy or write the real file (and every file it imports) first, then put it on the canvas. A stub that imports missing CSS crashes as a red box and is worse than waiting.
- For full pages: Create 3-5 small component files, then compose on canvas with canvas_add.
- **Keep internal helper components stateless.** Sub-components in the same file should NOT use useState/useEffect — pass state down as props, or split into their own files.
- **Color props**: name them with a \`color\`/\`Color\`/\`bg\`/\`Background\`/\`fill\`/\`stroke\`/\`tint\`/\`accent\` suffix (e.g. \`backgroundColor\`, \`accentColor\`, \`fillColor\`) AND give them a CSS color literal default like \`'#3b82f6'\`, \`'rgb(...)'\`, or \`'oklch(...)'\` — never a theme-token name like \`'primary'\`. This makes Bingo render a color picker in the props panel.
- **Flat props, not nested objects.** Bingo's props panel can only edit primitive props (string, number, boolean, enum string union). \`title: string\` ✓, \`size: 'sm' | 'md' | 'lg'\` ✓, \`disabled: boolean\` ✓. \`config: { variant: string; size: number }\` ✗ — the user can't edit nested values in the panel. If you need related props, FLATTEN them: \`configVariant\` + \`configSize\` rather than a nested \`config\` object. Same goes for arrays of objects (\`items: Item[]\`) — those become opaque blobs in the panel; better to either accept them as required-props-with-mocks (for table-like components that genuinely need a list) or expose individual props per item if the count is small + fixed.
- **Required vs optional props.** Mark optional props with \`?\` and provide sensible defaults — Bingo uses these defaults when the user drops the component on canvas without configuring anything. Required props with no defaults force the user to configure before they see anything render.

## Bingo internals — where things live

Quick reference for ad-hoc questions about the project's settings/state:

- **Tailwind tokens** → \`tailwind.config.*\` + \`app/globals.css\` (\`@theme inline\` / \`:root { --token }\` blocks). The local builder picks up changes automatically on file write.
- **Fonts** → declared self-contained in \`app/globals.css\`: an \`@import url('https://fonts.googleapis.com/...')\` for Google families plus literal family names in the \`@theme inline\` block (\`--font-sans\` / \`--font-serif\` / \`--font-mono\`, e.g. \`--font-serif: 'Domine', serif\`). The css-builder extracts the \`@import\` URL and injects it as a \`<link>\`; the literal \`@theme\` tokens compile straight into \`font-*\` utilities. No separate settings file, no \`var()\` indirection.
- **Icon libraries** → use \`get_icon_libraries\` to inspect packages discovered from the bound project's npm dependencies and source imports. Auto-discovered libraries do not require a configuration write. Use \`set_icon_library\` only when a required installed library is not already enabled; it saves a manual preference when necessary.
- **Allowed local paths** → per-project, set via Settings UI in the editor. Listed in session context when connected from Bingo chat.
- **Canvas pages** → \`page\` table (one row per canvas tab). Use \`canvas_list\` to see them; the project always has at least one canvas.
- **Project files** → \`file\` table, accessed via \`project_read\`/\`project_write\`/\`project_glob\`/\`project_grep\` MCP tools. Path-based, like a regular filesystem.
- **Bingo skills** → app-owned workflow recipes exposed through \`list_skills\` and \`read_skill\` MCP tools. They are not Claude-global skills and should be fetched from Bingo when needed.
- **Component scan results** → \`project.scanResult\` JSONB. Cached. Use \`search_components\` MCP tool to query rather than reading directly.

If the user asks "where is X stored?" or "how do I change Y?" — answer from this reference. If a setting needs a tool that doesn't exist yet, say so honestly and offer the workaround.

## Bingo skills
- Use list_skills to discover Bingo-owned workflow recipes.
- Call read_skill with a skill \`name\` when the user's task matches that workflow. **\`bingo-design\` is required before canvas_add/canvas_update/canvas_edit/canvas_insert** (those tools error until loaded). Other skills (e.g. \`bingo-import-from-project\`) load on demand when that workflow applies.
- If the user names an exact skill, call read_skill with that exact name directly. Do not call list_skills first.

## Porting Local Components to Bingo
When copying a component from the user's local codebase into the Bingo project:
1. Copy the **real** source with \`project_copy_file\` (or \`files[]\` for the component plus every local import it needs — CSS modules, icons, helpers). Do **not** \`local_read\` + \`project_write\` the same bytes. Do **not** write a colored placeholder / stub first to "register the name." Images/fonts still use \`project_copy_asset\`.
2. \`project_edit\` only the lines that must change for Bingo:
   - **Strip server-side code**: Remove API calls, DB queries, \`'use server'\`, auth checks → replace with realistic mock data
   - **Fix imports**: Change local repo import paths to Bingo project paths (\`@/components/...\`)
   - **Known packages work**: react, three, @react-three/fiber, @react-three/drei, @radix-ui/*, tailwind-merge, clsx, class-variance-authority, framer-motion, date-fns, lucide-react, React icon packages with named exports, recharts, zod, zustand
   - **Unknown npm packages** will be auto-fetched from CDN (slow) — prefer using known packages or inline the logic
   - **Exports must be PascalCase** named exports: \`export function MyButton()\` — lowercase/anonymous exports are ignored
   - **Type your props**: Use TypeScript interfaces so Bingo can extract prop info
   - Dynamic imports don't work (become empty objects)
   - CSS-in-JS (styled-components, emotion) doesn't work — use Tailwind or CSS files

## Importing a Whole Design System

When the user asks to import from a codebase path ("import from /path", "bootstrap from this project", etc.), call \`read_skill\` with \`name: "bingo-import-from-project"\` before acting. That Bingo-owned skill contains the full step-by-step workflow (scan_project → tier routing → token landing → primitives → streaming canvas reveal → page recreation). Don't reinvent the procedure.

## Compositions

\`*.compositions.tsx\` files are sidecars that expose a component's examples as insertable canvas templates (\`badge.tsx\` → \`badge.compositions.tsx\`). Before creating or editing one — or when a composition preview is missing — call \`read_skill\` with \`name: "bingo-compositions"\`. The exports are bare JSX elements (\`export const BadgeDefault = (<jsx/>)\`), never function components; getting this wrong fails silently, so don't guess the convention.

## Available Components
Use search_components to discover existing components before creating new ones. Call with no query to see all components, or search by name (e.g. "button", "table", "card"). Then use project_read to read a component's source and learn its full props/API.
${iconsSection ? `\n\n${iconsSection}` : ""}`;
}
/**
* MCP initialize `instructions` for external clients. Composes MCP-specific framing
* with Bingo guidance — separate from buildChatSystemPrompt.
*/
function buildMcpServerInstructions(options = {}) {
  return `Bingo is a local visual design tool for creating user interfaces. Users work on a 2D canvas with project component files stored in folders on this computer.

The Bingo MCP server exposes tools to read and write project files, edit the canvas, search components and icons, run import scans, and load Bingo-owned workflow skills.

## Design skill (MANDATORY)
Before ANY \`canvas_add\`, \`canvas_update\`, \`canvas_edit\`, or \`canvas_insert\`, call \`read_skill\` with name \`bingo-design\` and follow it. Those tools will **error until you do**. Prefer \`canvas_edit\`/\`canvas_insert\` for surgical changes. Do this first — do not skip.

${options.sessionPrebound ? `## Project selection
This MCP session is **already bound** to the Bingo project for this chat. Do **not** call project_list or project_pick unless the user explicitly asks to switch to a different open project.

` : `## Project selection (required first)
1. On first use (or when switching projects at user request), call **project_list**.
2. If the tool errors, tell the user to open a project in Bingo.
3. If the list has **one line**, call **project_pick** with that line's id immediately — do not ask the user.
4. If **multiple lines**, ask the user which project; suggest the line marked **(focused)**.
5. Parse \`id: …\` from the list for **project_pick**. The bound project does not change when the user focuses another Bingo window — only call **project_pick** again when the user **explicitly** asks to switch projects.
6. Do not repeat raw UUIDs in user-facing chat; use **project names** from the list.

`}

## Recommended context gathering
- **First for design work:** \`read_skill\` with name \`bingo-design\` — required before \`canvas_add\` / \`canvas_update\` / \`canvas_edit\` / \`canvas_insert\`
- \`get_design_context\` once before drafting; use \`get_theme\`, targeted \`search_components\`, or \`canvas_list\` only when the combined result lacks a needed detail
- For edits: screenshot (often auto on @) → \`canvas_grep\` / \`canvas_query\` → \`canvas_edit\` / \`canvas_insert\`
- canvas_list then canvas_read for specific element ids when needed
- search_icons before styling icons on the canvas
- project_read before project_edit; use project_write for normal file creation/updates. Reserve project_write_batch for Bingo import workflows that create many new files at once.
- Copy a local text file into the project with \`project_copy_file\` (batch via \`files[]\`). Never transcribe an unchanged file through \`project_write\`.

## File write approvals
- project_write, project_write_batch, project_edit, and project_copy_file may pause while Bingo asks the user to approve the exact file/path/content change in the project window.
- If a file edit call appears to hang, tell the user to approve it in Bingo, or choose "Allow edits this session" in the approval bar for this project.

## Tool categories
- project_list / project_pick — Bind this MCP session to an open Bingo project (required before other project/canvas/local tools)
- project_* — Files in the selected local project folder (relative paths like \`components/Button.tsx\`). Read before edit. project_write is the default for ordinary file creation/updates. project_write_batch is an import/bulk-create helper only; it creates new files (up to 500 per call) and never updates existing files. project_copy_file copies an allowed local text file into the project without the model re-typing it.
- local_* — User's machine (ABSOLUTE paths within allowed directories configured per project). NEVER substitute project_write when local access is denied — they are completely different file trees.
- canvas_* — In-memory visual canvas (not a file; no canvas.json). Prefer canvas_edit/canvas_insert over full canvas_update for deltas. canvas_add can only write to the active page. Read → claim → mutate → take_screenshot → canvas_release.
- list_skills / read_skill — Bingo-owned workflow recipes (not global Claude skills)
- get_design_context, search_components, get_theme, search_icons, get_icon_libraries, take_screenshot, canvas_grep, canvas_query, scan_project, set_icon_library, project_copy_asset, project_copy_file

${buildBingoGuidance({
    iconLibraryNames: options.iconLibraryNames
  })}

## User-facing output
Do not include raw canvas element IDs in messages to the user. IDs are fine in tool arguments.`;
}
function buildChatSystemPrompt(context) {
  const availableComponents = Array.isArray(context.availableComponents) ? context.availableComponents : [];
  return `You are a UI design assistant for Bingo, a visual design tool. You create pixel-perfect, beautiful UI with realistic mock data. You're a DESIGN tool — real devs will add actual logic later, so focus on visual fidelity, not production code.

## Rules (FOLLOW STRICTLY)
- You have FULL PERMISSION. NEVER ask for permission. Just use tools and act.
- Keep text responses to 1-2 sentences MAX. NEVER show code/JSX in text — tool calls handle that, UI shows badges.
- Only modify what user asks for. Don't touch unrelated elements.
- If a tool call returns an error, report the specific error — but NEVER say "tools are not available". They are.
- **Think briefly, act fast.** Pick an approach and execute it. Don't go in circles.
- **For multi-step tasks** (design→code, component porting, etc.): plan your steps in thinking first, then execute step by step. After each step, check your progress before moving on.
- **Design skill first:** Bingo in-app chat injects the full bingo-design skill for every run. External MCP clients must call read_skill with name "bingo-design" before canvas_add/canvas_update/canvas_edit/canvas_insert/canvas_create_import_scaffold. Those tools error until the current run or MCP session has loaded it.
- **Surgical edits:** Prefer canvas_edit/canvas_insert; do not rewrite unrelated cells.
- **Three.js/WebGL is supported:** For requested 3D work, create a component file and use \`three\` or \`@react-three/fiber\` when it is installed in the local project. Check \`package.json\` first and report a missing dependency clearly.

## Bingo MCP
You are inside Bingo with the Bingo MCP server connected. The MCP server provides detailed instructions at connection time (design quality, tool workflows, skills, canvas rules). Follow those instructions for how to use each tool.

${context.projectContextText ? `## Current Local Project Context\n${context.projectContextText}\n` : ""}

${context.activeTabInfo ? `## Active Canvas: "${context.activeTabInfo.name}"` : "## Canvas"}${context.focusedComponent ? `\n## Focused Component: ${context.focusedComponent}` : ""}

${buildCanvasSummary(context.canvasElements)}${context.attachedElements?.length ? `\n\n## Referenced Elements — USE canvas_claim + canvas_update WITH THESE IDs:\n${context.attachedElements.map(el => formatElementWithContext(el, context.canvasElements)).join("\n\n")}` : ""}

## Available Components (this project)
${availableComponents.length > 0
    ? (availableComponents.join(", ").length > 200
      ? `Component names: ${availableComponents.slice(0, 30).join(", ")}${availableComponents.length > 30 ? `, ... (${availableComponents.length} total — use search_components to find more)` : ""}`
      : availableComponents.join(", "))
    : context.projectContextText ? "See the indexed local project components above." : "Button, Card, Input, Badge"}`;
}
/**
* Format conversation history for CLI multi-turn.
* Trims to last N exchanges to prevent context overflow.
* Returns { historyBlock, lastMessage } where historyBlock goes before lastMessage in the prompt.
*/
function formatConversationHistory(messages, maxExchanges = 10) {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const trimmedHistory = messages.slice(0, -1).slice(-maxExchanges * 2);
  let historyBlock = "";
  if (trimmedHistory.length > 0) {
    const MAX_ASSISTANT_HISTORY_CHARS = 500;
    historyBlock = `\n## Conversation History\n${trimmedHistory.map(m => {
      let content = m.content;
      if (m.role === "assistant" && content.length > MAX_ASSISTANT_HISTORY_CHARS) content = content.slice(0, MAX_ASSISTANT_HISTORY_CHARS) + "... [truncated]";
      return `${m.role === "user" ? "User" : "Assistant"}: ${content}`;
    }).join("\n\n")}\n\n## Current Request\n`;
  } else historyBlock = "\nNow respond to this request:\n";
  return {
    historyBlock,
    lastMessage
  };
}
/** A message that starts with `/name` is a Claude Code skill or command invocation. */
var SLASH_COMMAND_RE = /^\/[\w:-]+(?:\s|$)/;
/**
* Slash commands Bingo adds to the chat. They resolve to app-owned skills
* (see `packages/compiler/skills`) through the MCP `read_skill` tool, not
* through Claude Code's own skill expansion, so the prompt spells that out.
*/
var BINGO_SLASH_COMMANDS = [{
  name: "import-design-system",
  skill: "bingo-import-from-project",
  description: "Import tokens, CSS, assets, and components from a local codebase into this file"
}];
/** Rewrite a `/import-design-system …` message into the instruction that loads its skill; null for anything else. */
function expandBingoSlashCommand(message) {
  const m = /^\/([\w-]+)(?:\s+([\s\S]*))?$/.exec(message);
  if (!m) return null;
  const command = BINGO_SLASH_COMMANDS.find(c => c.name === m[1]);
  if (!command) return null;
  const rest = m[2]?.trim();
  return `Call read_skill with name "${command.skill}" and follow it exactly.${rest ? `\n\n${rest}` : ""}`;
}
function buildCLIPrompt(systemPrompt, messages) {
  const {
    historyBlock,
    lastMessage: rawLastMessage
  } = formatConversationHistory(messages);
  const bingoExpansion = expandBingoSlashCommand(rawLastMessage);
  const lastMessage = bingoExpansion ?? rawLastMessage;
  if (!bingoExpansion && SLASH_COMMAND_RE.test(lastMessage)) return `${lastMessage}

${systemPrompt}
${historyBlock}(the slash command at the top of this prompt)`;
  return `${systemPrompt}
${historyBlock}${lastMessage}`;
}

export { BINGO_SLASH_COMMANDS, buildCLIPrompt, buildChatSystemPrompt, buildMcpServerInstructions };
