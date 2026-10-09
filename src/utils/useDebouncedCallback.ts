import { useEffect, useMemo, useRef } from 'react';

export type DebouncedCallback<A extends unknown[]> = ((...args: A) => void) & { cancel: () => void };

/**
 * Runs `callback` only after `delay` ms without another call. Always calls the latest
 * `callback` (no stale state), and drops a pending call on `cancel()` or unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): DebouncedCallback<A> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useMemo(() => {
    const cancel = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    const run = (...args: A) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    };
    return Object.assign(run, { cancel });
  }, [delay]);

  useEffect(() => debounced.cancel, [debounced]);
  return debounced;
}
