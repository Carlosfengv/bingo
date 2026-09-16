import logoText from "../assets/logoText.png";
import * as React from "react";

export function ProjectLoadPanel({ children, ...sectionProps }) {
  return <div className="flex h-full w-full items-center justify-center overflow-auto bg-ed-muted p-4 sm:p-8">
    <section
      style={{ maxWidth: 576, flexShrink: 0, overflowWrap: "anywhere" }}
      className="my-auto flex w-full min-w-0 flex-col gap-5 rounded-3xl border border-ed-border bg-ed-background p-6 text-ed-foreground shadow-2xl/7"
      {...sectionProps}
    >
      <img src={logoText} alt="Bingo" className="h-7 w-auto self-start [.editor-dark_&]:invert" />
      {children}
    </section>
  </div>;
}
