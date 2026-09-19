/** Read-only browser transport for the local presentation server. */
const params = new URLSearchParams(window.location.search);
export const browserPresentation = !window.api && params.get("presentation") === "1";

if (browserPresentation) {
  const token = params.get("token") || "";
  const listeners = new Map<string, Set<Function>>();
  const events = new EventSource(`/__luna/events?token=${encodeURIComponent(token)}`);
  const ready = new Promise<void>((resolve, reject) => {
    events.addEventListener("open", () => resolve(), { once: true });
    events.addEventListener("error", () => reject(new Error("Preview connection failed")), { once: true });
  });
  // A rejected initial connection is handled by invoke(), not an unhandled promise.
  void ready.catch(() => {});
  events.onmessage = event => {
    const { channel, args } = JSON.parse(event.data);
    listeners.get(channel)?.forEach(listener => listener(...args));
  };
  window.api = {
    async invoke(channel, args) {
      if (channel === "bingo:builder-connect") await ready;
      const response = await fetch("/__luna/invoke", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel, args })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Preview request failed");
      return payload.result;
    },
    on(channel, callback) {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel)!.add(callback);
      return () => listeners.get(channel)?.delete(callback);
    },
    send() {},
  };
  window.addEventListener("pagehide", () => events.close());
}
