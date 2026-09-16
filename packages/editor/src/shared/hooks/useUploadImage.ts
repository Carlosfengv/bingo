/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/hooks/useUploadImage.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useBackend } from "../../backends/BackendContext";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Convert a data URL to a Blob for backend.uploadAsset()
*/
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: mime
  });
}
/**
* Hook that returns an upload function for images via the BingoBackend.
*
* IMPORTANT: Returns canonical paths (like /.bingo-assets/xxx.png), NOT resolved URLs.
* The rendering layer (renderElement) handles resolution via assetResolver at render time.
* This prevents stale absolute URLs (with ephemeral ports) from being stored in elements.
*/
function useUploadImage() {
  const $ = (0, import_compiler_runtime.c)(2);
  const backend = useBackend();
  let t0;
  if ($[0] !== backend) {
    t0 = async (dataUrl, mimeType) => {
      let ext = "png";
      if (mimeType) {
        const subtype = mimeType.split("/")[1];
        if (subtype) ext = subtype;
      }
      try {
        const blob = dataUrlToBlob(dataUrl);
        const result = await backend.uploadAsset(blob, `image-${Date.now()}.${ext}`);
        if (result.success) {
          if (result.url) return {
            url: result.url
          };
        }
      } catch (t1) {
        console.warn("[useUploadImage] Backend upload failed:", t1);
      }
      return {
        url: null
      };
    };
    $[0] = backend;
    $[1] = t0;
  } else t0 = $[1];
  return t0;
}

export { useUploadImage };
