"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: [string]) => void>(
  fn: T,
  delayMs: number
): T & { flush: () => void; cancel: () => void } {
  const fnRef = useRef(fn);
  const argsRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  fnRef.current = fn;

  const cancel = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const flush = useCallback(() => {
    cancel();
    fnRef.current(argsRef.current);
  }, [cancel]);

  const debounced = useCallback(
    (value: string) => {
      argsRef.current = value;
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        fnRef.current(value);
      }, delayMs);
    },
    [delayMs, cancel]
  ) as T & { flush: () => void; cancel: () => void };

  debounced.flush = flush;
  debounced.cancel = cancel;

  useEffect(() => cancel, [cancel]);

  return debounced;
}
