import { useTranslation } from "@bingo/i18n";
import { Button, DotsThreeIcon, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";

/** Responsive action row: leading/trailing stay visible while collapsible actions move into an overflow menu. */
function HeaderActions({ leading, collapsible, trailing }) {
  const { t } = useTranslation("editor");
  const hasCollapsible = collapsible.length > 0;

  return <div className="ed-header-actions flex min-w-0 flex-1 items-center justify-end gap-[2px]">
    {leading ? <div className="shrink-0">{leading}</div> : null}
    {hasCollapsible ? <div className="ed-header-actions-inline flex shrink-0 items-center gap-[2px]">{collapsible.map(item => <>{item.inline}</>)}</div> : null}
    {hasCollapsible ? <div className="ed-header-actions-overflow shrink-0">
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-xs" aria-label={t("navigation.moreActions")} isChildText={false}><DotsThreeIcon width={16} height={16} /></Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("navigation.moreActions")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" data-header-overflow-menu="">{collapsible.map(item => <>{item.menuItem}</>)}</DropdownMenuContent>
      </DropdownMenu>
    </div> : null}
    {trailing ? <div className="ml-1 shrink-0">{trailing}</div> : null}
  </div>;
}

export { HeaderActions };
