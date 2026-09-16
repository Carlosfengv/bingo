import { queryClient } from "../queryClient";
import * as React from "react";

const initialState = {
  phase: "idle",
  requestId: null,
  selectedRoot: null,
  discovery: null,
  progress: null,
  error: null,
};

function useLocalProjectOpen(onSelectProject) {
  const [state, setState] = React.useState(initialState);
  const activeRequestRef = React.useRef(null);
  const selectionOptionsRef = React.useRef(undefined);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = window.api.on("bingo:project-discovery-progress", (progress) => {
      if (!progress?.requestId || progress.requestId !== activeRequestRef.current) return;
      setState((current) => ({ ...current, progress }));
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
      const requestId = activeRequestRef.current;
      if (requestId) window.api.invoke("bingo:cancel-project-discovery", { requestId }).catch(() => {});
    };
  }, []);

  const reset = React.useCallback(() => {
    activeRequestRef.current = null;
    if (mountedRef.current) setState(initialState);
  }, []);

  const cancel = React.useCallback(async () => {
    const requestId = activeRequestRef.current;
    activeRequestRef.current = null;
    if (requestId) {
      await window.api.invoke("bingo:cancel-project-discovery", { requestId }).catch(() => {});
    }
    if (mountedRef.current) setState(initialState);
  }, []);

  const registerCandidate = React.useCallback(async (candidateId, ignoreDesignInGit = false) => {
    const requestId = activeRequestRef.current;
    if (!requestId || state.phase === "registering") return;
    setState((current) => ({ ...current, phase: "registering", error: null }));
    try {
      const project = await window.api.invoke("bingo:register-project", { requestId, candidateId, ignoreDesignInGit });
      if (requestId !== activeRequestRef.current || !project) return;
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      const options = selectionOptionsRef.current;
      reset();
      onSelectProject(project.id, options);
    } catch (error) {
      if (!mountedRef.current || requestId !== activeRequestRef.current) return;
      setState((current) => ({
        ...current,
        phase: "choosing",
        error: error instanceof Error ? error.message : "Couldn't open this project.",
      }));
    }
  }, [onSelectProject, reset, state.phase]);

  const runPreparedDiscovery = React.useCallback(async (picked, options) => {
    selectionOptionsRef.current = options;
    activeRequestRef.current = picked.requestId;
    setState({
      ...initialState,
      phase: "discovering",
      requestId: picked.requestId,
      selectedRoot: picked.selectedRoot,
      progress: { stage: "reading-workspace", scannedDirectoryCount: 0, candidateCount: 0 },
    });
    try {
      const discovery = await window.api.invoke("bingo:discover-projects", {
        requestId: picked.requestId,
        selectedRoot: picked.selectedRoot,
      });
      if (!mountedRef.current || activeRequestRef.current !== picked.requestId) return;
      if (!discovery || discovery.status === "cancelled") {
        reset();
        return;
      }
      // Even a single project needs the storage/Git choice before registration.
      setState((current) => ({ ...current, phase: "choosing", discovery, error: null }));
    } catch (error) {
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: "choosing",
        error: error instanceof Error ? error.message : "Couldn't inspect this folder.",
      }));
    }
  }, [onSelectProject, reset]);

  const start = React.useCallback(async (options) => {
    if (["picking", "discovering", "registering"].includes(state.phase)) return;
    if (activeRequestRef.current) await cancel();
    selectionOptionsRef.current = options;
    setState({ ...initialState, phase: "picking" });
    try {
      const picked = await window.api.invoke("bingo:choose-project-folder");
      if (!picked || picked.cancelled) {
        reset();
        return;
      }
      await runPreparedDiscovery(picked, options);
    } catch (error) {
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: "choosing",
        error: error instanceof Error ? error.message : "Couldn't choose this folder.",
      }));
    }
  }, [cancel, reset, runPreparedDiscovery, state.phase]);

  const startFromProject = React.useCallback(async (project, options) => {
    if (["picking", "discovering", "registering"].includes(state.phase)) return;
    if (activeRequestRef.current) await cancel();
    selectionOptionsRef.current = options;
    setState({ ...initialState, phase: "picking" });
    try {
      const prepared = await window.api.invoke("bingo:prepare-project-discovery", { projectId: project.id });
      await runPreparedDiscovery(prepared, options);
    } catch (error) {
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: "choosing",
        selectedRoot: project.workspaceRoot || project.rootPath,
        error: error instanceof Error ? error.message : "Couldn't inspect this project.",
      }));
    }
  }, [cancel, runPreparedDiscovery, state.phase]);

  const chooseAnother = React.useCallback(async () => {
    const options = selectionOptionsRef.current;
    await cancel();
    await start(options);
  }, [cancel, start]);

  return {
    ...state,
    isOpen: state.phase !== "idle" && state.phase !== "picking",
    isBusy: state.phase === "discovering" || state.phase === "registering",
    start,
    startFromProject,
    cancel,
    chooseAnother,
    registerCandidate,
  };
}

export { useLocalProjectOpen };
