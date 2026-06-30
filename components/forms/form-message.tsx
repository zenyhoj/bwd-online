"use client";

import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/components/ui/toaster";
import type { ActionState } from "@/types";

type FormMessageProps = {
  state: ActionState;
  autoHideSuccessMs?: number;
};

export function FormMessage({ state, autoHideSuccessMs }: FormMessageProps) {
  const lastMessageRef = useRef<string | null>(null);
  const [isVisible, setIsVisible] = useState(Boolean(state.message));

  useEffect(() => {
    if (!state.message || lastMessageRef.current === state.message) {
      return;
    }

    lastMessageRef.current = state.message;
    setIsVisible(true);
    showToast({
      message: state.message,
      variant: state.success ? "success" : "destructive"
    });
  }, [state.message, state.success]);

  useEffect(() => {
    if (!state.success || !state.message || !autoHideSuccessMs) {
      return;
    }

    const timeout = window.setTimeout(() => setIsVisible(false), autoHideSuccessMs);
    return () => window.clearTimeout(timeout);
  }, [autoHideSuccessMs, state.message, state.success]);

  if (!state.message || !isVisible) {
    return null;
  }

  return (
    <Alert variant={state.success ? "success" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
