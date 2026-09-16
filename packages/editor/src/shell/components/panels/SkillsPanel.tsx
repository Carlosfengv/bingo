/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/SkillsPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { PanelEmptyState } from "./PanelEmptyState";
import { useTranslation } from "@bingo/i18n";
import { BookOpenIcon, Button, ScrollArea, Switch, Text$4 } from "@bingo/ui";
import * as import_react from "react";

function extractDescription(skillMd) {
  const frontmatter = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return void 0;
  return frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
}
function SkillsPanel({
  overrides,
  onOpenSkill,
  onResetSkill,
  onToggleSkillActive
}) {
  const { t } = useTranslation("editor");
  const [skills, setSkills] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = window.api;
        if (!api?.invoke) {
          if (!cancelled) {
            setError(t("skillsPanel.desktopOnly"));
            setSkills([]);
          }
          return;
        }
        const result = await api.invoke("get_system_skills");
        if (cancelled) return;
        if (Array.isArray(result)) setSkills(result);else setSkills([]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setSkills([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);
  const displaySkills = skills.map(skill => {
    const override = overrides[skill.name];
    const hasOverride = !!override?.files?.length;
    const overrideActive = !!override?.active;
    if (!overrideActive || !hasOverride) return {
      ...skill,
      hasOverride,
      overrideActive
    };
    const files = override.files;
    const skillMd = files.find(f => f.path === "SKILL.md")?.content ?? "";
    return {
      ...skill,
      files,
      description: extractDescription(skillMd) ?? skill.description,
      hasOverride: true,
      overrideActive: true
    };
  });
  if (loading) return <div className="flex h-full items-center justify-center p-4">{<Text$4 size="3xs" className="text-ed-muted-foreground">{t("skillsPanel.loading")}</Text$4>}</div>;
  if (error) return <ScrollArea className="h-full">{<PanelEmptyState icon={<BookOpenIcon width={24} height={24} className="text-ed-muted-foreground" />} title={t("skillsPanel.loadError")} description={error} />}</ScrollArea>;
  if (displaySkills.length === 0) return <ScrollArea className="h-full">{<PanelEmptyState icon={<BookOpenIcon width={24} height={24} className="text-ed-muted-foreground" />} title={t("skillsPanel.emptyTitle")} description={t("skillsPanel.emptyDescription")} />}</ScrollArea>;
  return <div className="flex h-full flex-col overflow-hidden">{<ScrollArea className="flex-1">{<ul className="flex flex-col gap-0.5 p-3">{displaySkills.map(skill_0 => <li key={skill_0.name}>{<div className="flex w-full items-start gap-2 rounded-[5px] px-2 py-2 text-left hover:bg-ed-muted/60">{<div className="min-w-0 flex-1">{<div className="flex h-6.5 items-center gap-1.5">{<button type="button" className="flex h-full min-w-0 items-center truncate text-left" onClick={() => onOpenSkill(skill_0)}>{<Text$4 size="3xs" weight="medium" className="truncate">{skill_0.name}</Text$4>}</button>}{skill_0.hasOverride && onResetSkill && <Button type="button" size="xs" variant="secondary" isChildText={false} className="group/reset shrink-0 px-2 leading-none hover:bg-ed-primary" aria-label={t("skillsPanel.reset", { name: skill_0.name })} onClick={e => {
                  e.stopPropagation();
                  onResetSkill(skill_0.name);
                }}>{<span className="text-ed-muted-foreground group-hover/reset:hidden">{t("skillsPanel.edited")}</span>}{<span className="hidden font-medium text-ed-primary-foreground group-hover/reset:inline">{t("skillsPanel.resetAction")}</span>}</Button>}</div>}{skill_0.description && <button type="button" className="mt-0.5 w-full text-left" onClick={() => onOpenSkill(skill_0)}>{<Text$4 size="3xs" className="line-clamp-2 text-ed-muted-foreground">{skill_0.description}</Text$4>}</button>}</div>}{onToggleSkillActive && <div className="flex h-6.5 shrink-0 items-center">{<Switch size="sm" className="shrink-0" checked={skill_0.overrideActive} aria-label={skill_0.overrideActive ? t("skillsPanel.disableOverride", { name: skill_0.name }) : t("skillsPanel.enableOverride", { name: skill_0.name })} onCheckedChange={checked => {
                onToggleSkillActive(skill_0.name, checked);
              }} onClick={e_0 => e_0.stopPropagation()} />}</div>}</div>}</li>)}</ul>}</ScrollArea>}</div>;
}

export { SkillsPanel };
