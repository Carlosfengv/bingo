#!/usr/bin/env node
/*
 * Drive the running Bingo Electron app over the Chrome DevTools Protocol.
 *
 * The app is a GUI, so "did it render the right thing" cannot be answered by
 * reading logs alone. Launch it with `--remote-debugging-port=9222` and use this
 * to evaluate expressions in the renderer, click, and take screenshots.
 *
 * Node 23 ships a global WebSocket, so this needs no dependencies.
 *
 *   node tools/drive.mjs targets
 *   node tools/drive.mjs eval "document.title"
 *   node tools/drive.mjs click "button[type=submit]"
 *   node tools/drive.mjs text            # visible text of the app
 *   node tools/drive.mjs shot /tmp/x.png
 */

const PORT = process.env.CDP_PORT || 9222;

async function appTarget() {
  const res = await fetch(`http://localhost:${PORT}/json/list`);
  const targets = await res.json();
  // The app's own page, not the DevTools frontend that Electron also exposes.
  const page = targets.find(
    (t) => t.type === "page" && /index\.html|localhost/.test(t.url || "")
  );
  if (!page) throw new Error("app page target not found — is the app running with --remote-debugging-port?");
  return page;
}

async function connect() {
  const target = await appTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const entry = pending.get(msg.id);
    if (entry) {
      pending.delete(msg.id);
      entry(msg);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  // Resolve only once the socket has actually closed: process.exit() would
  // truncate stdout when it is a pipe, and an open socket keeps the loop alive.
  const close = () =>
    new Promise((resolve) => {
      ws.addEventListener("close", resolve, { once: true });
      ws.close();
    });
  return { send, close };
}

async function evaluate(send, expression) {
  const res = await send("Runtime.evaluate", {
    expression: `(() => { try { return (${expression}); } catch (e) { return "ERR: " + e.message; } })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  return res.result?.result?.value;
}

const [, , command, ...rest] = process.argv;
const { send, close } = await connect();

try {
  if (command === "targets") {
    const res = await fetch(`http://localhost:${PORT}/json/list`);
    for (const t of await res.json()) console.log(t.type, "|", t.title, "|", t.url.slice(0, 80));
  } else if (command === "eval") {
    console.log(JSON.stringify(await evaluate(send, rest.join(" ")), null, 2));
  } else if (command === "text") {
    console.log(await evaluate(send, "document.body.innerText.slice(0, 2000)"));
  } else if (command === "click") {
    const sel = rest.join(" ");
    console.log(
      await evaluate(
        send,
        `(() => { const el = document.querySelector(${JSON.stringify(sel)});
           if (!el) return "not found: " + ${JSON.stringify(sel)};
           el.click(); return "clicked " + el.tagName; })()`
      )
    );
  } else if (command === "shot") {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const fs = await import("node:fs");
    fs.writeFileSync(rest[0] || "/tmp/bingo-shot.png", Buffer.from(res.result.data, "base64"));
    console.log("saved", rest[0] || "/tmp/bingo-shot.png");
  } else {
    console.log("usage: drive.mjs targets|eval|text|click|shot");
  }
} finally {
  await close();
}
