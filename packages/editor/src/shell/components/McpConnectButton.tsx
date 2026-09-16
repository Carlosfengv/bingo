/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/McpConnectButton.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { McpConnectModal } from "./McpConnectModal";
import * as import_react from "react";

/**
* Headless MCP-connect state: an `openMcp` action plus the modal node to render.
*
* Render `mcpModal` somewhere that stays mounted independently of the trigger — in
* particular NOT inside a DropdownMenu's content, which unmounts its children when the
* menu closes and would tear down the modal the instant it opens (LUN-115). A menu row
* should call `openMcp` while the modal lives at a stable spot in the tree.
*/
function useMcpConnect(fetchMcpInfo) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const [info, setInfo] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const openMcp = async () => {
    setOpen(true);
    if (!fetchMcpInfo) return;
    setLoading(true);
    try {
      setInfo(await fetchMcpInfo());
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };
  return {
    openMcp,
    mcpModal: <McpConnectModal open={open} onOpenChange={setOpen} info={info} loading={loading && !!fetchMcpInfo} />
  };
}

export { useMcpConnect };
