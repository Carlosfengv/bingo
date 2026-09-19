import * as React from "react";
import { createPortal } from "react-dom";

/** A real viewport: CSS breakpoints and viewport units follow the preview size. */
export function ResponsivePreview({ children, title, onKeyDown }) {
  const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
  const [body, setBody] = React.useState<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const doc = frame?.contentDocument;
    if (!doc) return;
    const source = frame.ownerDocument;
    const sync = () => {
      doc.head.querySelectorAll("[data-preview-style]").forEach(node => node.remove());
      source.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-preview-style", "");
        doc.head.appendChild(clone);
      });
      doc.documentElement.className = source.documentElement.className;
      doc.documentElement.style.cssText = source.documentElement.style.cssText;
      doc.body.className = source.body.className;
      doc.body.style.cssText = "margin:0;width:100%;min-height:100vh;overflow:auto";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(source.head, { childList: true, subtree: true, characterData: true, attributes: true });
    observer.observe(source.documentElement, { attributes: true });
    setBody(doc.body);
    return () => observer.disconnect();
  }, [frame]);
  return <iframe ref={setFrame} title={title} data-responsive-preview="" style={{ display: "block", width: "100%", height: "100%", border: 0, background: "white" }}>
    {body && createPortal(<div data-canvas-content="" onKeyDown={onKeyDown} style={{ width: "100%", minHeight: "100vh" }}>{children}</div>, body)}
  </iframe>;
}
