import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { useLocalProject } from "./useLocalProjects";

function useProject(projectId) {
  return useLocalProject(projectId);
}

function useAllowedPaths(projectId) {
  return useQuery({
    queryKey: ["project-allowed-paths", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const context = await window.api.invoke("bingo:project-access-get", { projectId });
      return { allowedPaths: context?.extraRoots ?? [] };
    },
  });
}

function useUpdateAllowedPaths(projectId) {
  return useMutation({
    mutationFn: async (paths) => {
      if (!projectId) return [];
      const result = await window.api.invoke("bingo:project-access-set-paths", { projectId, paths });
      return result?.extraRoots ?? [];
    },
    onSuccess: (allowedPaths) => {
      queryClient.setQueryData(["project-allowed-paths", projectId], { allowedPaths });
    },
  });
}

export { useAllowedPaths, useProject, useUpdateAllowedPaths };
