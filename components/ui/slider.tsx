import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  label: string;
  value: number;
  /** Suffix for the readout, e.g. "px" or "%". */
  unit?: string;
}

export function Slider({
  label,
  value,
  unit = "",
  className,
  id,
  ...props
}: SliderProps) {
  const auto = useId();
  const sliderId = id ?? auto;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={sliderId} className="text-sm font-medium text-muted">
          {label}
        </label>
        <output
          htmlFor={sliderId}
          className="font-mono text-xs text-fg tabular-nums"
        >
          {value}
          {unit}
        </output>
      </div>
      <input
        id={sliderId}
        type="range"
        value={value}
        className={cn("h-5 w-full cursor-pointer accent-accent", className)}
        {...props}
      />
    </div>
  );
}
