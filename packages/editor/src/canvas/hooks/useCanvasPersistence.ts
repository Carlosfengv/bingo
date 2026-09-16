/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/useCanvasPersistence.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useBackend } from "../../backends/BackendContext";
import * as import_react from "react";

function useCanvasPersistence() {
  const backend = useBackend();
  const [isSaving, setIsSaving] = (0, import_react.useState)(false);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const createPage = async params => {
    try {
      const result = await backend.createPage(params);
      if (!result.success) {
        let errorMessage_0 = "Failed to create page";
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
    }
  };
  const saveCanvas = async params_0 => {
    if (params_0.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params_0.id)) {
      console.warn(`[saveCanvas] Skipping save — canvas id '${params_0.id}' is not a UUID (placeholder before pages loaded)`);
      return {
        success: true,
        canvas: void 0
      };
    }
    setIsSaving(true);
    setError(null);
    try {
      const result_0 = await backend.saveCanvas(params_0);
      if (!result_0.success) {
        let errorMessage_2 = "Failed to save canvas";
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
  /**
  * Store a canvas preview for the dashboard. Deliberately doesn't touch
  * isSaving/error — a preview is incidental and shouldn't show up as a
  * canvas save failure to the user.
  */
  const savePreview = async dataUrl => {
    if (!backend?.savePreview) return {
      success: false,
      error: "Backend has no preview storage"
    };
    return backend.savePreview(dataUrl);
  };
  const loadCanvas = async canvasId => {
    setIsLoading(true);
    setError(null);
    try {
      const result_1 = await backend.loadCanvas(canvasId);
      if (!result_1.success) {
        let errorMessage_4 = "Failed to load canvas";
        if (result_1.error) errorMessage_4 = result_1.error;
        setError(errorMessage_4);
        return {
          success: false,
          error: errorMessage_4
        };
      }
      return result_1;
    } catch (err_1) {
      const errorMessage_3 = err_1 instanceof Error ? err_1.message : "Unknown error";
      setError(errorMessage_3);
      return {
        success: false,
        error: errorMessage_3
      };
    } finally {
      setIsLoading(false);
    }
  };
  const listCanvases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result_2 = await backend.listCanvases();
      if (!result_2.success) {
        let errorMessage_6 = "Failed to list canvases";
        if (result_2.error) errorMessage_6 = result_2.error;
        setError(errorMessage_6);
        return {
          success: false,
          error: errorMessage_6,
          canvases: []
        };
      }
      let canvases = result_2.canvases;
      if (!canvases) canvases = [];
      return {
        ...result_2,
        canvases
      };
    } catch (err_2) {
      const errorMessage_5 = err_2 instanceof Error ? err_2.message : "Unknown error";
      setError(errorMessage_5);
      return {
        success: false,
        error: errorMessage_5,
        canvases: []
      };
    } finally {
      setIsLoading(false);
    }
  };
  const createComponent = async params_1 => {
    setIsSaving(true);
    setError(null);
    try {
      const result_3 = await backend.createComponent(params_1);
      if (!result_3.success) setError(result_3.error || "Failed to create component");
      return result_3;
    } catch (err_3) {
      const errorMessage_7 = err_3 instanceof Error ? err_3.message : "Unknown error";
      setError(errorMessage_7);
      return {
        success: false,
        error: errorMessage_7
      };
    } finally {
      setIsSaving(false);
    }
  };
  const listCanvasVersions = async canvasId_0 => {
    setIsLoading(true);
    setError(null);
    try {
      const result_4 = await backend.listCanvasVersions(canvasId_0);
      if (!result_4.success) {
        let errorMessage_9 = "Failed to list versions";
        if (result_4.error) errorMessage_9 = result_4.error;
        setError(errorMessage_9);
        return {
          success: false,
          error: errorMessage_9,
          versions: []
        };
      }
      let versions = result_4.versions;
      if (!versions) versions = [];
      return {
        ...result_4,
        versions
      };
    } catch (err_4) {
      const errorMessage_8 = err_4 instanceof Error ? err_4.message : "Unknown error";
      setError(errorMessage_8);
      return {
        success: false,
        error: errorMessage_8,
        versions: []
      };
    } finally {
      setIsLoading(false);
    }
  };
  const getCanvasVersion = async (canvasId_1, versionFilename) => {
    setIsLoading(true);
    setError(null);
    try {
      const result_5 = await backend.getCanvasVersion(canvasId_1, versionFilename);
      if (!result_5.success) {
        let errorMessage_11 = "Failed to get version";
        if (result_5.error) errorMessage_11 = result_5.error;
        setError(errorMessage_11);
        return {
          success: false,
          error: errorMessage_11
        };
      }
      return result_5;
    } catch (err_5) {
      const errorMessage_10 = err_5 instanceof Error ? err_5.message : "Unknown error";
      setError(errorMessage_10);
      return {
        success: false,
        error: errorMessage_10
      };
    } finally {
      setIsLoading(false);
    }
  };
  const restoreCanvasVersion = async (canvasId_2, versionFilename_0) => {
    setIsSaving(true);
    setError(null);
    try {
      const result_6 = await backend.restoreCanvasVersion(canvasId_2, versionFilename_0);
      if (!result_6.success) {
        let errorMessage_13 = "Failed to restore version";
        if (result_6.error) errorMessage_13 = result_6.error;
        setError(errorMessage_13);
        return {
          success: false,
          error: errorMessage_13
        };
      }
      return result_6;
    } catch (err_6) {
      const errorMessage_12 = err_6 instanceof Error ? err_6.message : "Unknown error";
      setError(errorMessage_12);
      return {
        success: false,
        error: errorMessage_12
      };
    } finally {
      setIsSaving(false);
    }
  };
  const deletePage = async pageId => {
    try {
      return await backend.deletePage(pageId);
    } catch (err_7) {
      return {
        success: false,
        error: err_7 instanceof Error ? err_7.message : "Unknown error"
      };
    }
  };
  const reorderPages = async order => {
    try {
      return await backend.reorderPages(order);
    } catch (err_8) {
      return {
        success: false,
        error: err_8 instanceof Error ? err_8.message : "Unknown error"
      };
    }
  };
  return {
    createPage,
    deletePage,
    reorderPages,
    saveCanvas,
    savePreview,
    loadCanvas,
    listCanvases,
    createComponent,
    listCanvasVersions,
    getCanvasVersion,
    restoreCanvasVersion,
    isSaving,
    isLoading,
    error
  };
}

export { useCanvasPersistence };
