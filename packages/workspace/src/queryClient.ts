/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/queryClient.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { QueryClient } from "@tanstack/query-core";

var queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 6e4,
      retry: 1
    }
  }
});

export { queryClient };
