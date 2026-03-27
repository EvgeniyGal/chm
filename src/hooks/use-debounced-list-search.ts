"use client";

import { useEffect, useState } from "react";

/**
 * Local search input synced to URL param `q`, with debounced commits.
 */
export function useDebouncedListSearch(
  committedQ: string,
  onCommit: (trimmed: string) => void,
  debounceMs = 350,
) {
  const [queryInput, setQueryInput] = useState(committedQ);

  useEffect(() => {
    setQueryInput(committedQ);
  }, [committedQ]);

  useEffect(() => {
    const normalizedCurrent = committedQ.trim();
    const normalizedNext = queryInput.trim();
    if (normalizedCurrent === normalizedNext) return;
    const timer = setTimeout(() => {
      onCommit(normalizedNext);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [queryInput, committedQ, debounceMs, onCommit]);

  return [queryInput, setQueryInput] as const;
}
