import { useEffect, useRef, useState, useCallback } from "react";

export function useFirestoreSubscription(subscribeFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const unsubRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = subscribeFn(
      (result) => { setData(result); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );

    unsubRef.current = unsub;
    return () => {
      if (typeof unsubRef.current === "function") unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryTick]);

  const retry = useCallback(() => setRetryTick((t) => t + 1), []);
  return { data, loading, error, retry };
}