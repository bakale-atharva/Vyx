"use client";

import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, type Dispatch, type ReactNode } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CompareIcon,
  DownloadIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { requiredPlan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";
import type { AnyOperation } from "@/lib/editor/operations";

/** Shared top bar for the image and video editors. */
export function EditorTopBar({
  name,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  compare,
  onDownload,
  downloading,
  downloadDisabled,
  onSave,
  saving,
  saveDisabled,
  saveHint,
  pendingSaves = 0,
}: {
  name: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Omit to hide the compare toggle. */
  compare?: { active: boolean; disabled: boolean; onToggle: () => void };
  onDownload: () => void;
  downloading: boolean;
  downloadDisabled: boolean;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
  /** Why saving is unavailable, shown as the button's tooltip. */
  saveHint?: string;
  /** Saved copies the server is still rendering. */
  pendingSaves?: number;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line-strong pb-4">
      <Link href="/studio" className={buttonStyles("ghost", "sm", "px-2")} aria-label="Back to gallery">
        <ArrowLeftIcon width={18} height={18} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold" title={name}>
        {name}
      </h1>
      <div className="flex flex-wrap items-center gap-1">
        <span role="status" className="px-2 font-mono text-xs text-muted tabular-nums">
          {pendingSaves > 0 && `Saving ${pendingSaves} ${pendingSaves === 1 ? "copy" : "copies"}…`}
        </span>
        <IconButton label="Undo" onClick={onUndo} disabled={!canUndo}>
          <UndoIcon />
        </IconButton>
        <IconButton label="Redo" onClick={onRedo} disabled={!canRedo}>
          <RedoIcon />
        </IconButton>
        {compare && (
          <IconButton
            label={compare.active ? "Hide comparison" : "Compare with original"}
            aria-pressed={compare.active}
            onClick={compare.onToggle}
            disabled={compare.disabled}
            className={cn(compare.active && "bg-raised text-fg")}
          >
            <CompareIcon />
          </IconButton>
        )}
        <Button variant="secondary" onClick={onDownload} loading={downloading} disabled={downloadDisabled}>
          <DownloadIcon width={18} height={18} />
          Download
        </Button>
        <Button variant="primary" onClick={onSave} loading={saving} disabled={saveDisabled} title={saveHint}>
          Save as new
        </Button>
      </div>
    </header>
  );
}

/** Right-hand tools panel on large screens; a collapsible bottom sheet below lg. */
export function EditorAside({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <aside
      aria-label="Tools"
      className={cn(
        "flex flex-col overflow-y-auto lg:w-[22rem] lg:shrink-0 lg:border-l lg:border-line-strong lg:pl-6",
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-line-strong max-lg:bg-panel max-lg:px-4 max-lg:pb-4",
        open ? "max-lg:max-h-[60dvh]" : "max-lg:max-h-14",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-panel text-sm font-semibold lg:hidden"
      >
        Tools and steps
        {open ? <ChevronDownIcon width={18} height={18} /> : <ChevronUpIcon width={18} height={18} />}
      </button>
      <div className={cn(!open && "max-lg:hidden")}>{children}</div>
    </aside>
  );
}

/** Upgrade dialog for a locked tool (or a locked step found by the server). */
export function LockedToolDialog({
  tool,
  open,
  onClose,
  returnPath,
}: {
  tool: AnyOperation | null;
  open: boolean;
  onClose: () => void;
  /** Where checkout sends the user back to. */
  returnPath: string;
}) {
  const plan = tool ? requiredPlan(tool.feature) : null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="wide"
      title={tool ? `${tool.label} needs ${plan === "ultra" ? "Ultra" : "Pro"}` : "Unlock more tools"}
      description={
        tool
          ? `${tool.description} Upgrade to use it; your plan changes take effect right away.`
          : "Upgrade to use every tool in your recipe."
      }
    >
      <PricingTable newSubscriptionRedirectUrl={`${returnPath}?upgraded=1`} />
    </Dialog>
  );
}

/** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, ignored while typing. */
export function useUndoShortcuts(dispatch: Dispatch<{ type: "undo" } | { type: "redo" }>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
}
