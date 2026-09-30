import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(
          "h-10 rounded-md border bg-surface px-3 text-sm text-fg placeholder:text-subtle disabled:opacity-50",
          error ? "border-danger" : "border-line-strong hover:border-subtle",
          className,
        )}
        {...props}
      />
      {note && (
        <p
          id={noteId}
          className={cn("text-xs", error ? "text-danger" : "text-subtle")}
        >
          {note}
        </p>
      )}
    </div>
  );
}
