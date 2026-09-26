const BASELINE_ID = "bingo-project-inherited-style";
const PROJECT_STYLES = '#bingo-project-compiled-css, #bingo-compiled-css, [id^="bingo-font-import-"], #bingo-project-fonts, #bingo-project-font-vars, #bingo-project-local-fonts';
const controllers = new WeakMap<Document, ReturnType<typeof createBaseline>>();

/** Only CSS is loaded into this empty document. No project component is mounted,
 * evaluated, or measured a second time. Authored component styles stay untouched. */
function createBaseline(doc: Document) {
  const win = doc.defaultView!;
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-project-style-baseline", "");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;left:-100000px;top:0;border:0;visibility:hidden;pointer-events:none";
  doc.body.appendChild(frame);
  const reference = frame.contentDocument!;
  reference.open();
  reference.write("<!doctype html><html><head></head><body></body></html>");
  reference.close();
  const baseline = doc.createElement("style");
  baseline.id = BASELINE_ID;
  doc.head.appendChild(baseline);
  let stopped = false;
  let fingerprint = "";
  let revision = 0;
  let pending = Promise.resolve();
  const cancelLoads = new Set<() => void>();
  const inheritedHostTokens = new Set<string>();

  function measure() {
    if (stopped) return;
    const view = reference.defaultView!;
    const inherited = reference.createElement("div");
    const initial = reference.createElement("div");
    inherited.style.setProperty("all", "unset", "important");
    initial.style.setProperty("all", "initial", "important");
    reference.body.replaceChildren(inherited, initial);
    const inheritedStyle = view.getComputedStyle(inherited);
    const initialStyle = view.getComputedStyle(initial);
    const declarations = doc.createElement("div").style;
    declarations.all = "initial";
    declarations.display = "block";
    declarations.direction = inheritedStyle.direction;
    declarations.unicodeBidi = "normal";
    // Reset inherited editor tokens too: `all` does not reset custom properties.
    // Project tokens are copied afterwards and descendants can override them.
    for (const name of Array.from(win.getComputedStyle(doc.body))) {
      if (name.startsWith("--")) inheritedHostTokens.add(name);
    }
    // A preview stylesheet replacement temporarily removes the editor sheet.
    // Keep its known token names isolated while the replacement is loading.
    for (const name of inheritedHostTokens) declarations.setProperty(name, "initial");
    for (const name of Array.from(inheritedStyle)) {
      const value = inheritedStyle.getPropertyValue(name);
      if (name.startsWith("--") || value !== initialStyle.getPropertyValue(name)) {
        declarations.setProperty(name, value);
      }
    }
    // Computed style resolves a unitless line-height to px. Preserve its ratio
    // so a heading using a larger font still inherits the same multiplier.
    const size = parseFloat(inheritedStyle.fontSize);
    const line = parseFloat(inheritedStyle.lineHeight);
    if (size > 0 && Number.isFinite(line)) {
      inherited.style.cssText = "all:unset!important";
      inherited.style.setProperty("font-size", `${size * 2}px`, "important");
      const larger = parseFloat(view.getComputedStyle(inherited).lineHeight);
      declarations.lineHeight = Math.abs(larger - line * 2) < 0.1 ? String(line / size) : `${line}px`;
    }
    const css = `@layer bingo-project-baseline { :where([data-canvas-content], [data-drag-overlay]) { ${declarations.cssText} } }`;
    if (baseline.textContent !== css) baseline.textContent = css;
    delete baseline.dataset.error;
    baseline.dataset.ready = "true";
  }

  function refresh() {
    if (stopped) return Promise.resolve();
    const nodes = Array.from(doc.head.querySelectorAll(PROJECT_STYLES));
    // Editor appearance is not the project's dark mode.
    const classes = Array.from(doc.documentElement.classList).filter(name => name !== "editor-dark").join(" ");
    // The editor shell can be dark while the canvas deliberately renders in
    // light mode. Measure light-dark() values in the canvas color scheme, not
    // the shell/OS scheme, or inherited text becomes white on a light canvas.
    const canvas = doc.querySelector<HTMLElement>("[data-canvas-content]");
    const canvasColorScheme = canvas ? win.getComputedStyle(canvas).colorScheme : "light";
    const next = JSON.stringify([nodes.map(node => node.outerHTML), classes, canvasColorScheme, win.innerWidth, win.innerHeight]);
    if (next === fingerprint) return pending;
    fingerprint = next;
    const current = ++revision;
    for (const cancel of cancelLoads) cancel();
    baseline.dataset.ready = "false";
    frame.style.width = `${win.innerWidth}px`;
    frame.style.height = `${win.innerHeight}px`;
    reference.documentElement.className = classes;
    reference.documentElement.style.colorScheme = canvasColorScheme;
    reference.head.replaceChildren();
    const loads = nodes.map(node => {
      const clone = node.cloneNode(true) as HTMLLinkElement | HTMLStyleElement;
      if (clone.tagName !== "LINK") { reference.head.appendChild(clone); return Promise.resolve(); }
      return new Promise<void>((resolve, reject) => {
        const required = clone.id === "bingo-project-compiled-css" || clone.id === "bingo-compiled-css";
        const timer = win.setTimeout(() => finish(new Error("Project style baseline timed out.")), 15000);
        const cancel = () => finish();
        const finish = (error?: Error) => {
          win.clearTimeout(timer);
          cancelLoads.delete(cancel);
          clone.onload = null;
          clone.onerror = null;
          error && required ? reject(error) : resolve();
        };
        cancelLoads.add(cancel);
        clone.onload = () => finish();
        clone.onerror = () => finish(new Error("Could not load project styles for the canvas baseline."));
        reference.head.appendChild(clone);
      });
    });
    pending = Promise.all(loads).then(() => {
      if (!stopped && current === revision) measure();
    }).catch(error => {
      if (!stopped && current === revision) fingerprint = "";
      throw error;
    });
    return pending;
  }
  const schedule = () => { void refresh().catch(error => {
    if (!stopped) { baseline.dataset.error = String(error); console.warn("[Project styles]", error); }
  }); };
  const isProjectNode = (node: Node) => {
    const element = node.nodeType === 1 ? node as Element : node.parentElement;
    return Boolean(element?.matches(PROJECT_STYLES));
  };
  const observer = new MutationObserver(records => {
    // Our own ready/error/style changes must not schedule another load (in
    // particular, a failed request should wait for an explicit retry/change).
    if (records.some(record => record.target === doc.documentElement || isProjectNode(record.target)
      || [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some(isProjectNode))) schedule();
  });
  observer.observe(doc.head, { childList: true, subtree: true, attributes: true, characterData: true });
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["class"] });
  const onHostStyleLoad = (event: Event) => {
    const target = event.target as Element | null;
    if (target?.matches?.('link[rel="stylesheet"]') && baseline.dataset.ready === "true") measure();
  };
  doc.head.addEventListener("load", onHostStyleLoad, true);
  win.addEventListener("resize", schedule);
  reference.fonts.addEventListener("loadingdone", measure);
  return {
    refresh,
    dispose() {
      stopped = true;
      revision++;
      for (const cancel of cancelLoads) cancel();
      observer.disconnect();
      doc.head.removeEventListener("load", onHostStyleLoad, true);
      win.removeEventListener("resize", schedule);
      reference.fonts.removeEventListener("loadingdone", measure);
      frame.remove();
      baseline.remove();
    },
  };
}

export function refreshProjectStyleBaseline(doc: Document = document) {
  let controller = controllers.get(doc);
  if (!controller) { controller = createBaseline(doc); controllers.set(doc, controller); }
  return controller.refresh();
}

export function cleanupProjectStyleBaseline(doc: Document = document) {
  controllers.get(doc)?.dispose();
  controllers.delete(doc);
}
