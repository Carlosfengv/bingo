import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createComponentPreviewStore } from "../state/componentPreview";
import type { ComponentPreviewStore } from "../state/componentPreview";

const Context = createContext<ComponentPreviewStore | null>(null);
const subscribeEmpty = () => () => {};
const getEmpty = () => null;

export function ComponentPreviewProvider({ children }) {
  const [store] = useState(createComponentPreviewStore);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (!store.getSnapshot() || event.isComposing) return;
      if (event.key === "Escape" || ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault(); event.stopImmediatePropagation(); store.cancel();
      }
    };
    window.addEventListener("keydown", cancel, true);
    return () => { window.removeEventListener("keydown", cancel, true); store.cancel(); };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useComponentPreview() {
  const store = useContext(Context);
  const snapshot = useSyncExternalStore(store?.subscribe ?? subscribeEmpty, store?.getSnapshot ?? getEmpty, getEmpty);
  return { store, snapshot };
}
