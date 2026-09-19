# Dependency patches

## @radix-ui/react-scroll-area 1.2.10

Render the viewport's static stylesheet as a string child instead of a new
`dangerouslySetInnerHTML` object on every render. React otherwise rewrites the
same stylesheet during selection and variable-mode changes, invalidating styles
across editor scroll containers and their descendants.

The patch covers both CommonJS and ESM entry points. CSS, nonce, DOM placement,
scroll behavior, and the public API are unchanged. pnpm applies the versioned
patch during installation; do not edit installed dependencies by hand.

`tools/test-editor-stage-three.cjs` checks that repeated mode changes produce no
scroll-area stylesheet writes. The stage-one editor checks cover virtual layer
reveal, horizontal scrolling, rename widths, and selection after scrolling.
Re-evaluate this patch when upgrading Radix; remove it when upstream retains an
unchanged stylesheet across viewport renders.

## @uiw/react-codemirror 4.25.3

Cancel a queued external document update whenever the controlled value/view
changes or its effect is cleaned up. The upstream typing latch defers updates
for 200 ms; an old pending update could otherwise overwrite a newer value that
already matches the editor document (including returning to a dirty selection
draft). The editor instance, cursor and typing delay are retained. Both runtime
entry points and the packaged TypeScript source carry the same fix.

`tools/test-editor-stage-four.cjs` exercises rapid selection changes and dirty
draft restoration. Re-evaluate this patch when upgrading react-codemirror.
