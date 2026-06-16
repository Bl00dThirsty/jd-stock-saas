import { useEffect, useRef, useState } from "react";

export type FlashDir = "up" | "down" | null;

/**
 * Returns "up"/"down" briefly whenever `value` changes, then null.
 * Used to flash a cell green/red on a live price tick.
 */
export function useFlash(value: number | null | undefined, ms = 600): FlashDir {
  const prev = useRef(value);
  const [dir, setDir] = useState<FlashDir>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (value == null || before == null || value === before) return;
    setDir(value > before ? "up" : "down");
    const t = setTimeout(() => setDir(null), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return dir;
}
