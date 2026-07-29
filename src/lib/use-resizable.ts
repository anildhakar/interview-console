"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag-to-resize width state, persisted to localStorage.
 * Returns the current width, a mousedown handler for the drag handle, and
 * whether a drag is in progress.
 */
export function useResizable(
  storageKey: string,
  defaultWidth: number,
  min = 280,
  max = 620
) {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const widthRef = useRef(defaultWidth);
  widthRef.current = width;

  // Load persisted width once on mount.
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const n = Number(stored);
      if (!isNaN(n)) setWidth(Math.min(max, Math.max(min, n)));
    }
  }, [storageKey, min, max]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    setDragging(true);

    function onMove(ev: MouseEvent) {
      const next = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX)));
      setWidth(next);
    }
    function onUp() {
      setDragging(false);
      localStorage.setItem(storageKey, String(widthRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, min, max]);

  return { width, onMouseDown, dragging };
}
