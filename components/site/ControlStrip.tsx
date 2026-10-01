import { PLANS, PLAN_FEATURES, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";

const CELL: Record<Plan, { name: string; fill: string; text: string }> = {
  free: { name: "Free", fill: "bg-ink", text: "text-fg" },
  pro: { name: "Pro", fill: "bg-cyan", text: "text-ink" },
  ultra: { name: "Ultra", fill: "bg-magenta", text: "text-ink" },
};

/**
 * The plan tiers as a press control strip: one ink cell per plan, with the real
 * tool count each plan unlocks in a fixed tabular slot.
 */
export function ControlStrip({
  current,
  className,
}: {
  /** Highlights one cell (the user's plan). Omit on public pages. */
  current?: Plan | null;
  className?: string;
}) {
  return (
    <ul
      aria-label="Plans and the number of tools each unlocks"
      className={cn("grid grid-cols-3", className)}
    >
      {PLANS.map((plan) => {
        const cell = CELL[plan];
        const active = current === plan;
        return (
          <li
            key={plan}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex min-w-0 flex-col justify-center gap-0.5 px-2.5 py-1.5 font-mono text-xs leading-tight font-medium uppercase",
              cell.fill,
              cell.text,
              plan === "free" && "ring-1 ring-line-strong ring-inset",
              current && !active && "opacity-45",
            )}
          >
            <span className="truncate">{cell.name}</span>
            <span className="tabular-nums opacity-80">
              {String(PLAN_FEATURES[plan].length).padStart(2, "0")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
