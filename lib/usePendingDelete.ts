"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const UNDO_WINDOW_MS = 6000;

/** Delay-and-cancel undo, the same pattern as Gmail's "Undo send": clicking
 *  Delete never touches the server right away. The row is marked "pending"
 *  and a timer starts; only when that timer actually fires does the real
 *  delete action run. Undo just clears the timer — since nothing was ever
 *  sent, there's no data to restore and nothing that can fail.
 *
 *  Only one row can be pending at a time. Starting a second while one is
 *  already running commits the first immediately rather than silently
 *  abandoning it — an admin who already confirmed that first delete didn't
 *  ask for it to be cancelled just by clicking Delete somewhere else.
 *
 *  Switching admin tabs unmounts this hook's owner (AdminTabs renders one
 *  tab at a time), so the unmount effect below commits a still-pending
 *  delete rather than losing track of a delete the admin already confirmed.
 *  Closing the actual browser tab during the window has no such guarantee —
 *  the timer simply never fires and the delete never happens, which is the
 *  safe direction to fail in. */
export function usePendingDelete() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<(() => void) | null>(null);

  const runCommit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const commit = commitRef.current;
    commitRef.current = null;
    setPendingId(null);
    commit?.();
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) runCommit();
    },
    [runCommit]
  );

  function start(id: string, commit: () => void) {
    if (pendingId) runCommit();
    setPendingId(id);
    commitRef.current = commit;
    timerRef.current = setTimeout(runCommit, UNDO_WINDOW_MS);
  }

  function cancel() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commitRef.current = null;
    setPendingId(null);
  }

  return { pendingId, start, cancel };
}
