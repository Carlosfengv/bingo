import { executeCompiledModule, getIconLibraryDependencyName } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { queryClient } from "../queryClient";

const projectSettingsKey = (projectId) => ["project-settings", projectId];
const invokeStore = (op, root, args = {}) => window.api.invoke("bingo:store", { op, root, ...args });

function iconLibrariesFrom(settings) {
  return Array.isArray(settings?.iconLibraries)
    ? settings.iconLibraries.filter((library) => typeof library === "string")
    : [];
}

function effectiveIconLibrariesFrom(settings) {
  return Array.isArray(settings?.effectiveIconLibraries)
    ? settings.effectiveIconLibraries.filter((library) => typeof library === "string")
    : iconLibrariesFrom(settings);
}

function isUsableIconExport(name, value) {
  return (typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value)) &&
    /^[A-Z][a-zA-Z0-9]*$/.test(name) && name !== "default";
}

async function verifyInstalledIconLibrary(projectId, packageName) {
  const result = await window.api.invoke("bingo:load-module", { root: projectId, specifier: packageName });
  if (!result?.success || !result.url) {
    const dependency = getIconLibraryDependencyName(packageName);
    throw new Error(`${packageName} is not installed in this project. Add ${dependency} to the project dependencies first.`);
  }
  const module = await executeCompiledModule(result.url);
  if (!Object.entries(module).some(([name, value]) => isUsableIconExport(name, value))) {
    throw new Error(`${packageName} does not export named React icon components. Choose an installed icon subpath.`);
  }
}

function useProjectIconSettings({ projectId, onCreateIconSetupChatDraft }) {
  const { t } = useTranslation("editor");
  const [editorSettingsRevision, setEditorSettingsRevision] = React.useState(0);
  const [externalChatDraft, setExternalChatDraft] = React.useState(null);
  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(projectId),
    enabled: !!projectId,
    queryFn: () => invokeStore("read-settings", projectId),
  });

  const saveLibraries = async (iconLibraries, iconLibraryPolicy) => {
    const current = settingsQuery.data;
    const expectedRevision = current?._configuration?.revision;
    const saved = await invokeStore("write-settings", projectId, {
      patch: { iconLibraries, iconLibraryPolicy },
      expectedRevision,
    });
    await queryClient.invalidateQueries({ queryKey: projectSettingsKey(projectId) });
    setEditorSettingsRevision((value) => value + 1);
    return saved;
  };

  const refreshIconSettings = async () => {
    await queryClient.invalidateQueries({ queryKey: projectSettingsKey(projectId) });
    setEditorSettingsRevision((value) => value + 1);
  };

  const addIconPackageMutation = useMutation({
    mutationFn: async (packageName) => {
      if (effectiveIconLibrariesFrom(settingsQuery.data).includes(packageName)) return packageName;
      await verifyInstalledIconLibrary(projectId, packageName);
      await invokeStore("add-icon-libraries", projectId, { libraries: [packageName] });
      await refreshIconSettings();
      return packageName;
    },
    onSuccess: (packageName) => toast.success(t("projectSettings.iconPackageAdded", { name: packageName })),
  });
  const removeIconPackageMutation = useMutation({
    mutationFn: async (packageName) => {
      const currentPolicy = settingsQuery.data?.iconLibraryPolicy || { mode: "auto", disabledLibraries: [] };
      const nextLibraries = iconLibrariesFrom(settingsQuery.data).filter((library) => library !== packageName);
      const nextPolicy = currentPolicy.mode === "auto"
        ? { mode: "auto", disabledLibraries: Array.from(new Set([...(currentPolicy.disabledLibraries || []), packageName])) }
        : { mode: "manual", disabledLibraries: [] };
      await saveLibraries(nextLibraries, nextPolicy);
      return packageName;
    },
    onSuccess: (packageName) => toast.success(t("projectSettings.iconPackageRemoved", { name: packageName })),
  });
  const setIconLibraryModeMutation = useMutation({
    mutationFn: async mode => {
      const nextPolicy = mode === "manual"
        ? { mode: "manual", disabledLibraries: [] }
        : { mode: "auto", disabledLibraries: settingsQuery.data?.iconLibraryPolicy?.disabledLibraries || [] };
      await saveLibraries(iconLibrariesFrom(settingsQuery.data), nextPolicy);
      return mode;
    },
  });

  const askAIForIconSetup = React.useCallback((context) => {
    const text = t("chat.prompts.configureIconPackage", { package: context.attemptedPackage });
    onCreateIconSetupChatDraft?.(text);
    if (onCreateIconSetupChatDraft) setExternalChatDraft({ id: Date.now(), text });
  }, [onCreateIconSetupChatDraft, t]);

  return {
    iconLibraries: effectiveIconLibrariesFrom(settingsQuery.data),
    automaticIconLibraries: settingsQuery.data?._iconDiscovery?.automatic || [],
    iconLibraryPolicy: settingsQuery.data?.iconLibraryPolicy || { mode: "auto", disabledLibraries: [] },
    editorSettingsRevision,
    externalChatDraft,
    addIconPackage: addIconPackageMutation.mutateAsync,
    removeIconPackage: removeIconPackageMutation.mutateAsync,
    setIconLibraryMode: setIconLibraryModeMutation.mutateAsync,
    askAIForIconSetup,
  };
}

export { useProjectIconSettings };
