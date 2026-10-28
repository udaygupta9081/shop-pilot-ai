import { useEffect, useRef, useState } from "react";
import { isAbortError } from "../api/client";

interface Settled<T> {
  key: string;
  data?: T;
  error?: string;
}

/**
 * Runs `load` whenever `key` changes and cancels the previous request.
 * Stale responses can never overwrite newer ones. Include a "retry" counter
 * in `key` to force a reload.
 */
export function useAsync<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    loadRef
      .current(controller.signal)
      .then((data) => setSettled({ key, data }))
      .catch((err: unknown) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setSettled({
          key,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      });
    return () => controller.abort();
  }, [key]);

  const current = settled?.key === key ? settled : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: current === null,
  };
}
