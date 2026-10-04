"use client";

import type { KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { LockIcon } from "@/components/ui/icons";
import { requiredPlan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";
import type { AnyOperation, OperationGroup } from "@/lib/editor/operations";

export const GROUP_LABEL: Record<OperationGroup, string> = {
  adjust: "Adjust",
  trim: "Trim",
  filters: "Filters",
  audio: "Audio",
  overlays: "Overlays",
  thumbnail: "Thumbnail",
  ai: "AI",
  generative: "Generative",
  streaming: "Streaming",
};

/** Slim ruled strip of tool groups, floating near the canvas foot. */
export function GroupBar({
  groups,
  value,
  onChange,
}: {
  groups: OperationGroup[];
  value: OperationGroup;
  onChange: (group: OperationGroup) => void;
}) {
  // Toolbar pattern: one tab stop (the active group); arrows, Home and End
  // move between groups and select them.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = groups.indexOf(value);
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (index + 1) % groups.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (index - 1 + groups.length) % groups.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? groups.length - 1
              : -1;
    if (next === -1) return;
    e.preventDefault();
    onChange(groups[next]);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Tool groups"
      onKeyDown={onKeyDown}
      className="flex overflow-x-auto border border-line-strong bg-panel/95"
    >
      {groups.map((group) => {
        const active = group === value;
        return (
          <button
            key={group}
            type="button"
            aria-pressed={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(group)}
            className={cn(
              "h-9 shrink-0 cursor-pointer border-r border-line-strong px-4 text-sm font-medium last:border-r-0",
              active ? "bg-fg text-accent-fg" : "text-muted hover:bg-raised hover:text-fg",
            )}
          >
            {GROUP_LABEL[group] ?? group}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The active group's tools as ruled rows: solid for tools the plan includes,
 * dashed with a lock and a Pro/Ultra mark for the rest (clicking those opens
 * the upgrade dialog).
 */
export function ToolList({
  tools,
  isUnlocked,
  onPick,
  onLocked,
}: {
  tools: AnyOperation[];
  isUnlocked: (op: AnyOperation) => boolean;
  onPick: (op: AnyOperation) => void;
  onLocked: (op: AnyOperation) => void;
}) {
  return (
    <ul className="border-t border-line-strong">
      {tools.map((op) => {
        const unlocked = isUnlocked(op);
        const plan = requiredPlan(op.feature);
        return (
          <li key={op.id}>
            <button
              type="button"
              onClick={() => (unlocked ? onPick(op) : onLocked(op))}
              aria-label={unlocked ? `Add ${op.label}` : `${op.label}, needs ${plan}`}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-left hover:bg-raised",
                unlocked ? "border-line-strong" : "border-dashed border-line-strong",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-sm", unlocked ? "text-fg" : "text-muted")}>
                  {op.label}
                </span>
                <span className="truncate text-xs text-subtle">{op.description}</span>
              </span>
              {!unlocked && (
                <>
                  <LockIcon width={14} height={14} className="shrink-0 text-subtle" />
                  <Badge tone={plan === "ultra" ? "ultra" : "pro"}>{plan}</Badge>
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
