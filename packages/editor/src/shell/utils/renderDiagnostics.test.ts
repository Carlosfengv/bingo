import assert from "node:assert/strict";
import test from "node:test";
import { collectRenderDiagnostics } from "../../canvas/utils/renderDiagnostics";

test("readback distinguishes saved components from rendered components within its subtree", () => {
  const store = {byId:new Map([
    ["root", {type:"html", tag:"div"}],
    ["failed", {type:"component", componentName:"Badge", _componentMissing:true}],
    ["working", {type:"component", componentName:"Card"}],
    ["outside", {type:"component", componentName:"Other", _componentMissing:true}],
  ]), childrenByParent:new Map([["root", ["failed", "working"]]])};
  assert.deepEqual(collectRenderDiagnostics(store,"root",{}).map(item=>item.name),["Badge"]);
  delete store.byId.get("failed")._componentMissing;
  assert.deepEqual(collectRenderDiagnostics(store,"root",{}),[]);
  assert.deepEqual(collectRenderDiagnostics(store,"root",{}, {Card(){}}).map(item=>item.name),["Badge"]);
  assert.deepEqual(collectRenderDiagnostics(store,"root",{}, {Card(){},Badge(){}}),[]);
  assert.match(collectRenderDiagnostics(store,"root",{}, {Card(){}}, {Badge:{path:"badge.tsx",runtimeError:"process is not defined"}})[0].message,/badge.tsx: process is not defined/);
  store.byId.get("failed")._componentMissing=true;
  assert.deepEqual(collectRenderDiagnostics(store,"root",{}, {Card(){},Badge(){}}),[],"old fallback flags do not override a recovered registry");
});

test("missing icon glyphs warn until the exact library export is available", () => {
  const store = {byId:new Map([["icon",{type:"icon",iconName:"IconClock",library:"@tabler/icons-react"}]]),childrenByParent:new Map()};
  assert.equal(collectRenderDiagnostics(store,null,{})[0].code,"ICON_RENDER_FALLBACK");
  assert.deepEqual(collectRenderDiagnostics(store,null,{"@tabler/icons-react":{icons:{IconClock(){}}}}),[]);
});
