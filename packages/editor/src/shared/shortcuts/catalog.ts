/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/shortcuts/catalog.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var GLOBAL_SHORTCUTS = {
  present: {
    id: "present",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      alt: true,
      code: "Enter"
    }],
    keyLabel: "⌘⌥⏎",
    label: "Present",
    description: "Open the full-screen prototype player in a new tab"
  },
  togglePreviewWindow: {
    id: "togglePreviewWindow",
    scope: "global",
    keys: [{
      shift: true,
      code: "Space"
    }],
    keyLabel: "⇧Space",
    label: "Preview",
    description: "Toggle the in-place floating preview window"
  },
  closePreviewWindow: {
    id: "closePreviewWindow",
    scope: "global",
    keys: [{
      key: "Escape"
    }],
    keyLabel: "Esc",
    label: "Close preview",
    description: "Close the floating preview window"
  },
  toggleCommentMode: {
    id: "toggleCommentMode",
    scope: "global",
    keys: [{
      key: "c",
      cmdOrCtrl: false,
      alt: false
    }],
    keyLabel: "C",
    label: "Comment mode",
    description: "Toggle comment placement mode"
  },
  exitCommentMode: {
    id: "exitCommentMode",
    scope: "global",
    keys: [{
      key: "Escape"
    }],
    keyLabel: "Esc",
    label: "Exit comment mode",
    description: "Exit comment placement mode"
  },
  copySelectionLink: {
    id: "copySelectionLink",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      shift: true,
      key: "l"
    }],
    keyLabel: "⇧⌘L",
    label: "Copy link to selection",
    description: "Copy a shareable link to the selected element"
  },
  openComponentFile: {
    id: "openComponentFile",
    scope: "global",
    keys: [{
      ctrl: true,
      alt: true,
      meta: true,
      code: "KeyK"
    }],
    keyLabel: "⌃⌥⌘K",
    label: "Open component file",
    description: "Open the component source file in the BottomBar Source panel"
  },
  openInsertPanel: {
    id: "openInsertPanel",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      alt: false,
      code: "KeyK"
    }],
    keyLabel: "⌘K",
    label: "Insert",
    description: "Open Insert (or Assets search in the v2 sidebar)"
  },
  copySelectionAsJsx: {
    id: "copySelectionAsJsx",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      shift: true,
      key: "c"
    }],
    keyLabel: "⇧⌘C",
    label: "Copy as JSX",
    description: "Copy the selected element as JSX, or the open source file when that tab is active — wins over native copy even while an embedded editor has focus"
  },
  focusLayersSearch: {
    id: "focusLayersSearch",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      alt: false,
      shift: false,
      code: "KeyF"
    }],
    keyLabel: "⌘F",
    label: "Search layers",
    description: "Open Pages layer search (⌘F). Skipped while the code editor has focus so find-in-file still works"
  },
  toggleBottomBar: {
    id: "toggleBottomBar",
    scope: "global",
    keys: [{
      cmdOrCtrl: true,
      alt: false,
      shift: false,
      code: "KeyJ"
    }],
    keyLabel: "⌘J",
    label: "Toggle bottom bar",
    description: "Show or hide the bottom code panel (JSX/source)"
  }
};
var LOCAL_SHORTCUTS = {
  canvas: {
    cancelDraw: {
      id: "canvas.cancelDraw",
      scope: "local",
      keys: [{
        key: "Escape"
      }],
      keyLabel: "Esc",
      label: "Cancel draw",
      description: "Cancel the in-progress draw gesture"
    },
    cancelMarquee: {
      id: "canvas.cancelMarquee",
      scope: "local",
      keys: [{
        key: "Escape"
      }],
      keyLabel: "Esc",
      label: "Cancel marquee select",
      description: "Cancel the in-progress marquee selection"
    },
    toolMove: {
      id: "canvas.toolMove",
      scope: "local",
      keys: [{
        key: "v",
        shift: false
      }],
      keyLabel: "V",
      label: "Move tool",
      description: "Switch to the Move tool"
    },
    toolScale: {
      id: "canvas.toolScale",
      scope: "local",
      keys: [{
        key: "k",
        shift: false,
        cmdOrCtrl: false,
        alt: false
      }],
      keyLabel: "K",
      label: "Scale tool",
      description: "Scale the selection and reveal the Scale inspector"
    },
    toolPan: {
      id: "canvas.toolPan",
      scope: "local",
      keys: [{
        key: "h",
        shift: false
      }],
      keyLabel: "H",
      label: "Pan tool",
      description: "Switch to the Pan tool"
    },
    toolFrame: {
      id: "canvas.toolFrame",
      scope: "local",
      keys: [{
        key: "f",
        shift: false
      }],
      keyLabel: "F",
      label: "Frame tool",
      description: "Switch to the Frame tool"
    },
    toolToggleStack: {
      id: "canvas.toolToggleStack",
      scope: "local",
      keys: [{
        key: "s",
        shift: false
      }],
      keyLabel: "S",
      label: "Stack tool",
      description: "Switch to (or flip the axis of) the Stack tool"
    },
    toolText: {
      id: "canvas.toolText",
      scope: "local",
      keys: [{
        key: "t",
        shift: false
      }],
      keyLabel: "T",
      label: "Text tool",
      description: "Switch to the Text tool"
    },
    toolGrid: {
      id: "canvas.toolGrid",
      scope: "local",
      keys: [{
        key: "g",
        shift: true
      }],
      keyLabel: "⇧G",
      label: "Grid tool",
      description: "Switch to the Grid tool"
    },
    toolImage: {
      id: "canvas.toolImage",
      scope: "local",
      keys: [{
        key: "i",
        shift: true
      }],
      keyLabel: "⇧I",
      label: "Image tool",
      description: "Switch to the Image tool"
    },
    toolVideo: {
      id: "canvas.toolVideo",
      scope: "local",
      keys: [{
        key: "v",
        shift: true
      }],
      keyLabel: "⇧V",
      label: "Video tool",
      description: "Switch to the Video tool"
    },
    toolEscapeToMove: {
      id: "canvas.toolEscapeToMove",
      scope: "local",
      keys: [{
        key: "Escape",
        shift: false
      }],
      keyLabel: "Esc",
      label: "Exit tool",
      description: "Return to the Move tool from an insert tool, Scale, or Pan"
    },
    zoomIn: {
      id: "canvas.zoomIn",
      scope: "local",
      keys: [{
        key: "=",
        alt: false
      }, {
        key: "+",
        alt: false
      }],
      keyLabel: "⌘+",
      label: "Zoom in",
      description: "Zoom the canvas in toward the pointer"
    },
    zoomOut: {
      id: "canvas.zoomOut",
      scope: "local",
      keys: [{
        key: "-",
        alt: false
      }, {
        key: "_",
        alt: false
      }],
      keyLabel: "⌘−",
      label: "Zoom out",
      description: "Zoom the canvas out from the pointer"
    },
    zoomFit: {
      id: "canvas.zoomFit",
      scope: "local",
      keys: [{
        shift: false,
        cmdOrCtrl: true,
        alt: false,
        key: "1"
      }],
      keyLabel: "⌘1",
      label: "Zoom to fit",
      description: "Fit all canvas elements in the viewport"
    },
    zoomSelection: {
      id: "canvas.zoomSelection",
      scope: "local",
      keys: [{
        shift: false,
        cmdOrCtrl: true,
        alt: false,
        key: "2"
      }],
      keyLabel: "⌘2",
      label: "Zoom to selection",
      description: "Fit the selected elements in the viewport"
    },
    zoomActual: {
      id: "canvas.zoomActual",
      scope: "local",
      keys: [{
        key: "0",
        shift: false,
        cmdOrCtrl: true,
        alt: false
      }, {
        shift: true,
        cmdOrCtrl: false,
        alt: false,
        code: "Digit0"
      }],
      keyLabel: "⌘0",
      label: "Zoom to 100%",
      description: "Reset the canvas zoom to actual size"
    }
  },
  comments: {
    cancelComposer: {
      id: "comments.cancelComposer",
      scope: "local",
      keys: [{
        key: "Escape"
      }],
      keyLabel: "Esc",
      label: "Cancel comment",
      description: "Cancel the open comment composer"
    },
    closeThread: {
      id: "comments.closeThread",
      scope: "local",
      keys: [{
        key: "Escape"
      }],
      keyLabel: "Esc",
      label: "Close comment thread",
      description: "Close the open comment thread"
    }
  },
  prototypePlayer: {
    next: {
      id: "prototypePlayer.next",
      scope: "local",
      keys: [{
        key: "ArrowRight"
      }, {
        key: "ArrowDown"
      }],
      keyLabel: "→ / ↓",
      label: "Next frame",
      description: "Show the next root frame (full-screen present)"
    },
    prev: {
      id: "prototypePlayer.prev",
      scope: "local",
      keys: [{
        key: "ArrowLeft"
      }, {
        key: "ArrowUp"
      }],
      keyLabel: "← / ↑",
      label: "Previous frame",
      description: "Show the previous root frame (full-screen present)"
    },
    zoomIn: {
      id: "prototypePlayer.zoomIn",
      scope: "local",
      keys: [{
        cmdOrCtrl: true,
        key: "="
      }, {
        cmdOrCtrl: true,
        key: "+"
      }],
      keyLabel: "⌘+",
      label: "Zoom in",
      description: "Zoom into the frame (full-screen present)"
    },
    zoomOut: {
      id: "prototypePlayer.zoomOut",
      scope: "local",
      keys: [{
        cmdOrCtrl: true,
        key: "-"
      }],
      keyLabel: "⌘−",
      label: "Zoom out",
      description: "Zoom out of the frame (full-screen present)"
    },
    zoomFitWidth: {
      id: "prototypePlayer.zoomFitWidth",
      scope: "local",
      keys: [{
        cmdOrCtrl: true,
        shift: false,
        alt: false,
        key: "0"
      }],
      keyLabel: "⌘0",
      label: "Zoom to fit width",
      description: "Reset zoom to fit the frame width (full-screen present)"
    },
    zoomActual: {
      id: "prototypePlayer.zoomActual",
      scope: "local",
      keys: [{
        shift: true,
        cmdOrCtrl: false,
        alt: false,
        code: "Digit0"
      }],
      keyLabel: "⇧0",
      label: "Zoom to 100%",
      description: "Reset zoom to actual size (full-screen present)"
    }
  },
  previewWindow: {
    next: {
      id: "previewWindow.next",
      scope: "local",
      keys: [{
        key: "ArrowRight"
      }],
      keyLabel: "→",
      label: "Next frame",
      description: "Show the next root frame (floating preview window)"
    },
    prev: {
      id: "previewWindow.prev",
      scope: "local",
      keys: [{
        key: "ArrowLeft"
      }],
      keyLabel: "←",
      label: "Previous frame",
      description: "Show the previous root frame (floating preview window)"
    }
  }
};

export { GLOBAL_SHORTCUTS, LOCAL_SHORTCUTS };
