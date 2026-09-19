import * as React from "react";
import ReactCodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";

type EditorProps = React.ComponentProps<typeof ReactCodeMirror> & {
  active: boolean;
  editorRef: React.Ref<ReactCodeMirrorRef>;
};

// Retain the EditorView (including its undo history and cursor) while hidden.
// Only the visible editor receives new documents or configuration.
const EditorView = React.memo(function RetainedEditorView({ active, editorRef, ...props }: EditorProps) {
  return active ? <ReactCodeMirror ref={editorRef} {...props} /> : null;
}, (previous, next) => !next.active || (
  Object.keys(previous).length === Object.keys(next).length
  && (Object.keys(next) as Array<keyof EditorProps>).every(key => Object.is(previous[key], next[key]))
));

export function RetainedCodeEditor({ active, editorRef, onChange, onBlur, onKeyDown, ...props }: EditorProps) {
  const internalRef = React.useRef<ReactCodeMirrorRef | null>(null);
  const attach = React.useCallback((value: ReactCodeMirrorRef | null) => {
    internalRef.current = value;
    if (typeof editorRef === "function") return editorRef(value);
    if (editorRef) editorRef.current = value;
  }, [editorRef]);
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
