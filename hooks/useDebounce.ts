"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
): ((...args: Parameters<T>) => void) & { flush: () => void; cancel: () => void } {
  const fnRef = useRef(fn);
  const argsRef = useRef<Parameters<T> | null>(null);
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
    if (argsRef.current) {
      fnRef.current(...argsRef.current);
    }
  }, [cancel]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs, cancel]
  ) as ((...args: Parameters<T>) => void) & { flush: () => void; cancel: () => void };

  debounced.flush = flush;
  debounced.cancel = cancel;

  useEffect(() => cancel, [cancel]);

  return debounced;
}
