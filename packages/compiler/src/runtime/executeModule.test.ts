import assert from "node:assert/strict";
import test from "node:test";
import { executeCompiledModule } from "./executeModule";

test("failed inline modules keep the actual error without copying their source", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent() {} } as unknown as Window & typeof globalThis;
  try {
    const source = `throw new Error('Dependency unavailable');\n/*${"x".repeat(2_000_000)}*/`;
    const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    await assert.rejects(executeCompiledModule(url), (error: Error) => {
      assert.match(error.message, /Dependency unavailable/);
      assert.match(error.message, /inline module/);
      assert.ok(error.message.length < 1500);
      assert.ok(!error.message.includes("base64"));
      return true;
    });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("failed module errors bound dependency URLs and oversized thrown messages", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent() {} } as unknown as Window & typeof globalThis;
  try {
    const source = `throw new Error(${JSON.stringify('Cannot resolve "data:text/javascript;base64,' + "x".repeat(100_000) + '" dependency: ' + "y".repeat(5000))})`;
    const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    await assert.rejects(executeCompiledModule(url), (error: Error) => {
      assert.match(error.message, /Cannot resolve "\[inline module\]" dependency/);
      assert.ok(error.message.length < 1500);
      return true;
    });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
