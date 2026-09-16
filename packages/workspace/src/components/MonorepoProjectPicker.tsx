import {
  Button,
  CheckIcon,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FolderIcon,
  Input,
  SpinnerIcon,
  Text$4,
  WarningIcon$1,
  cn$2,
} from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

const pickerStyle = { width: 520, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)" };

function displayPath(value) {
  if (!value) return "";
  const parts = String(value).split(/[\\/]/).filter(Boolean);
  return parts.length > 3 ? `…/${parts.slice(-3).join("/")}` : value;
}

function frameworkLabel(framework, t) {
  const labels = { next: "Next.js", vite: "Vite", remix: "Remix", astro: "Astro", cra: "Create React App" };
  return labels[framework] || t("picker.reactProject");
}

function kindLabel(kind, t) {
  if (kind === "application") return t("picker.application");
  if (kind === "component-library") return t("picker.componentLibrary");
  return t("picker.project");
}

function progressCopy(progress, t) {
  if (progress?.stage === "checking-projects") {
    const total = progress.totalCandidateCount || 0;
    return {
      title: t("picker.checking"),
      detail: total > 0
        ? t("picker.checkedCount", { checked: progress.checkedCandidateCount || 0, total })
        : t("picker.inspectingFiles"),
    };
  }
  if (progress?.stage === "finding-projects") {
    return {
      title: t("picker.finding"),
      detail: t("picker.foundCount", {
        folders: progress.scannedDirectoryCount || 0,
        projects: progress.candidateCount || 0,
      }),
    };
  }
  return { title: t("picker.readingWorkspace"), detail: t("picker.lookingForPackages") };
}

function DiscoveryProgress({ selectedRoot, progress, registering, onCancel }) {
  const { t } = useTranslation("workspace");
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  React.useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const copy = registering ? {
    title: t("picker.opening"),
    detail: t("picker.preparing"),
  } : progressCopy(progress, t);
  return <>
    <DialogHeader className="flex flex-col gap-1 px-6 pt-6 text-left">
      <DialogTitle className="p-0 text-base font-semibold text-ed-foreground">{copy.title}</DialogTitle>
      <Text$4 size="2xs" variant="tertiary" className="truncate" title={selectedRoot}>{displayPath(selectedRoot)}</Text$4>
    </DialogHeader>
    <div className="flex items-center gap-3 px-6 py-8" role="status" aria-live="polite">
      <SpinnerIcon width={18} height={18} className="shrink-0 animate-spin text-ed-muted-foreground" />
      <Text$4 size="sm" variant="secondary">{t("picker.elapsed", { detail: copy.detail, seconds: elapsedSeconds })}</Text$4>
    </div>
    <DialogFooter className="border-t border-ed-border px-6 py-4">
      <Button type="button" variant="secondary" size="sm" onClick={onCancel}>{t("actions.cancel", { ns: "common" })}</Button>
    </DialogFooter>
  </>;
}

function CandidateRow({ candidate, selected, onSelect, onOpen }) {
  const { t } = useTranslation("workspace");
  const warning = candidate.compatibility === "needs_attention";
  const unsupported = !candidate.canOpen;
  const detail = candidate.diagnostics?.[0]?.message || candidate.reasons?.[0] || t("picker.readyToInspect");
  return <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-disabled={unsupported}
    disabled={unsupported}
    onClick={() => onSelect(candidate.candidateId)}
    onDoubleClick={() => candidate.canOpen && onOpen(candidate.candidateId)}
    className={cn$2(
      "group flex w-full items-start gap-3 border-b border-ed-border px-4 py-3 text-left last:border-b-0",
      "hover:bg-ed-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ed-ring",
      selected && "bg-ed-muted",
      unsupported && "cursor-not-allowed opacity-55 hover:bg-transparent"
    )}
  >
    <div className={cn$2(
      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-ed-border bg-ed-background",
      selected && "border-ed-foreground/25"
    )}>
      {selected ? <CheckIcon width={14} height={14} /> : <FolderIcon width={14} height={14} className="text-ed-muted-foreground" />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <Text$4 size="2xs" weight="medium" variant="primary" className="truncate">{candidate.name}</Text$4>
        {candidate.recommended && <span className="shrink-0 rounded-md bg-ed-accent px-1.5 py-0.5 text-[10px] font-medium text-ed-foreground">{t("picker.recommended")}</span>}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-ed-muted-foreground" title={candidate.projectRoot}>{candidate.relativePath}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ed-muted-foreground">
        <span>{kindLabel(candidate.kind, t)}</span>
        <span aria-hidden="true">·</span>
        <span>{frameworkLabel(candidate.framework, t)}</span>
        {candidate.styling?.length > 0 && <><span aria-hidden="true">·</span><span>{candidate.styling.join(", ")}</span></>}
      </div>
      {(warning || unsupported) && <div className={cn$2("mt-1.5 flex items-start gap-1 text-[11px] leading-4", unsupported ? "text-ed-destructive" : "text-ed-muted-foreground")}>
        <WarningIcon$1 width={12} height={12} className="mt-0.5 shrink-0" />
        <span>{detail}</span>
      </div>}
    </div>
  </button>;
}

function MonorepoProjectPicker({ flow }) {
  const { t } = useTranslation("workspace");
  const { discovery, error, isOpen, phase, progress, selectedRoot } = flow;
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null);
  const [ignoreDesignInGit, setIgnoreDesignInGit] = React.useState(false);

  React.useEffect(() => {
    setQuery("");
    setIgnoreDesignInGit(false);
    const preferred = discovery?.candidates?.find((candidate) => candidate.recommended && candidate.canOpen) ||
      discovery?.candidates?.find((candidate) => candidate.canOpen);
    setSelectedId(preferred?.candidateId || null);
  }, [discovery?.requestId]);

  const candidates = discovery?.candidates || [];
  const normalizedQuery = query.trim().toLowerCase();
  const visible = normalizedQuery ? candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(normalizedQuery) || candidate.relativePath.toLowerCase().includes(normalizedQuery)
  ) : candidates;
  const selected = candidates.find((candidate) => candidate.candidateId === selectedId);
  const diagnostics = discovery?.diagnostics || [];
  const busy = phase === "discovering" || phase === "registering";

  function handleListKeyDown(event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
    const openable = visible.filter((candidate) => candidate.canOpen);
    if (event.key === "Enter") {
      if (selected?.canOpen) {
        event.preventDefault();
        flow.registerCandidate(selected.candidateId, ignoreDesignInGit);
      }
      return;
    }
    if (openable.length === 0) return;
    event.preventDefault();
    const current = openable.findIndex((candidate) => candidate.candidateId === selectedId);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = current < 0 ? 0 : (current + direction + openable.length) % openable.length;
    setSelectedId(openable[next].candidateId);
  }

  return <Dialog open={isOpen} onOpenChange={(open) => !open && flow.cancel()}>
    <DialogContent showCloseButton={false} className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-ed-border bg-ed-background p-0 shadow-2xl/7" style={pickerStyle}>
      {busy ? <DiscoveryProgress selectedRoot={selectedRoot} progress={progress} registering={phase === "registering"} onCancel={flow.cancel} /> : <>
        <DialogHeader className="flex flex-col gap-1 px-6 pt-6 text-left">
          <DialogTitle className="p-0 text-base font-semibold text-ed-foreground">{t("picker.title")}</DialogTitle>
          <Text$4 size="2xs" variant="tertiary">{candidates.length > 1 ? t("picker.multipleFound") : candidates.length === 1 ? t("picker.oneFound") : t("picker.noneFound")}</Text$4>
          <div className="truncate pt-1 text-[11px] text-ed-muted-foreground" title={discovery?.selectedRoot || selectedRoot}>{displayPath(discovery?.selectedRoot || selectedRoot)}</div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-5">
          {(error || diagnostics.length > 0) && <div className="rounded-lg border border-ed-border bg-ed-muted/50 px-3 py-2.5 text-[11px] leading-4 text-ed-muted-foreground" role={error ? "alert" : "status"}>
            <div className="flex items-start gap-2">
              <WarningIcon$1 width={13} height={13} className="mt-0.5 shrink-0" />
              <span>{error ? <><strong className="font-medium text-ed-foreground">{t("picker.openFailed")}</strong><span className="mt-0.5 block">{error}</span></> : diagnostics[0]?.message}</span>
            </div>
          </div>}

          {candidates.length > 4 && <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("picker.search")} aria-label={t("picker.search")} className="w-full bg-ed-background" />}

          <div
            className="min-h-0 overflow-y-auto rounded-xl border border-ed-border bg-ed-card"
            style={{ maxHeight: 360 }}
            role="radiogroup"
            aria-label={t("picker.listLabel")}
            onKeyDown={handleListKeyDown}
          >
            {visible.length > 0 ? visible.map((candidate) => <CandidateRow
              key={candidate.candidateId}
              candidate={candidate}
              selected={candidate.candidateId === selectedId}
              onSelect={setSelectedId}
              onOpen={(candidateId) => flow.registerCandidate(candidateId, ignoreDesignInGit)}
            />) : <div className="px-4 py-10 text-center">
              <Text$4 size="2xs" variant="tertiary">{candidates.length > 0 ? t("picker.noSearchMatches") : t("picker.chooseDirectly")}</Text$4>
            </div>}
          </div>
          {candidates.some(candidate => candidate.canOpen) && <div className="space-y-2 text-xs text-ed-muted-foreground">
            <p>{t("picker.designStorageNotice")}</p>
            <label className="flex cursor-pointer items-start gap-2 text-ed-foreground">
              <input type="checkbox" checked={ignoreDesignInGit} onChange={event => setIgnoreDesignInGit(event.target.checked)} aria-describedby="design-git-help" className="mt-0.5 accent-current" />
              <span>{t("picker.ignoreDesignInGit")}</span>
            </label>
            <p id="design-git-help" className="pl-5 text-[11px] leading-4">{t("picker.ignoreDesignHelp")}</p>
          </div>}
        </div>

        <DialogFooter className="flex flex-col-reverse items-stretch gap-2 border-t border-ed-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={flow.chooseAnother}>{t("picker.chooseAnother")}</Button>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button type="button" variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={flow.cancel}>{t("actions.cancel", { ns: "common" })}</Button>
            <Button type="button" variant="default" size="sm" className="flex-1 sm:flex-none" disabled={!selected?.canOpen} onClick={() => selected && flow.registerCandidate(selected.candidateId, ignoreDesignInGit)}>{t("picker.openProject")}</Button>
          </div>
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}

export { MonorepoProjectPicker };
