"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced function that persists a value keyed by a string.
 * Pending saves are flushed on unmount. Each key debounces independently.
 */
export function useDebouncedSave(
  save: (key: string, value: unknown) => void,
  delay = 600
) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const latest = useRef<Map<string, unknown>>(new Map());
  const saveRef = useRef(save);
  saveRef.current = save;

  const trigger = useCallback(
    (key: string, value: unknown) => {
      latest.current.set(key, value);
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          saveRef.current(key, latest.current.get(key));
        }, delay)
      );
    },
    [delay]
  );

  useEffect(() => {
    const timersMap = timers.current;
    const latestMap = latest.current;
    return () => {
      for (const [key, t] of timersMap.entries()) {
        clearTimeout(t);
        saveRef.current(key, latestMap.get(key));
      }
      timersMap.clear();
    };
  }, []);

  return trigger;
}
