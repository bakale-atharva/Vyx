"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CloseIcon } from "./icons";
import { IconButton } from "./icon-button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Action row, right-aligned. */
  footer?: ReactNode;
  /** "wide" fits embedded content such as Clerk's pricing table. */
  size?: "default" | "wide";
  className?: string;
}

/** Native `<dialog>`: focus trap, Escape and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        size === "wide"
          ? "m-auto max-h-[calc(100dvh-2rem)] w-[min(72rem,calc(100vw-2rem))] overflow-y-auto"
          : "m-auto w-[min(32rem,calc(100vw-2rem))]",
        "rounded-lg border border-line-strong bg-panel p-0 text-fg shadow-[0_24px_64px_-12px_oklch(0_0_0/0.6)]",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted">{description}</p>
            )}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
