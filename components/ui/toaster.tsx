"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "destructive" | "default";

type ToastInput = {
  message: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & {
  id: number;
};

const TOAST_EVENT = "bwd:toast";
const TOAST_DURATION_MS = 4500;

export function showToast(toast: ToastInput) {
  if (typeof window === "undefined" || !toast.message) {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastInput>(TOAST_EVENT, { detail: toast }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastInput>).detail;

      if (!detail?.message) {
        return;
      }

      const id = Date.now() + Math.random();
      const nextToast: ToastItem = { id, variant: "default", ...detail };
      setToasts((current) => [...current, nextToast].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, TOAST_DURATION_MS);
    }

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-3 bottom-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon =
    toast.variant === "success" ? CheckCircle2 : toast.variant === "destructive" ? XCircle : Info;

  return (
    <div
      className={cn(
        "group pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-background/95 p-4 text-sm shadow-xl shadow-slate-950/10 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        "animate-in slide-in-from-bottom-3 fade-in-0 sm:slide-in-from-right-3",
        toast.variant === "success" && "border-emerald-200 bg-emerald-50/95 text-emerald-950",
        toast.variant === "destructive" && "border-red-200 bg-red-50/95 text-red-950",
        toast.variant === "default" && "border-border text-foreground"
      )}
      role="status"
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          toast.variant === "success" && "text-emerald-600",
          toast.variant === "destructive" && "text-red-600",
          toast.variant === "default" && "text-primary"
        )}
      />
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-current/60 transition hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/30"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
