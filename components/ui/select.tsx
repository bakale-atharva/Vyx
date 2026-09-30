import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "./icons";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-10 w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-surface pr-9 pl-3 text-sm text-fg hover:border-subtle disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          width={16}
          height={16}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-subtle"
        />
      </div>
    </div>
  );
}
