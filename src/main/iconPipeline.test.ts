import assert from "node:assert/strict";
import test from "node:test";

import { generateJSX } from "../../packages/compiler/src/codegen/generateJSX";
import { generateIconImports } from "../../packages/compiler/src/codegen/generateImports";
import { parseJSX } from "../../packages/compiler/src/codegen/parseJSX";
import { parseJSXPartial } from "../../packages/compiler/src/codegen/parseJSXPartial";
import { getById, getChildren$2, getRootIds } from "../../packages/compiler/src/store/read";
import { preserveResolvedStreamingIcons } from "../../packages/editor/src/shell/hooks/canvasDrawStream";

function firstRoot(store) {
  return getById(store, getRootIds(store)[0]);
}

test("canvas icon serialization round-trips without a loaded icon registry", () => {
  const store = parseJSX(
    '<i data-icon="Settings" data-icon-library="lucide-react" size={20} />',
    {},
    {},
  );

  const canvasJsx = generateJSX(store, 0, {
    includeDataElementId: true,
    iconSyntax: "canvas",
  });
  assert.match(canvasJsx, /^<i data-icon="Settings" data-icon-library="lucide-react"/);

  const reparsed = parseJSX(canvasJsx, {}, {});
  assert.deepEqual(
    {
      type: firstRoot(reparsed)?.type,
      library: firstRoot(reparsed)?.library,
      iconName: firstRoot(reparsed)?.iconName,
      size: firstRoot(reparsed)?.props?.size,
    },
    {
      type: "icon",
      library: "lucide-react",
      iconName: "Settings",
      size: 20,
    },
  );
});

test("source icon serialization remains normal imported React syntax", () => {
  const store = parseJSX(
    '<i data-icon="Settings" data-icon-library="lucide-react" size={20} />',
    {},
    {},
  );
  assert.equal(generateJSX(store), '<Settings size={20} />');
});

test("Hugeicons source serialization uses its React renderer and icon data export", () => {
  const store = parseJSX(
    '<i data-icon="Cpu" data-icon-library="@hugeicons/core-free-icons" size={20} />',
    {},
    {},
  );
  assert.equal(generateJSX(store), '<HugeiconsIcon icon={CpuIcon} size={20} />');
  assert.deepEqual(
    generateIconImports(new Map([["@hugeicons/core-free-icons", new Set(["Cpu", "ArrowLeft01Icon"])]])),
    [
      "import { ArrowLeft01Icon, CpuIcon } from '@hugeicons/core-free-icons'",
      "import { HugeiconsIcon } from '@hugeicons/react'",
    ],
  );
});

test("canvas serialization recovers a legacy icon saved as a missing component", () => {
  const store = parseJSX('<Settings size={20} />', {}, {});
  assert.equal(firstRoot(store)?.type, "component");

  const canvasJsx = generateJSX(store, 0, {
    iconSyntax: "canvas",
    componentIndex: {},
    iconLibraries: {
      "lucide-react": {
        icons: { Settings: () => null },
      },
    },
  });

  assert.equal(canvasJsx, '<i data-icon="Settings" data-icon-library="lucide-react" size={20} />');
  assert.equal(firstRoot(parseJSX(canvasJsx, {}, {}))?.type, "icon");
});

test("partial icon tokens are marked truncated and keep stable ids", () => {
  const parsed = parseJSXPartial(
    '<div><i data-icon="Se',
    { "lucide-react": { icons: { Settings: () => null } } },
    {},
    undefined,
    { stableIdPrefix: "el-draw-test" },
  );
  assert.equal(parsed?.truncated, true);
  const root = parsed && firstRoot(parsed.store);
  const child = root && parsed && getById(parsed.store, getChildren$2(parsed.store, root.id)[0]);
  assert.equal(child?.id, "el-draw-test-0-0");
  assert.equal(child?.type, "icon");
  assert.equal(child?.iconName, "Se");
});

test("streaming keeps the last resolved icon while the next token is incomplete", () => {
  const iconLibraries = {
    "lucide-react": {
      icons: {
        Settings: () => null,
      },
    },
  };
  const store = parseJSX(
    '<i data-element-id="el-draw-test-0" data-icon="Settings" data-icon-library="lucide-react" size={20} />',
    iconLibraries,
    {},
  );
  const incomplete = {
    id: "el-draw-test-0",
    type: "icon",
    library: "luci",
    iconName: "Se",
    props: { size: 20 },
  };

  preserveResolvedStreamingIcons(store, incomplete, iconLibraries);

  assert.equal(incomplete.library, "lucide-react");
  assert.equal(incomplete.iconName, "Settings");
});
