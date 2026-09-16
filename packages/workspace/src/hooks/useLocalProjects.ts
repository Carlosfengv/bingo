/*
 * Local-mode replacements for the project hooks.
 *
 * Added on top of the recovered tree. In the shipped app a "project" is a row
 * in the vendor's database; here it is a folder on disk, and the project id is
 * that folder's absolute path (EditorView consumes the id as `projectPath`,
 * which is exactly what the local backend and compiler need).
 *
 * The registry of opened folders lives in the app's userData directory, managed
 * by the main process. The hook shapes and react-query keys deliberately match
 * the cloud versions in useProjects.ts so cache invalidation keeps working.
 */
import { queryClient } from "../queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as import_compiler_runtime from "react/compiler-runtime";

const invoke = (channel, args) => window.api.invoke(channel, args);

/** Fields the UI reads off a project, filled in with local-appropriate values. */
function decorate(entry) {
  return {
    id: entry.id,
    name: entry.name,
    rootPath: entry.rootPath,
    canonicalRoot: entry.canonicalRoot,
    workspaceRoot: entry.workspaceRoot,
    relativePath: entry.relativePath,
    kind: entry.kind,
    framework: entry.framework,
    shared: false,
    // In local mode this is a PNG data URL loaded from preview.json by the
    // main process. No remote preview endpoint is involved.
    previewUrl: entry.previewUrl ?? null,
    linkToken: null,
    linkAccess: null,
    allowDuplicate: false,
    currentUserPermission: "owner",
    editedAt: entry.previewSavedAt ?? entry.addedAt,
    updatedAt: entry.previewSavedAt ?? entry.addedAt,
    createdAt: entry.addedAt,
  };
}

async function pickAndDiscoverLocalProjects() {
  const picked = await invoke("bingo:choose-project-folder");
  if (!picked || picked.cancelled) return null;
  const discovery = await invoke("bingo:discover-projects", {
    requestId: picked.requestId,
    selectedRoot: picked.selectedRoot,
  });
  if (!discovery || discovery.status === "cancelled") return null;

  return { discovery };
}

async function registerLocalProjectCandidate(requestId, candidateId, ignoreDesignInGit = false) {
  const row = await invoke("bingo:register-project", { requestId, candidateId, ignoreDesignInGit });
  await invalidateProjects();
  return decorate(row);
}

async function cancelLocalProjectDiscovery(requestId) {
  if (!requestId) return;
  await invoke("bingo:cancel-project-discovery", { requestId });
}

function invalidateProjects() {
  return queryClient.invalidateQueries({ queryKey: ["projects"] });
}

function useLocalProjects(organizationId) {
  const $ = (0, import_compiler_runtime.c)(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      queryKey: ["projects", organizationId ?? "local"],
      queryFn: async () => {
        const rows = await invoke("bingo:list-projects");
        return (rows || []).map(decorate);
      },
    };
    $[0] = t0;
  } else t0 = $[0];
  return useQuery(t0);
}

function useLocalProject(projectId) {
  const $ = (0, import_compiler_runtime.c)(4);
  let t0;
  if ($[0] !== projectId) {
    t0 = {
      queryKey: ["project", projectId],
      enabled: !!projectId,
      queryFn: async () => {
        const row = await invoke("bingo:get-project", projectId);
        return row ? decorate(row) : null;
      },
    };
    $[0] = projectId;
    $[1] = t0;
  } else t0 = $[1];
  return useQuery(t0);
}

/** Adding a project discovers a concrete local project before creating a row. */
function useLocalCreateProject() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      mutationFn: pickAndDiscoverLocalProjects,
      onSuccess: invalidateProjects,
    };
    $[0] = t0;
  } else t0 = $[0];
  return useMutation(t0);
}

function useLocalDeleteProject() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      mutationFn: (options) => invoke("bingo:remove-project", options),
      onSuccess: invalidateProjects,
    };
    $[0] = t0;
  } else t0 = $[0];
  return useMutation(t0);
}

function useLocalUpdateProject() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      mutationFn: (body) => invoke("bingo:rename-project", body),
      onSuccess: (_data, variables) => {
        invalidateProjects();
        queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
      },
    };
    $[0] = t0;
  } else t0 = $[0];
  return useMutation(t0);
}

/** Templates come from the server; locally there is nothing to seed. */
function useLocalSeedTemplate() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      mutationFn: async () => null,
      onSuccess: invalidateProjects,
    };
    $[0] = t0;
  } else t0 = $[0];
  return useMutation(t0);
}

function useLocalPendingInvites() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { queryKey: ["pending-invites"], queryFn: async () => [] };
    $[0] = t0;
  } else t0 = $[0];
  return useQuery(t0);
}

function useLocalAcceptInvite() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { mutationFn: async () => null };
    $[0] = t0;
  } else t0 = $[0];
  return useMutation(t0);
}

export {
  cancelLocalProjectDiscovery,
  pickAndDiscoverLocalProjects,
  registerLocalProjectCandidate,
  useLocalAcceptInvite,
  useLocalCreateProject,
  useLocalDeleteProject,
  useLocalPendingInvites,
  useLocalProject,
  useLocalProjects,
  useLocalSeedTemplate,
  useLocalUpdateProject,
};
