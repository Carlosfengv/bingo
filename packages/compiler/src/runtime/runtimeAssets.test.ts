import assert from "node:assert/strict";
import test from "node:test";
import { createInteropJsxRuntime } from "./runtime";

const jsx = (type, props) => ({ type, props });
test("compiled JSX resolves project images and video posters without mutating props", () => {
  const runtime = createInteropJsxRuntime({ jsx, jsxs: jsx }, { resolveAsset: url => `/preview?asset=${encodeURIComponent(url)}` });
  const props = { src: "/照片.png", onClick: () => {} };
  const image = runtime.jsx("img", props);
  assert.equal(image.props.src, "/preview?asset=%2F%E7%85%A7%E7%89%87.png");
  assert.equal(image.props.onClick, props.onClick);
  assert.equal(props.src, "/照片.png");
  assert.equal(runtime.jsxs("video", { poster: "/cover.png" }).props.poster, "/preview?asset=%2Fcover.png");
  assert.equal(runtime.jsx("img", { src: "bingo-asset:abc.png" }).props.src, "/preview?asset=bingo-asset%3Aabc.png");
});
test("asset resolution leaves links, component contracts, and remote URLs unchanged", () => {
  const runtime = createInteropJsxRuntime({ jsx, jsxs: jsx }, { resolveAsset: () => "changed" });
  for (const src of ["//example.com/image.png", "https://example.com/image.png", "data:image/png;base64,abc", "blob:123"]) {
    assert.equal(runtime.jsx("img", { src }).props.src, src);
  }
  const Component = () => null;
  assert.equal(runtime.jsx(Component, { src: "/route" }).props.src, "/route");
  assert.equal(runtime.jsx("a", { href: "/route" }).props.href, "/route");
  assert.equal(createInteropJsxRuntime({ jsx, jsxs: jsx }).jsx("img", { src: "/logo.svg" }).props.src, "/logo.svg");
});
