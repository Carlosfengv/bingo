---
name: bingo-compositions
description: How to author Bingo composition files — the `*.compositions.tsx` sidecars that expose a component's ready-made examples as drag-and-drop canvas templates in the Assets panel. Read this before creating or editing any `*.compositions.tsx` file, when adding a new component that needs canvas templates, when a composition preview is missing or blank, or whenever the user says "add compositions for X", "make X insertable", "add a variant/example for X", or asks why a component has no templates.
allowed-tools:
  - mcp__bingo__project_read
  - mcp__bingo__project_write
  - mcp__bingo__project_edit
  - mcp__bingo__project_glob
  - mcp__bingo__project_grep
  - mcp__bingo__search_components
  - mcp__bingo__search_icons
  - mcp__bingo__take_screenshot
  - mcp__bingo__get_theme
  - mcp__bingo__canvas_read
---

# Authoring Bingo compositions

A **composition file** is a sidecar that sits next to a component file and exposes ready-made examples of that component as **insertable canvas templates**. It is how a component in code becomes something a designer can drag onto the canvas.

```
components/ui/badge.tsx              ← the component (the API)
components/ui/badge.compositions.tsx ← its compositions (curated examples of that API)
```

The component defines what is *possible*. The composition file curates what is *offered*. Think of the shadcn docs demos — that is exactly the role compositions play, except they are first-class canvas content instead of documentation.

## Write into the project, not the local disk

Compositions are read from the Bingo **project** — the Assets panel derives and parses the sidecar from the project's files. Author them there with `project_write` / `project_edit`, at the sidecar path beside the paired component (`components/ui/badge.tsx` → `components/ui/badge.compositions.tsx`).

A `.compositions.tsx` written only to the local codebase with `local_write` / `local_edit` will **not** appear as a template — the project never sees it. Local file access exists for cloud↔local sync, which is a separate, deliberate step; it is not where compositions live. When in doubt, the composition goes in the project.

## The one rule that matters

**A composition export is a bare JSX element, not a component.**

```tsx
// ✅ CORRECT — the export IS the markup
export const BadgeDefault = (
  <div className="flex flex-wrap gap-2">
    <Badge>Badge</Badge>
    <Badge variant="secondary">Secondary</Badge>
  </div>
);

// ❌ WRONG — a function component. Silently ignored, no preview appears.
export const BadgeDefault = () => <Badge>Badge</Badge>;

// ❌ WRONG — function declaration. Silently ignored.
export function BadgeDefault() { return <Badge>Badge</Badge>; }
```

`= (<jsx/>)`, never `= () => <jsx/>`. The parser reads the JSX **statically** — it never executes the file. A snippet that must run to produce markup cannot be turned into canvas elements, so anything function-shaped is skipped without an error. This is the single most common authoring mistake, and it fails **silently**: the export simply never shows up in the Assets panel.

## What the parser accepts

An export becomes a template only if **all** of these hold:

| Requirement | Detail |
|---|---|
| Filename | matches `*.compositions.tsx` (also `.ts`/`.jsx`/`.js`) |
| Export form | `export const Name = <jsx/>` — or `export { Name }` where `Name` is a JSX const in the same file |
| Name | starts with an **uppercase** letter |
| Value | a JSX element or fragment, nothing else |

Parentheses and `as` / `satisfies` wrappers are unwrapped for you, so `export const X = (<div/> as any)` is fine. A default export is never a template. If the file has a **syntax error, every export in it disappears at once** — a whole component's templates vanishing usually means a typo, not a missing export.

## Imports are the parse context — this is load-bearing

To turn `<Badge variant="secondary">` into canvas elements, the parser has to know what `Badge` resolves to. It learns that **from the file's own import statements**, not from a project index:

- Capitalized imports from an icon library (`lucide-react`, `@phosphor-icons/react`, `@heroicons/react`, `@tabler/icons-react`, `react-icons/*`, `@mui/icons-material`) → registered as icons.
- Every other capitalized import → registered as a component.

Two consequences you must respect:

1. **Import everything you reference, explicitly.** An unimported or lowercase-named symbol will not resolve. There is no ambient scope. Use the real source export; do not invent a familiar component name.
2. **Keep the file self-describing.** These imports are what let a composition file be parsed standalone, with no editor session — which is exactly how the bulk canvas generator works. Don't rely on anything outside the file.

Use the same import style the paired component uses — `@/components/ui/...` for components, the project's established icon library for icons.

## Naming — the export name is the UI label

Export names are split on camelCase to produce the label shown to the user:

| Export | Panel label |
|---|---|
| `BadgeDefault` | Badge Default |
| `BadgeWithIconLeft` | Badge With Icon Left |
| `BadgeAsLink` | Badge As Link |

Convention is `<Component><Variant>`. This means **naming is a design decision, not a code detail** — `BadgeWithIconLeft` reads well in the panel; `Badge2` or `badgeTest` does not (and the lowercase one won't parse at all). Lead each file with a `<Component>Default` export showing the plain, canonical usage.

## Authoring workflow

```
- [ ] 1. project_read the component file — learn its real props, variants, and compound children
- [ ] 2. project_read the existing *.compositions.tsx if there is one — match its imports and style
- [ ] 3. search_icons before referencing any icon; search_components before assuming a component exists
- [ ] 4. Write exports into the project with `project_write` / `project_edit` (never `local_write`): static JSX only, uppercase names, everything imported
- [ ] 5. Verify each new export appears in the Assets panel under the paired component. When inserting a sample as part of the task, read back its canvas JSX: referenced components, props and compound children must survive as component nodes. Do not create a verification page unrelated to the request.
```

Cover the component's **real** surface: each meaningful variant, the states that matter (disabled, loading), and the common compositions (with icon, as link, inside a group). Prefer several focused exports over one kitchen-sink export — each export is a separate thing the user can drag, so a single export containing every variant is one unusable blob.

Compositions must reflect props the component **actually has**. If `variant="ghost"` isn't in the component source, a composition using it is a broken template, not a feature request.

## Compositions are canonical usage examples

Later design tasks can use these files to learn the real API. Include focused examples
of common variants and required compound structure/provider setup. Start from source
usage, preserving names and supported props; do not recreate an available component's
appearance with div/span markup. Native wrappers may supply layout and ordinary text.

The static-JSX restriction applies to the example expression, not to a component's
internal implementation. Keep real component references; never flatten them to HTML to
make an example static. If a runtime dependency prevents a valid static example, record
the limitation rather than replacing the component with a lookalike.

Let component variants own appearance. For example layout, use project semantic tokens
and spacing/type scales. Read the theme/source usage when needed; preserve aliases and
theme scopes, and do not copy current token values into literals. Check both className
and inline style for appearance overrides. Source-supported customization and exact
preview geometry are allowed when their reason is clear.

Acceptance has two parts: the parser recognizes each export with real imports, and its
JSX uses the supported component API and style bindings. A matching preview alone does
not establish either API correctness or token reuse.

## Hard constraints

- **No props, hooks, state, handlers, or conditional logic.** The snippet is never executed. `useState`, `onClick` bodies, ternaries on runtime values, and `.map()` over data all have no meaning here — write the expanded markup out literally.
- **Static data constants are allowed.** Top-level `const` values made only from strings, numbers, booleans, `null`, arrays, and plain objects are inlined into the exported JSX before canvas insertion. This is useful for chart datasets and configuration objects. A deterministic `new Date("2026-06-05T00:00:00Z")` or `new Date(1780617600000)` is also allowed and is stored as a serializable date string; `new Date()` is forbidden because it changes with time. Other calls such as `const data = getData()`, functions, and executable expressions are not evaluated and must not be referenced from a composition export.
- **Multiple roots are fine.** A fragment or several sibling elements are handled; each root lands on the canvas.
- **Wrap multi-element examples in a layout div.** `<div className="flex flex-wrap gap-2">` is the established pattern — without it, siblings land unarranged.
- **Never fake styling with hardcoded classes on children** to compensate for a component that looks wrong. Fix the component; the composition shows real usage.
- **Composition files are hidden from the file tree.** They appear only as previews beneath their paired component. That is intended — don't "fix" it.

## How compositions reach the canvas

Two consumers share one parser, so a composition behaves identically in both:

1. **Assets panel** — selecting `button.tsx` derives the sidecar path, parses it, and renders each export as a live preview you can drag or click to insert. Edits to a composition file refresh the previews on disk-change.
2. **Bulk canvas generator** — `packages/compiler/scripts/compositions-to-pages.mjs` turns every composition file in a directory into a canvas page, each export laid out horizontally. This is how a component library becomes a browsable design-system canvas with no manual placement.

Insertion deliberately reuses the **paste** path (`parseJSX → getRootIds → storeSubtreeToLegacyNested`). Dragging a composition and pasting JSX from the clipboard converge on the same code — which is why a composition can never be a special second-class element type. Anything valid as pasted JSX is valid as a composition.

## Debugging a missing preview

Work down this list — the causes are ordered by how often they're the answer:

1. **Export is a function** (`() => <jsx/>`) → make it a bare element.
2. **Filename is wrong** — `badge.composition.tsx` (singular) doesn't match; it must be `.compositions.`.
3. **Name is lowercase** → must start uppercase.
4. **Syntax error** → *all* exports in the file vanish together. That signature points here.
5. **Missing import** → the symbol never resolves.
6. **Wrong sidecar path** — the file must sit beside its component with the exact base name: `badge.tsx` → `badge.compositions.tsx`.
