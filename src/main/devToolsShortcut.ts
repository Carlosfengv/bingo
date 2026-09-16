export function isToggleDevToolsInput(input) {
  return input?.type === "keyDown"
    && input.key === "F12"
    && input.isAutoRepeat !== true
    && !input.meta
    && !input.control
    && !input.alt
    && !input.shift;
}

export function handleDevToolsShortcut(event, input, webContents) {
  if (!isToggleDevToolsInput(input) || webContents?.isDestroyed?.()) return false;
  event?.preventDefault?.();
  webContents.toggleDevTools();
  return true;
}
