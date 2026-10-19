"use client";

import { useCallback, useRef, useState } from "react";
import { messageOf } from "./account-error";

/** Lance une action async une seule fois à la fois, et garde son message d'erreur. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      running.current = false;
      setPending(false);
    }
  }, []);
  return { pending, error, setError, run };
}
