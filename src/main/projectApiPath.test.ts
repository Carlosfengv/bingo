import assert from "node:assert/strict";
import test from "node:test";
import { parseProjectApiPath, projectApiPath } from "./projectApiPath";

test("project paths round-trip as one segment, including route names and URL punctuation", () => {
  for (const id of [
    "/tmp/files/my-app", "/tmp/pages/my-app", "/tmp/settings/my-app",
    "/tmp/my app/#v1%", "/tmp/项目/页面", "C:\\work\\files\\app",
  ]) {
    const request = projectApiPath(id, "/files/by-path?path=src%2FApp.tsx");
    const parsed = parseProjectApiPath(request);
    assert.equal(parsed?.projectId, id);
    assert.equal(parsed?.route, "/files/by-path");
    assert.equal(parsed?.query.get("path"), "src/App.tsx");
  }
});

test("project API rejects raw absolute paths and malformed encodings", () => {
  assert.throws(() => parseProjectApiPath("/projects//tmp/files/my-app/files"));
  assert.throws(() => parseProjectApiPath("/projects/%ZZ/files"));
  assert.throws(() => parseProjectApiPath("/projects/%2Ftmp%2ffiles/files"));
  assert.equal(parseProjectApiPath("/import/files"), null);
});
