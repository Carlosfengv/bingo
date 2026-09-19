// WebContentsView can report hidden while its native window is visible on macOS
// (electron/electron#44590). Give automation a consistent foreground lifecycle.
// Keep this in the test harness: production visibility and throttling are intact.
async function foregroundEditor(editor) {
  if (!editor.debugger.isAttached()) editor.debugger.attach('1.3');
  await editor.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
  const visible = await editor.executeJavaScript('document.visibilityState === "visible"');
  if (!visible) throw new Error('The editor must be visible before recording performance');
}
module.exports = { foregroundEditor };
