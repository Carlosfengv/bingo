import assert from "node:assert/strict";
import test from "node:test";
import { createComponentPreviewStore } from "../../packages/editor/src/shared/state/componentPreview";
import { createElement } from "react";
import { markUnwrappedPreviewElement, prepareComponentPreviewTree } from "../../packages/editor/src/shared/utils/componentPreviewTree";
import { componentSceneTargets, registerComponentPreviewProjection, matchesComponentPreviewScene } from "../../packages/editor/src/shared/utils/componentScenePreview";
import { ensureV2 } from "../../packages/compiler/src/store/ensureV2";

test("parameter previews preserve unchanged runtime-enriched inputs while applying only authored changes", () => {
  const Component = () => null, Boundary = () => null;
  const authoredTheme = { '--fixed': 'red' };
  const renderedTheme = { '--surface': '#123456', ...authoredTheme };
  const node = createElement(Component, { label: 'Before', themeVariables: renderedTheme });
  const snapshot: any = { token: 1, status: 'pending', targets: new Map([['instance', {
    id: 'instance', before: { label: 'Before', themeVariables: authoredTheme }, after: { label: 'After', themeVariables: authoredTheme },
  }]]) };
  const result = prepareComponentPreviewTree(node, snapshot, { id: 'instance' }, Boundary);
  assert.equal((result.content as any).props.label, 'After');
  assert.equal((result.content as any).props.themeVariables, renderedTheme);
  assert.deepEqual([...result.owned], ['instance']);
});

const target = (id: string) => ({ id, before: { size: "sm" }, after: { size: "lg" } });
const flush = () => new Promise<void>(resolve => queueMicrotask(resolve));

test("continuous color previews remain visible after validation and never publish", async () => {
  const store=createComponentPreviewStore(10);
  const token=store.preview([target("a"),target("b")]);
  store.report(token,"a");store.report(token,"b");await flush();
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(store.getSnapshot()?.token,token);
  assert.equal(store.getSnapshot()?.status,"pending");
  assert.equal(store.getSnapshot()?.continuous,true);
  store.cancel();assert.equal(store.getSnapshot(),null);
});

test("a finished color gesture is validated again before one batch commit", async () => {
  const store=createComponentPreviewStore();
  let commits=0;
  const drag=store.preview([target("a"),target("b")]);
  store.report(drag,"a");store.report(drag,"b");await flush();
  const finish=store.start([target("a"),target("b")],()=>commits++);
  store.report(drag,"a","stale error");
  store.report(finish,"a");await flush();assert.equal(commits,0);
  store.report(finish,"b");await flush();assert.equal(commits,1);
  assert.equal(store.getSnapshot(),null);
});

test("failed and cancelled continuous candidates cannot publish through stale reports", async () => {
  const store=createComponentPreviewStore();
  const token=store.preview([target("a"),target("b")]);
  store.report(token,"a");store.report(token,"b","invalid color");await flush();
  assert.equal(store.getSnapshot()?.status,"failed");
  assert.equal(store.getSnapshot()?.continuous,true);
  const retry=store.preview([target("a")]);
  store.report(token,"a");store.report(retry,"a");store.cancel();await flush();
  assert.equal(store.getSnapshot(),null);
});

test("unwrapped child previews preserve component identity, refs and untouched props", () => {
  const Child = () => null, Parent = () => null, Boundary = () => null;
  const ref = { current: null }, onClick = () => {};
  const child = markUnwrappedPreviewElement(createElement(Child, { key: 'child', ref, size: 'sm', style: { color: 'red' }, onClick }), { id: 'child' });
  const tree = createElement(Parent, {}, child);
  const snapshot = { token: 1, status: 'pending' as const, targets: new Map([['child', target('child')]]) };
  const result = prepareComponentPreviewTree(tree, snapshot, { id: 'parent' }, Boundary);
  const rendered = result.content as any;
  assert.equal(rendered.type, Parent);
  assert.equal(rendered.props.children.type, Child);
  assert.equal(rendered.props.children.key, 'child');
  assert.equal(rendered.props.children.props.ref, ref);
  assert.equal(rendered.props.children.props.onClick, onClick);
  assert.deepEqual(rendered.props.children.props.style, { color: 'red' });
  assert.equal(rendered.props.children.props.size, 'lg');
  assert.deepEqual([...result.owned], ['child']);
  assert.deepEqual([...result.affected], ['child']);
  assert.equal(child.props.size, 'sm');
  assert.equal(prepareComponentPreviewTree(tree, { ...snapshot, status: 'failed' }, { id: 'parent' }, Boundary).content, tree);
});

test("ancestors observe wrapped child previews without taking over their success reports", () => {
  const Child = () => null, Parent = () => null, Boundary = () => null;
  const tree = createElement(Parent, {}, createElement(Boundary, { elementId: 'child' }, createElement(Child, { size: 'sm' })));
  const snapshot = { token: 1, status: 'pending' as const, targets: new Map([['child', target('child')]]) };
  const result = prepareComponentPreviewTree(tree, snapshot, { id: 'parent' }, Boundary);
  assert.equal(result.content, tree);
  assert.equal(result.owned.size, 0);
  assert.deepEqual([...result.affected], ['child']);
});

test("structural previews build children from candidate props before patching child targets", () => {
  const Parent = () => null, Child = () => null, Boundary = () => null;
  const child = markUnwrappedPreviewElement(createElement(Child, { size: 'sm' }), { id: 'child' });
  const tree = createElement(Parent, { asChild: false }, createElement('div', {}, child));
  const snapshot = { token: 1, status: 'pending' as const, targets: new Map([
    ['parent', { id: 'parent', before: { asChild: false }, after: { asChild: true } }], ['child', target('child')],
  ]) };
  const result = prepareComponentPreviewTree(tree, snapshot, { id: 'parent', renderChildren: props => props.asChild ? child : createElement('div', {}, child) }, Boundary);
  const rendered = result.content as any;
  assert.equal(rendered.props.asChild, true);
  assert.equal(rendered.props.children.type, Child);
  assert.equal(rendered.props.children.props.size, 'lg');
  assert.deepEqual([...result.owned], ['parent', 'child']);
});

test("preview commits a whole batch only after every mounted instance succeeds", async () => {
  const store = createComponentPreviewStore();
  let committed = 0;
  const token = store.start([target("a"), target("b")], () => committed++);
  store.report(token, "a"); await flush();
  assert.equal(committed, 0);
  store.report(token, "b"); await flush();
  assert.equal(committed, 1);
  assert.equal(store.getSnapshot(), null);
});

test("a late layout failure cancels a scheduled commit and retains repairable draft", async () => {
  const store = createComponentPreviewStore();
  let committed = false;
  const token = store.start([target("a"), target("b")], () => { committed = true; });
  store.report(token, "a"); store.report(token, "b");
  store.report(token, "b", "Cannot render this size");
  await flush();
  assert.equal(committed, false);
  assert.equal(store.getSnapshot()?.status, "failed");
  assert.deepEqual(store.getSnapshot()?.targets.get("a")?.before, { size: "sm" });
  assert.deepEqual(store.getSnapshot()?.targets.get("a")?.after, { size: "lg" });
  store.cancel();
});

test("cancel or a newer preview prevents stale reports and queued commits", async () => {
  const store = createComponentPreviewStore();
  const committed: string[] = [];
  const first = store.start([target("a")], () => committed.push("first"));
  store.report(first, "a");
  const second = store.start([target("a")], () => committed.push("second"));
  store.report(first, "a", "old failure"); await flush();
  assert.deepEqual(committed, []);
  assert.equal(store.getSnapshot()?.token, second);
  store.report(second, "a"); store.cancel(); await flush();
  assert.deepEqual(committed, []);
});

test("unmounted or unsupported preview times out without committing", async () => {
  const store = createComponentPreviewStore(10);
  let committed = false;
  store.start([target("a")], () => { committed = true; });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(store.getSnapshot()?.error, "PREVIEW_TIMEOUT");
  assert.equal(committed, false);
  store.cancel();
});

test("commit conflict remains a failed draft instead of reporting success", async () => {
  const store = createComponentPreviewStore();
  const token = store.start([target("a")], () => { throw new Error("Source changed"); });
  store.report(token, "a"); await flush();
  assert.equal(store.getSnapshot()?.error, "Source changed");
  assert.equal(store.getSnapshot()?.status, "failed");
  store.cancel();
});

test("scene validation settles only after publication, including synchronous preview cleanup", async () => {
  const store = createComponentPreviewStore();
  let committed = false;
  const candidate = {};
  const pending = store.validate([target('a')], { tabId: 'page', store: candidate, owner: 'agent' }, () => {
    committed = true; store.cancel();
  });
  assert.equal(store.getSnapshot()?.scene?.store, candidate);
  store.report(store.getSnapshot()!.token, 'a');
  await pending;
  assert.equal(committed, true);
  assert.equal(store.getSnapshot(), null);
});

test("scene render failures reject without publishing or retaining a renderable candidate", async () => {
  const store = createComponentPreviewStore();
  let committed = false;
  const pending = store.validate([target('a')], { tabId: 'page', store: {}, owner: 'code' }, () => { committed = true; });
  const rejected = assert.rejects(pending, /Invalid business value/);
  store.report(store.getSnapshot()!.token, 'a', 'Invalid business value');
  await rejected;
  assert.equal(committed, false);
  assert.equal(store.getSnapshot()?.status, 'failed');
  store.cancel();
});

test("superseded and cancelled scene callers settle without accepting stale success", async () => {
  const store = createComponentPreviewStore();
  let committed = false;
  const first = store.validate([target('a')], { tabId: 'page', store: {}, owner: 'code' }, () => { committed = true; });
  const rejected = assert.rejects(first, /superseded/);
  const staleToken = store.getSnapshot()!.token;
  const next = store.validate([target('b')], { tabId: 'page', store: {}, owner: 'agent' }, () => { committed = true; });
  const cancelled = assert.rejects(next, /cancelled/);
  store.report(staleToken, 'a'); store.cancel();
  await Promise.all([rejected, cancelled]);
  assert.equal(committed, false);
});

test("scene timeout and publication conflicts reject rather than leaving callers waiting", async () => {
  const store = createComponentPreviewStore(10);
  await assert.rejects(store.validate([target('a')], { tabId: 'page', store: {}, owner: 'agent' }, () => assert.fail()), /PREVIEW_TIMEOUT/);
  const next = store.validate([target('a')], { tabId: 'page', store: {}, owner: 'agent' }, () => { throw new Error('Version changed'); });
  const failed = assert.rejects(next, /Version changed/);
  store.report(store.getSnapshot()!.token, 'a');
  await failed;
  store.cancel();
});

test("scene targets include changed components and component ancestors of structural edits", () => {
  const child = (id: string) => ({ id, type: 'component', componentName: 'Child', props: {label:id}, styles: {} });
  const parent = children => ({id:'parent',type:'component',componentName:'Parent',props:{},styles:{},children});
  const before = ensureV2([parent([child('a'),child('b')]),child('unchanged')]);
  const reordered = ensureV2([parent([child('b'),child('a')]),child('unchanged')]);
  assert.deepEqual(componentSceneTargets(before,reordered).map(t=>t.id),['parent']);
  const changed = ensureV2([parent([{...child('a'),props:{label:'Changed'}},child('b')]),child('unchanged')]);
  assert.deepEqual(new Set(componentSceneTargets(before,changed).map(t=>t.id)),new Set(['a','parent']));
  const removed = ensureV2([parent([]),child('unchanged')]);
  assert.deepEqual(componentSceneTargets(before,removed).map(t=>t.id),['parent']);
  const added = ensureV2([parent([child('a'),child('b'),child('new')]),child('unchanged')]);
  assert.deepEqual(new Set(componentSceneTargets(before,added).map(t=>t.id)),new Set(['new','parent']));
});

test("old rendered trees cannot certify a newer scene while it is suspended", () => {
  const Component = () => null, Boundary = () => null;
  const previousStore = {}, candidateStore = {};
  const snapshot: any = {token:1,status:'pending',scene:{tabId:'page',owner:'agent',store:candidateStore},targets:new Map([['a',target('a')]])};
  const previous = createElement(Component,{size:'sm'});
  const stale = prepareComponentPreviewTree(previous,snapshot,{id:'a',renderStore:previousStore},Boundary);
  assert.equal(stale.content,previous);
  assert.equal(stale.owned.size,0);
  assert.equal(stale.affected.size,0);
  const current = prepareComponentPreviewTree(createElement(Component,{size:'lg'}),snapshot,{id:'a',renderStore:candidateStore},Boundary);
  assert.deepEqual([...current.owned],['a']);
});

test("theme projections certify only the authored scene from which they were prepared", () => {
  const previous = {}, candidate = {}, oldProjection = {}, currentProjection = {};
  registerComponentPreviewProjection(previous, oldProjection);
  registerComponentPreviewProjection(candidate, currentProjection);
  assert.equal(matchesComponentPreviewScene(candidate, oldProjection), false);
  assert.equal(matchesComponentPreviewScene(candidate, undefined), false);
  assert.equal(matchesComponentPreviewScene(candidate, currentProjection), true);
  const Component = () => null, Boundary = () => null;
  const snapshot: any = {token:1,status:'pending',scene:{tabId:'page',owner:'code',store:candidate},targets:new Map([['a',target('a')]])};
  const tree = createElement(Component, { size: 'lg', themeVariables: {'--foreground':'white'} });
  const result = prepareComponentPreviewTree(tree, snapshot, {id:'a',renderStore:currentProjection}, Boundary);
  assert.deepEqual([...result.owned], ['a']);
  assert.equal((result.content as any).props.themeVariables, tree.props.themeVariables);
  assert.equal(prepareComponentPreviewTree(tree,snapshot,{id:'a',renderStore:oldProjection},Boundary).owned.size,0);
});
