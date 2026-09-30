import { Badge } from "@/components/ui/badge";
import { LockIcon } from "@/components/ui/icons";
import { PLAN_FEATURES, requiredPlan } from "@/lib/billing/plans";
import { OPERATIONS_BY_ID } from "@/lib/editor/operations";
import { cn } from "@/lib/cn";
import { ControlStrip } from "./ControlStrip";

const SHOWN = [
  "resize",
  "crop",
  "grayscale",
  "text",
  "remove_bg",
  "upscale",
  "change_bg",
  "ai_edit",
] as const;

/**
 * The tools legend as a proof sheet: built from the real registry, so plan
 * marks can never drift from what the studio gates. Rule form carries state:
 * a solid rule for tools you have, a dashed rule for tools a plan unlocks.
 */
export function ToolPanelPreview() {
  const free = new Set(PLAN_FEATURES.free);
  return (
    <figure
      aria-label="Sample of the image editor tools list"
      className="crop-marks mx-auto w-full max-w-md"
    >
      <div className="border border-line-strong bg-panel">
        <div className="flex items-center justify-between border-b border-line-strong px-4 py-3">
          <span className="text-sm font-semibold">Tools</span>
          <span className="font-mono text-xs text-subtle">image editor</span>
        </div>
        <ul>
          {SHOWN.map((id) => {
            const op = OPERATIONS_BY_ID[id];
            if (!op) return null;
            const unlocked = free.has(op.feature);
            const plan = requiredPlan(op.feature);
            return (
              <li
                key={id}
                className={cn(
                  "flex items-center gap-3 border-b px-4 py-3 last:border-b-0",
                  unlocked
                    ? "border-line-strong"
                    : "border-dashed border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "flex-1 text-sm",
                    unlocked ? "text-fg" : "text-muted",
                  )}
                >
                  {op.label}
                </span>
                {unlocked ? (
                  <Badge tone="neutral">Free</Badge>
                ) : (
                  <>
                    <LockIcon
                      width={14}
                      height={14}
                      className="text-subtle"
                      aria-label="Locked"
                      role="img"
                    />
                    <Badge tone={plan === "ultra" ? "ultra" : "pro"}>
                      {plan}
                    </Badge>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <ControlStrip className="mt-3" />
    </figure>
  );
}
