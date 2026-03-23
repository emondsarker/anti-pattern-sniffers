import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// This one is a god hook — should trigger
function useMonolith(config) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => { setLoading(true); }, [config]);
  useEffect(() => { if (error) setRetryCount(c => c + 1); }, [error]);
  useEffect(() => { /* cleanup */ return () => {}; }, []);
  useEffect(() => { /* sync cache */ }, [cache]);

  return { data, error, loading, cache, retryCount };
}

// This one is clean — should NOT trigger
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}

export { useMonolith, useToggle };
