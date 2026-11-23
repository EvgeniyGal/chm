"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local search input synced to URL param `q`, with debounced commits.
 * Keeps the in-progress draft while typing so URL updates do not clobber newer keystrokes.
 */
export function useDebouncedListSearch(
  committedQ: string,
  onCommit: (trimmed: string) => void,
  debounceMs = 350,
) {
  const [queryInput, setQueryInput] = useState(committedQ);
  const onCommitRef = useRef(onCommit);
  /** Trimmed value we last asked the URL to take; used to ignore commit echoes. */
  const pendingCommitRef = useRef<string | null>(null);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // Sync URL → input only for external changes (back/forward, cleared filters).
  // Skip when `committedQ` is just our own debounced commit landing — otherwise
  // characters typed after the commit was scheduled get wiped.
  useEffect(() => {
    if (pendingCommitRef.current !== null) {
      if (committedQ.trim() === pendingCommitRef.current) {
        pendingCommitRef.current = null;
        return;
      }
      // URL moved somewhere else before our commit landed (e.g. browser back).
      pendingCommitRef.current = null;
    }
    setQueryInput(committedQ);
  }, [committedQ]);

  useEffect(() => {
    const normalizedNext = queryInput.trim();
    const normalizedCurrent = committedQ.trim();
    if (normalizedCurrent === normalizedNext) return;
    const timer = setTimeout(() => {
      pendingCommitRef.current = normalizedNext;
      onCommitRef.current(normalizedNext);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [queryInput, committedQ, debounceMs]);

  return [queryInput, setQueryInput] as const;
}
