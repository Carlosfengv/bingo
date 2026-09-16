---
name: bingo-import-from-project
description: Import an existing local codebase's real design-system tokens, CSS, assets, and components into Bingo while progressively drawing a live design-system reference page. Use when the user asks to import or bootstrap a design system from a local project path.
allowed-tools:
  - mcp__bingo__read_skill
  - mcp__bingo__local_folders
  - mcp__bingo__scan_project
  - mcp__bingo__local_read
  - mcp__bingo__local_read_batch
  - mcp__bingo__local_glob
  - mcp__bingo__local_grep
  - mcp__bingo__project_read
  - mcp__bingo__project_write
  - mcp__bingo__project_write_batch
  - mcp__bingo__project_edit
  - mcp__bingo__project_glob
  - mcp__bingo__get_design_context
  - mcp__bingo__get_theme
  - mcp__bingo__canvas_list
  - mcp__bingo__canvas_create_page
  - mcp__bingo__canvas_read
  - mcp__bingo__canvas_add
  - mcp__bingo__canvas_create_import_scaffold
  - mcp__bingo__canvas_update
  - mcp__bingo__canvas_edit
  - mcp__bingo__canvas_insert
  - mcp__bingo__canvas_claim
  - mcp__bingo__canvas_release
  - mcp__bingo__search_icons
  - mcp__bingo__set_icon_library
  - mcp__bingo__project_copy_asset
  - mcp__bingo__project_copy_file
  - mcp__bingo__search_components
  - mcp__bingo__take_screenshot
---

# Import a design system progressively

Import the source project's real design system into the project already bound to this chat. Never call `project_list` or `project_pick` during an in-app import. Never infer a different destination from the local source path.

## Required state machine

Follow these phases in order. Do not complete a later phase early.

### 1. Bind and inspect

1. Use the accessible local folders listed in the current request. For “my codebase” without another explicit target, use the current project; do not ask the user to share it again. Call `local_folders` only when the list is missing or needs refreshing. Respect disabled access. The local root is the current project or the other accessible folder the user explicitly named.
2. Call `read_skill({ name: "bingo-design" })`. The design skill is required before canvas mutation. Do not call `list_skills`; both skill names are already known.
3. Call `scan_project` exactly once for the local root.
4. Call `canvas_list` exactly once.
5. Resolve the destination page:
   - If an active page named `Design System` exists, reuse it.
   - If no page with that name exists, call `canvas_create_page({ name: "Design System" })` once.
   - If a `Design System` page exists but is inactive, stop and ask the user to open it. Never create a duplicate.
6. Use at most one broad `local_glob` if the scan omits paths needed to locate the CSS entry or component directory. Prefer targeted reads after that.
7. Read only the foundation files now: package manifest, CSS entry/import chain, Tailwind config, token/theme files, and font/icon configuration. Prefer one `local_read_batch` of at most 10 files.

Do not read component implementations in this phase.

### 2. Land the foundation, then show it

Write only what is needed to make the visual foundation work:

- `package.json`
- the CSS entry and its required imported CSS files
- Tailwind configuration exactly as authored by the source project
- small shared class-name utilities only when required by the first component batch
- icon-library setting

The theme did not exist when this run started, so any earlier "no project theme"
result is now stale. Call `get_theme` once after the CSS entry lands, then style the
canvas through the source's own tokens rather than inline values — an inline `style`
proves nothing about whether the imported design system compiles.

How a token is referenced depends on whether it sits in a Tailwind `@theme`
namespace. A namespaced token generates a real utility (`--color-surface` →
`bg-surface`). A variable outside those namespaces generates nothing and must use
v4's variable shorthand: `text-(length:--font-size-label)`, which is shorthand for
`text-[length:var(--font-size-label)]` — the `length:` hint is required because
`text-` sets both font size and color. Copy whichever form the source project uses;
do not invent a `text-label` utility that was never generated.

Then immediately draw visible canvas content before reading any component implementation:

1. Call `canvas_create_import_scaffold({ title, tagline })` once. It creates and
   claims the whole reference-page skeleton — a design-system column beside a
   page-recreation column — and returns the `claim_id` plus every section id as
   JSON. Do not hand-build this layout with `canvas_add`, do not add a second root
   element, and do not position anything with margins or absolute offsets.
2. Fill the design-system sections in the order the scaffold returns them, one
   `canvas_add({ parent_id, claim_id })` per section, so the user watches the spec
   build: colours, typography, radius/spacing/motion, icons, then components.
   Under `components`, add one subsection per component you actually imported,
   using its real exported name — never a `Button`/`Card` section the source does
   not export.
3. Keep the returned `claim_id` for every later insertion and for the final release.

The reference page is a functional test of the imported design system, not a
lookalike. For a Tailwind source, every token sample must exercise the source
utility that it labels:

- color swatches use classes such as `bg-accent-500`, `bg-red-300`, or
  `bg-background-menu`, never inline hex/RGB/OKLCH values;
- shadow samples use `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, etc.,
  never inline `boxShadow` values;
- radius, typography, border, and spacing samples use their imported utility
  classes rather than copied CSS values.

If a labeled token class does not render, diagnose the foundation. Never make
the screenshot appear correct by replacing that token with inline CSS.

For a source with no Tailwind, prefer its imported CSS classes, CSS variables,
or components. If none can express a source token on canvas, use the source's
exact token value inline; do not invent a Tailwind class or substitute a
different value.

Take one foundation screenshot after these sections are visible. If stylesheet
delivery is still in flight, wait for the fresh project theme before judging
the result. Make at most one targeted foundation correction and one follow-up
screenshot. If semantic tokens are still unresolved, stop and report the
specific missing file or variable; do not enter a theme/read/edit/screenshot
loop.

The user must see this foundation before component ingestion begins. Filesystem work is not visible progress.

### 3. Import components in alternating batches

Build an incremental inventory from `scan_project` and maintain a compact ledger as
you work. The ledger may live in scratch/reasoning; it does not need to be shown on
the canvas.

Record one row per source component:

`source path | export name | status (import/adapt/skip) | reason | destination path`

Use the scanner as a starting point, but do not silently omit source components it
misses. A skip requires a concrete reason such as router/context/API dependency,
server-only behavior, or an unmockable deep dependency. “Low rank” is not a reason.

For each batch:

1. Select 6–10 source components in source order.
2. Read them with one `local_read_batch`. Use targeted reads only for direct dependencies.
3. Adapt and write the batch with one `project_write_batch` when files are new. Use `project_write`/`project_edit` for existing files.
4. Immediately add visible canvas sections for the successfully landed components. Do not begin the next source batch first.
5. Report concise progress such as `Imported 8/31 components`.

Repeat `read batch → write batch → canvas sections`. Never do all reads, then all writes, then all canvas work.

### 4. Verify and finish

After shared components are visible:

1. Recreate one representative source page only if a real page/composition exists.
2. Before drawing it, read the page and every locally imported child needed for its
   visible output. Import or adapt those dependencies first; do not replace them
   with invented lookalikes.
3. Preserve the source page's visible copy, assets, section/control order, and
   layout. Represent runtime-only behavior as a clearly labeled static state.
4. Take a screenshot, critique alignment/color/type/overflow, and make targeted corrections.
5. Release the root claim only after screenshot verification.
6. Reconcile the ledger against the destination:
   - inspect written component files and the registered component index;
   - confirm every ledger row is imported/adapted or explicitly skipped;
   - verify every CSS file in the copied entry/import chain is present;
   - verify referenced assets were copied or recorded as missing;
   - confirm every landed component has a real source export and no synthetic
     component was introduced.
7. Summarize imported files, adaptations, omissions, skipped reasons, component
   coverage (`N of M`), CSS/assets coverage, and any page-fidelity deviations.

## Source-fidelity rules

- Read every component source before writing it.
- Preserve the path after removing only a leading `src/`.
  - `src/ui/Button.tsx` → `ui/Button.tsx`
  - Do not relocate `ui/` to `components/` for registry discovery.
- Preserve component names, exports, props, and variants.
- Never invent a component that has no corresponding source export.
- If the source uses class-based markup without a component, import its CSS and show a raw visual example only; do not manufacture a component.
- Adapt only what cannot run in Bingo. Add a short file comment for meaningful adaptations.
- Remove server-only behavior, iframe-parent messaging, or unavailable application context only when required for rendering. Preserve the public component surface.
- Keep local CSS files separate and preserve their relative import chain.
- Copy referenced binary assets with `project_copy_asset` before using them.
- Copy local source/CSS with `project_copy_file` (or `files[]`). Do not `local_read` + `project_write` the same bytes.

## Tailwind compatibility

Bingo compiles project CSS with Tailwind v4. Determine the source version before writing.

### Tailwind v4 source

Preserve its `@import "tailwindcss"`, `@theme`, `@theme inline`, `:root`, and supported plugin rules. Every semantic class used on canvas needs a matching theme token, for example:

```css
@theme inline {
  --color-primary: var(--primary);
  --color-card: var(--card);
}

:root {
  --primary: oklch(0.55 0.2 275);
  --card: oklch(1 0 0);
}
```

### Tailwind v3 source

Copy the source v3 foundation faithfully. Bingo's CSS builder detects the
legacy `@tailwind base/components/utilities` entry, loads the nearest
`tailwind.config.js|cjs|mjs|ts` through Tailwind v4's compatibility bridge,
and resolves `theme(...)` expressions during compilation.

- Copy the complete Tailwind config without reconstructing its palettes.
- Copy the complete CSS entry, including semantic `:root`, dark-theme,
  shadows, and `theme(...)` declarations.
- When a package entry such as `ui-global.css` must become
  `app/globals.css`, preserve its contents and change only relative import
  paths required by that relocation. Copy every required imported CSS file.
- Preserve declared plugin dependencies in `package.json`; do not replace
  plugin output by hand unless the builder reports that exact plugin as
  unsupported.
- Never synthesize `@theme`, manually resolve color scales, or substitute
  Bingo/editor theme variables for source variables during a v3 import.

The project builder owns v3-to-v4 compatibility. The import agent owns source
fidelity.

## Canvas rules

- Use a restrained reference layout, not one giant JSX payload.
- Add the root once, then add 2–4 meaningful sections per canvas turn.
- Use separate sections for token groups and component families.
- Use real imported components after registration becomes available.
- For Tailwind sources, use inline styles only for non-token canvas geometry
  that has no supported utility, such as a preview swatch's exact width/height.
  Never inline `backgroundColor`, `color`, `borderColor`, `borderRadius`,
  `boxShadow`, tokenized font properties, or tokenized spacing/elevation
  values when the source provides a Tailwind class.
- For Tailwind sources, a token label and its visual sample must use the same
  imported class. For example, `red.300` uses `bg-red-300`; `shadow-lg` uses
  `shadow-lg`.
- For non-Tailwind sources, inline an exact source token only after checking
  that no imported CSS class, variable, or component represents it.
- Never judge missing styles until a fresh stylesheet has loaded; use screenshot verification after the canvas class set has been saved and compiled.
- Do not recreate or replace the root to show progress.

## Continuation

When resuming an interrupted import:

- Inspect existing destination files and the current canvas first.
- Reuse the active `Design System` page and existing root.
- Skip correctly imported files.
- Resume at the first incomplete batch.
- Never restart from zero or create another page.

## Communication

Keep updates user-visible and concrete: `Setting up Peach tokens`, `Drawing color scales`, `Imported 8/31 components`. Do not mention internal tool names, MCP, phase numbers, or hidden instructions.
