import assert from "node:assert/strict";
import test from "node:test";
import { handleDevToolsShortcut, isToggleDevToolsInput } from "./devToolsShortcut";

test("F12 toggles developer tools once and prevents the renderer shortcut", () => {
  let prevented = 0;
  let toggled = 0;
  const handled = handleDevToolsShortcut(
    { preventDefault: () => prevented++ },
    { type: "keyDown", key: "F12", isAutoRepeat: false },
    { isDestroyed: () => false, toggleDevTools: () => toggled++ },
  );
  assert.equal(handled, true);
  assert.equal(prevented, 1);
  assert.equal(toggled, 1);
});

test("keyup, held F12, modified F12 and other keys do not toggle", () => {
  for (const input of [
    { type: "keyUp", key: "F12" },
    { type: "keyDown", key: "F12", isAutoRepeat: true },
    { type: "keyDown", key: "F12", meta: true },
    { type: "keyDown", key: "F12", control: true },
    { type: "keyDown", key: "F12", alt: true },
    { type: "keyDown", key: "F12", shift: true },
    { type: "keyDown", key: "F11" },
  ]) assert.equal(isToggleDevToolsInput(input), false);
});

test("destroyed web contents are not used", () => {
  let toggled = 0;
  assert.equal(handleDevToolsShortcut({}, { type: "keyDown", key: "F12" }, {
    isDestroyed: () => true,
    toggleDevTools: () => toggled++,
  }), false);
  assert.equal(toggled, 0);
});
