"use client";

import { IconButton } from "@/components/ui/icon-button";
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { OPERATIONS_BY_ID } from "@/lib/editor/operations";
import type { Step } from "./useEditorState";

/** The applied steps, in order. The numbers carry the order they render in. */
export function StepsList({
  steps,
  selectedUid,
  errors,
  onSelect,
  onMove,
  onRemove,
  onReset,
}: {
  steps: Step[];
  selectedUid: string | null;
  errors: Record<string, string>;
  onSelect: (uid: string) => void;
  onMove: (uid: string, by: -1 | 1) => void;
  onRemove: (uid: string) => void;
  onReset: () => void;
}) {
  return (
    <section aria-label="Applied steps" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Steps</h3>
        {steps.length > 0 && (
          <button type="button" onClick={onReset} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
            Reset all
          </button>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="text-sm text-subtle">Pick a tool to add your first step.</p>
      ) : (
        <ol className="border-t border-line-strong">
          {steps.map((step, i) => {
            const op = OPERATIONS_BY_ID[step.opId];
            const selected = step.uid === selectedUid;
            return (
              <li
                key={step.uid}
                className={cn(
                  "flex items-center gap-1 border-b border-line-strong",
                  selected && "bg-raised",
                )}
              >
                <button
                  type="button"
                  aria-current={selected ? "step" : undefined}
                  onClick={() => onSelect(step.uid)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-2 text-left"
                >
                  <span className="w-5 font-mono text-xs text-subtle tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("truncate text-sm", errors[step.uid] && "text-danger")}>
                    {op?.label ?? step.opId}
                    {errors[step.uid] && <span className="sr-only"> (needs attention)</span>}
                  </span>
                </button>
                <IconButton label={`Move ${op?.label} earlier`} onClick={() => onMove(step.uid, -1)} disabled={i === 0} className="size-8">
                  <ChevronUpIcon width={16} height={16} />
                </IconButton>
                <IconButton label={`Move ${op?.label} later`} onClick={() => onMove(step.uid, 1)} disabled={i === steps.length - 1} className="size-8">
                  <ChevronDownIcon width={16} height={16} />
                </IconButton>
                <IconButton label={`Remove ${op?.label}`} onClick={() => onRemove(step.uid)} className="size-8">
                  <CloseIcon width={14} height={14} />
                </IconButton>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
