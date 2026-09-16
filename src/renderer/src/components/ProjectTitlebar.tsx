import * as React from "react";
import { CaretDownIcon, CircleIcon, HouseIcon, PenNibIcon, PlusIcon, SpinnerGapIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { useTranslation } from "@bingo/i18n";
import type { ProjectTabsState } from "../../../shared/projectTabs";

export function ProjectTitlebar({ state, onActivate, onClose, onHome, onList }: {
  state: ProjectTabsState;
  onActivate: (id: string, focus?: boolean) => void;
  onClose: (id: string) => void;
  onHome: () => void;
  onList: () => void;
}) {
  const { t } = useTranslation("app");
  const strip = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState(false);
  React.useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const update = () => setOverflow(element.scrollWidth > element.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    window.addEventListener("resize", update);
    const wheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth) return;
      element.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      event.preventDefault();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); element.removeEventListener("wheel", wheel); };
  }, [state.tabs.length]);
  React.useEffect(() => {
    strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [state.activeId]);
  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % state.tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + state.tabs.length) % state.tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = state.tabs.length - 1;
    else return;
    event.preventDefault();
    onActivate(state.tabs[next].id, false);
    strip.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return <header className="project-titlebar" data-platform={state.platform}>
    <div className="project-titlebar-window-controls" aria-hidden="true" />
    <button type="button" className="project-titlebar-home" data-active={state.activeId === null}
      aria-label={t("tabs.home")} title={t("tabs.home")} onClick={onHome}><HouseIcon size={19} /></button>
    <div ref={strip} className="project-titlebar-tabs" role="tablist" aria-label={t("tabs.label")}>
      {state.tabs.map((tab, index) => {
        const active = state.activeId === tab.id;
        const statusLabel = tab.status === "idle" ? "" : t(`tabs.${tab.status}`);
        return <div key={tab.id} className="project-titlebar-tab" data-active={active} data-closing={!!tab.closing}>
          <button type="button" role="tab" aria-selected={active} aria-label={`${tab.name}${statusLabel ? ` · ${statusLabel}` : ""}`}
            tabIndex={active || (!state.activeId && index === 0) ? 0 : -1}
            className="project-titlebar-tab-select" title={`${tab.name}\n${tab.id}${statusLabel ? `\n${statusLabel}` : ""}`}
            onClick={() => onActivate(tab.id)} onKeyDown={event => onTabKey(event, index)}>
            <PenNibIcon size={18} className="project-titlebar-project-icon" />
            <span className="project-titlebar-name">{tab.name}</span>
            {tab.status !== "idle" && <span className="project-titlebar-status" data-status={tab.status}>
              {tab.status === "running" || tab.status === "loading" ? <SpinnerGapIcon size={13} className="project-titlebar-spinner" />
                : tab.status === "attention" ? <CircleIcon size={8} weight="fill" /> : <WarningCircleIcon size={13} />}
              <span>{statusLabel}</span>
            </span>}
          </button>
          <button type="button" className="project-titlebar-close" aria-label={t("tabs.close", { name: tab.name })}
            title={t("tabs.close", { name: tab.name })} onClick={() => onClose(tab.id)} disabled={tab.closing}>
            {tab.closing ? <SpinnerGapIcon size={14} className="project-titlebar-spinner" /> : <XIcon size={14} />}
          </button>
        </div>;
      })}
    </div>
    <button type="button" className="project-titlebar-add" aria-label={t("tabs.new")} title={t("tabs.new")} onClick={onHome}><PlusIcon size={19} /></button>
    {overflow && <button type="button" className="project-titlebar-list" aria-label={t("tabs.list")} title={t("tabs.list")} onClick={onList}><CaretDownIcon size={16} /></button>}
    <div className="project-titlebar-drag-space" aria-hidden="true" />
  </header>;
}
