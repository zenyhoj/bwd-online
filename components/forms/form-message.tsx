"use client";

import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/components/ui/toaster";
import type { ActionState } from "@/types";

type FormMessageProps = {
  state: ActionState;
};

export function FormMessage({ state }: FormMessageProps) {
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastMessageRef.current === state.message) {
      return;
    }

    lastMessageRef.current = state.message;
    showToast({
      message: state.message,
      variant: state.success ? "success" : "destructive"
    });
  }, [state.message, state.success]);

  if (!state.message) {
    return null;
  }

  return (
    <Alert variant={state.success ? "success" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
