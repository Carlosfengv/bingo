import assert from "node:assert/strict";
import test from "node:test";
import { unresolvedStyleVariables } from "./componentVariableIssues";

test("variable diagnostics follow active fallbacks and preserve distinct missing names", () => {
  const read = (name: string) => name === '--valid' ? '12px' : '';
  assert.deepEqual(unresolvedStyleVariables('var(--missing)', read), ['--missing']);
  assert.deepEqual(unresolvedStyleVariables('calc(var(--missing) + var(--other) + var(--missing))', read), ['--missing', '--other']);
  assert.deepEqual(unresolvedStyleVariables('var(--valid, var(--missing))', read), []);
  assert.deepEqual(unresolvedStyleVariables('var(--missing, var(--valid, 4px))', read), []);
  assert.deepEqual(unresolvedStyleVariables('var(--missing, var(--other))', read), ['--other']);
  assert.deepEqual(unresolvedStyleVariables('var(--missing, calc(2px + 4px))', read), []);
  assert.deepEqual(unresolvedStyleVariables('var(--missing,)', read), []);
});

test("diagnostics ignore quoted text and decline unsupported or incomplete syntax", () => {
  const read = () => '';
  assert.deepEqual(unresolvedStyleVariables('"var(--quoted)" var(--real)', read), ['--real']);
  assert.deepEqual(unresolvedStyleVariables('var(--missing, "var(--quoted)")', read), []);
  assert.equal(unresolvedStyleVariables('var(--missing', read), null);
  assert.equal(unresolvedStyleVariables('var(--missing, "unfinished)', read), null);
  assert.equal(unresolvedStyleVariables('var(--escaped\\31)', read), null);
  assert.equal(unresolvedStyleVariables('var(/*comment*/--name)', read), null);
});
