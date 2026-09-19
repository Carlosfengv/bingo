import assert from "node:assert/strict";
import test from "node:test";
import { createElement, forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadIconLibrary } from "./iconLibrary";

const definition = [["path", { d: "M3 12L12 3L21 12", stroke: "currentColor", key: "0" }]];

test("Hugeicons data exports render through the project renderer with canvas props", async () => {
  const requests: string[] = [];
  const Renderer = forwardRef(({ icon, size, ...props }: any, ref) =>
    createElement("svg", { width: size, height: size, ...props, ref },
      icon.map(([tag, attrs]) => createElement(tag, attrs))));
  const icons = await loadIconLibrary("@hugeicons/core-free-icons", async specifier => {
    requests.push(specifier);
    return specifier === "@hugeicons/react" ? { HugeiconsIcon: Renderer } : {
      Home01Icon: definition, default: definition, InvalidIcon: [["path", null]],
      EmptyIcon: [], metadata: { version: 1 },
    };
  });
  assert.deepEqual(requests, ["@hugeicons/core-free-icons", "@hugeicons/react"]);
  assert.deepEqual(Object.keys(icons), ["Home01Icon"]);
  const markup = renderToStaticMarkup(createElement(icons.Home01Icon, {
    size: 20, strokeWidth: 1.5, className: "nav-icon", "data-element-id": "home-icon",
    style: { color: "red" },
  }));
  assert.match(markup, /<svg[^>]*width="20"[^>]*height="20"/);
  assert.match(markup, /stroke-width="1.5"/);
  assert.match(markup, /class="nav-icon"/);
  assert.match(markup, /data-element-id="home-icon"/);
  assert.match(markup, /style="color:red"/);
  assert.match(markup, /<path d="M3 12L12 3L21 12"/);
});

test("ordinary React icon libraries retain their original components", async () => {
  const Home = () => createElement("svg");
  const Settings = forwardRef((props, ref) => createElement("svg", { ...props, ref }));
  const icons = await loadIconLibrary("lucide-react", async () => ({
    Home, Settings, default: Home, helper: Home, DataIcon: definition,
  }));
  assert.deepEqual(icons, { Home, Settings });
});

test("a missing or incompatible Hugeicons renderer gives an actionable error", async () => {
  await assert.rejects(loadIconLibrary("@hugeicons/core-free-icons", async specifier => {
    if (specifier === "@hugeicons/react") throw new Error("Cannot resolve @hugeicons/react");
    return { Home01Icon: definition };
  }), /Cannot resolve @hugeicons\/react/);
  await assert.rejects(loadIconLibrary("@hugeicons/core-free-icons", async specifier =>
    specifier === "@hugeicons/react" ? {} : { Home01Icon: definition }), /does not export HugeiconsIcon/);
});

test("unusable exports and data arrays from unrelated libraries are rejected", async () => {
  for (const library of ["@hugeicons/core-free-icons", "other-icons"]) {
    await assert.rejects(loadIconLibrary(library, async () => ({ BadIcon: [], version: "1" })), /does not export supported icons/);
  }
  await assert.rejects(loadIconLibrary("other-icons", async () => ({ Home01Icon: definition })), /does not export supported icons/);
});
