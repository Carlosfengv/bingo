/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatAttachments.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var CHAT_ATTACHMENT_ACCEPT = "image/*,.pdf,.txt,.md,.json,.tsx,.ts,.jsx,.js,.css,.html";
/** Read entries during the drop event, before the browser protects its data store. */
function getDroppedAttachments(data) {
  const items = Array.from(data.items).filter(item => item.kind === "file");
  if (items.length === 0) return Array.from(data.files, file => ({
    file,
    isDirectory: false
  }));
  return items.flatMap(item => {
    const file = item.getAsFile();
    return file ? [{
      file,
      isDirectory: item.webkitGetAsEntry?.()?.isDirectory ?? false
    }] : [];
  });
}
/** Uploads and drops share the same file encoding and context representation. */
async function readPromptAttachment({
  file,
  isDirectory
}) {
  if (isDirectory) {
    const bridge = window.api;
    if (!bridge) throw new Error("Local folder attachments are available in the desktop app.");
    if (!bridge.getPathForFile) throw new Error("Restart Bingo to enable folder attachments, then drop the folder again.");
    const path = bridge.getPathForFile(file);
    if (!path) throw new Error(`Could not find the local path for ${file.name}. Try dragging the folder from Finder again.`);
    return {
      type: "folder",
      id: `folder:${path}`,
      name: file.name,
      path
    };
  }
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}. Try attaching it again.`));
    reader.onabort = () => reject(new Error(`Reading ${file.name} was cancelled.`));
    reader.readAsDataURL(file);
  });
  const type = file.type.startsWith("image/") ? "image" : "file";
  return {
    type,
    id: `${type}:${crypto.randomUUID()}`,
    name: file.name,
    data
  };
}

export { CHAT_ATTACHMENT_ACCEPT, getDroppedAttachments, readPromptAttachment };
