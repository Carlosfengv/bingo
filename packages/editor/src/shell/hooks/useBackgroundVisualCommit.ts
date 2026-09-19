import { useCallback, useEffect, useRef } from "react";
import { isProjectVisualActive, subscribeProjectActivity } from "../../shared/lib/projectActivity";

/** Only coalesces rendering. Callers update authoritative refs before enqueueing. */
export function useBackgroundVisualCommit<T>(commit: (value: T) => void) {
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (!pending.current) return;
    const { value } = pending.current; pending.current = null; commit(value);
  }, [commit]);
  useEffect(() => {
    const off = subscribeProjectActivity(() => { if (isProjectVisualActive()) flush(); });
    return () => { off(); if (timer.current !== null) clearTimeout(timer.current); pending.current = null; };
  }, [flush]);
  return useCallback((value: T, immediate = false) => {
    pending.current = { value };
    if (immediate || isProjectVisualActive()) flush();
    else if (timer.current === null) timer.current = setTimeout(flush, 500);
  }, [flush]);
}
