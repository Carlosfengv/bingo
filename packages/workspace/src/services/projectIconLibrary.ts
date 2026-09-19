import { executeCompiledModule, loadIconLibrary } from "@bingo/compiler";

export function loadProjectIconLibrary(projectId: string, library: string) {
  return loadIconLibrary(library, async specifier => {
    const result = await window.api.invoke("bingo:load-module", { root: projectId, specifier });
    if (!result?.success || !result.url) {
      throw new Error(result?.error || `Could not load ${specifier} from this project.`);
    }
    return executeCompiledModule(result.url);
  });
}
