import * as React from "react";
import ReactCodeMirror, { ExternalChange, type ReactCodeMirrorRef } from "@uiw/react-codemirror";

type EditorProps = React.ComponentProps<typeof ReactCodeMirror> & {
  active: boolean;
  editorRef: React.Ref<ReactCodeMirrorRef>;
  documentKey?: string;
};

// Retain the EditorView (including its undo history and cursor) while hidden.
// Only the visible editor receives new documents or configuration.
const EditorView = React.memo(function RetainedEditorView({ active, editorRef, ...props }: EditorProps) {
  return active ? <ReactCodeMirror ref={editorRef} {...props} /> : null;
}, (previous, next) => !next.active || (
  Object.keys(previous).length === Object.keys(next).length
  && (Object.keys(next) as Array<keyof EditorProps>).every(key => Object.is(previous[key], next[key]))
));

export function RetainedCodeEditor({ active, editorRef, documentKey, onChange, onBlur, onKeyDown, ...props }: EditorProps) {
  const internalRef = React.useRef<ReactCodeMirrorRef | null>(null);
  const visibleDocument = React.useRef(documentKey);
  const attach = React.useCallback((value: ReactCodeMirrorRef | null) => {
    internalRef.current = value;
    if (typeof editorRef === "function") return editorRef(value);
    if (editorRef) editorRef.current = value;
  }, [editorRef]);
  React.useLayoutEffect(() => {
    if (!active || visibleDocument.current === documentKey) return;
    visibleDocument.current = documentKey;
    const view = internalRef.current?.view;
    // A new selection/file must not keep the previous document visible during
    // the library's typing debounce: subsequent input belongs to the new key.
    if (view && props.value !== undefined && props.value !== view.state.doc.toString())
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.value },
        annotations: ExternalChange.of(true) });
  }, [active, documentKey, props.value]);
  const events = React.useRef({ active, onChange, onBlur, onKeyDown });
  React.useLayoutEffect(() => {
    events.current = { active, onChange, onBlur, onKeyDown };
  }, [active, onChange, onBlur, onKeyDown]);
  const handlers = React.useMemo(() => ({
    onChange: (...args: Parameters<NonNullable<EditorProps["onChange"]>>) => {
      if (events.current.active) events.current.onChange?.(...args);
    },
    onBlur: (...args: Parameters<NonNullable<EditorProps["onBlur"]>>) => {
      if (events.current.active) events.current.onBlur?.(...args);
    },
    onKeyDown: (...args: Parameters<NonNullable<EditorProps["onKeyDown"]>>) => {
      if (events.current.active) events.current.onKeyDown?.(...args);
    },
  }), []);
  return <EditorView {...props} {...handlers} active={active} editorRef={attach} />;
}
