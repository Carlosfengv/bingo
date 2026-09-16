/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useBackendActions.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useBackend } from "../../backends/BackendContext";
import * as import_react from "react";

function useBackendActions() {
  const backend = useBackend();
  const [isSaving, setIsSaving] = (0, import_react.useState)(false);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const loadFile = async filePath => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await backend.loadFile(filePath);
      if (!result.success) {
        let errorMessage_0 = "Failed to load file";
        if (result.error) errorMessage_0 = result.error;
        setError(errorMessage_0);
        return {
          success: false,
          error: errorMessage_0
        };
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };
  const saveFile = async options => {
    setIsSaving(true);
    setError(null);
    try {
      const result_0 = await backend.saveFile(options);
      if (!result_0.success) {
        let errorMessage_2 = "Failed to save file";
        if (result_0.error) errorMessage_2 = result_0.error;
        setError(errorMessage_2);
        return {
          success: false,
          error: errorMessage_2
        };
      }
      return result_0;
    } catch (err_0) {
      const errorMessage_1 = err_0 instanceof Error ? err_0.message : "Unknown error";
      setError(errorMessage_1);
      return {
        success: false,
        error: errorMessage_1
      };
    } finally {
      setIsSaving(false);
    }
  };
  const loadDraft = async componentName => {
    try {
      return await backend.loadDraft(componentName);
    } catch (err_1) {
      return {
        success: false,
        draft: null,
        error: err_1 instanceof Error ? err_1.message : "Unknown error"
      };
    }
  };
  const saveDraft = async params => {
    try {
      return await backend.saveDraft(params);
    } catch (err_2) {
      return {
        success: false,
        error: err_2 instanceof Error ? err_2.message : "Unknown error"
      };
    }
  };
  const deleteDraft = async componentName_0 => {
    try {
      return await backend.deleteDraft(componentName_0);
    } catch (err_3) {
      return {
        success: false,
        error: err_3 instanceof Error ? err_3.message : "Unknown error"
      };
    }
  };
  const listDrafts = async () => {
    try {
      return await backend.listDrafts();
    } catch (err_4) {
      return {
        success: false,
        drafts: [],
        error: err_4 instanceof Error ? err_4.message : "Unknown error"
      };
    }
  };
  const listDraftVersions = async componentName_1 => {
    try {
      return await backend.listDraftVersions(componentName_1);
    } catch (err_5) {
      return {
        success: false,
        versions: [],
        error: err_5 instanceof Error ? err_5.message : "Unknown error"
      };
    }
  };
  const getDraftVersion = async (componentName_2, versionFilename) => {
    try {
      return await backend.getDraftVersion(componentName_2, versionFilename);
    } catch (err_6) {
      return {
        success: false,
        error: err_6 instanceof Error ? err_6.message : "Unknown error"
      };
    }
  };
  const restoreDraftVersion = async (componentName_3, versionFilename_0) => {
    try {
      return await backend.restoreDraftVersion(componentName_3, versionFilename_0);
    } catch (err_7) {
      return {
        success: false,
        error: err_7 instanceof Error ? err_7.message : "Unknown error"
      };
    }
  };
  const listFileVersions = async (componentName_4, filePath_0) => {
    try {
      return await backend.listFileVersions(componentName_4, filePath_0);
    } catch (err_8) {
      return {
        success: false,
        versions: [],
        error: String(err_8)
      };
    }
  };
  const restoreFileVersion = async (componentName_5, versionFilename_1, filePath_1) => {
    try {
      return await backend.restoreFileVersion(componentName_5, versionFilename_1, filePath_1);
    } catch (err_9) {
      return {
        success: false,
        error: String(err_9)
      };
    }
  };
  const getFileVersionContent = async (componentName_6, versionFilename_2, filePath_2) => {
    try {
      return await backend.getFileVersionContent(componentName_6, versionFilename_2, filePath_2);
    } catch (err_10) {
      return {
        success: false,
        error: String(err_10)
      };
    }
  };
  return {
    loadFile,
    saveFile,
    loadDraft,
    saveDraft,
    deleteDraft,
    listDrafts,
    listDraftVersions,
    getDraftVersion,
    restoreDraftVersion,
    listFileVersions,
    restoreFileVersion,
    getFileVersionContent,
    isLoading,
    isSaving,
    error
  };
}

export { useBackendActions };
