"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./icons";

type ToastTone = "info" | "success" | "error";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const DURATION_MS = 5000;

const toneStyles: Record<ToastTone, { icon: ReactNode; ring: string }> = {
  info: { icon: <InfoIcon />, ring: "text-muted" },
  success: { icon: <CheckIcon />, ring: "text-accent" },
  error: { icon: <AlertIcon />, ring: "text-danger" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setItems((current) => [...current, { ...input, id }]);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const tone = item.tone ?? "info";

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className={cn(
        "rise pointer-events-auto flex items-start gap-3 rounded-lg border border-line-strong bg-raised p-4 shadow-[0_12px_32px_-8px_oklch(0_0_0/0.6)]",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", toneStyles[tone].ring)}>
        {toneStyles[tone].icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{item.title}</p>
        {item.description && (
          <p className="text-sm text-muted">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(item.id)}
        className="-mt-1 -mr-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle hover:bg-line hover:text-fg"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
