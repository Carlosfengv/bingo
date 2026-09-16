/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatShortcuts.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Cmd/Ctrl+L adds canvas selection to the prompt. */
function isAddToPromptShortcut(event) {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "l";
}
var camera = {
  scale: 1,
  positionX: 0,
  positionY: 0
};
var listeners$3 = new Set();
function sameCamera(a, b) {
  return a.scale === b.scale && a.positionX === b.positionX && a.positionY === b.positionY;
}
function getCamera() {
  return camera;
}
/** No-ops when the matrix is unchanged, so callers can publish per frame. */
function publishCamera(next) {
  if (sameCamera(camera, next)) return;
  camera = {
    scale: next.scale,
    positionX: next.positionX,
    positionY: next.positionY
  };
  for (const listener of listeners$3) listener(camera);
}
function subscribeCamera(listener) {
  listeners$3.add(listener);
  return () => {
    listeners$3.delete(listener);
  };
}
/** Subscribe to scale only — pan must not re-render webview chrome. */
function subscribeCameraScale(onStoreChange) {
  let last = camera.scale;
  return subscribeCamera(next => {
    if (next.scale === last) return;
    last = next.scale;
    onStoreChange();
  });
}
function getCameraScale() {
  return camera.scale;
}
var cameraDriver = null;
var cameraDriveGeneration = 0;
var cameraDriving = false;
/** Canvas registers the TransformWrapper setter so other modules can pan without remounting. */
function registerCameraDriver(driver) {
  cameraDriver = driver;
  return () => {
    if (cameraDriver === driver) cameraDriver = null;
  };
}
/** Animate or snap the live camera. No-ops when nothing is registered. */
function driveCamera(next, durationMs = 0) {
  if (!cameraDriver) {
    publishCamera(next);
    return;
  }
  cameraDriveGeneration += 1;
  const generation = cameraDriveGeneration;
  cameraDriving = true;
  cameraDriver(next, durationMs);
  if (durationMs <= 0) {
    cameraDriving = false;
    return;
  }
  window.setTimeout(() => {
    if (generation === cameraDriveGeneration) cameraDriving = false;
  }, durationMs + 40);
}
var userCameraGestureListeners = new Set();
function isCameraDriving() {
  return cameraDriving;
}
/** Wheel / pinch / key zoom from the user. Always delivered. */
function notifyUserCameraGesture() {
  for (const listener of userCameraGestureListeners) listener();
}
function subscribeUserCameraGesture(listener) {
  userCameraGestureListeners.add(listener);
  return () => {
    userCameraGestureListeners.delete(listener);
  };
}

export { driveCamera, getCamera, getCameraScale, isAddToPromptShortcut, isCameraDriving, notifyUserCameraGesture, publishCamera, registerCameraDriver, sameCamera, subscribeCamera, subscribeCameraScale, subscribeUserCameraGesture };
