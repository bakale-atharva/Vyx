"use client";

import { usePaginatedQuery } from "convex/react";
import { useId, useMemo } from "react";
import { useThumbnails } from "@/components/gallery/useThumbnails";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";
import { fieldsFor, type Field } from "@/lib/editor/fields";
import type { AnyOperation } from "@/lib/editor/operations";

type Params = Record<string, unknown>;

const POSITIONS = [
  "top_left", "top", "top_right",
  "left", "center", "right",
  "bottom_left", "bottom", "bottom_right",
] as const;

const labelClass = "text-sm font-medium text-muted";
const inputClass =
  "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-subtle hover:border-subtle";

function NumberField({ field, value, onChange }: { field: Extract<Field, { kind: "number" }>; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {!field.required && <span className="font-normal text-subtle"> (optional)</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        value={typeof value === "number" ? value : ""}
        placeholder={field.required ? undefined : "Auto"}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={cn(inputClass, "font-mono tabular-nums")}
      />
    </div>
  );
}

function ColorField({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const hex = typeof value === "string" ? value.slice(0, 6) : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {!field.required && <span className="font-normal text-subtle"> (optional)</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={`#${hex ?? "000000"}`}
          onChange={(e) => onChange(e.target.value.slice(1).toUpperCase())}
          className="h-10 w-12 cursor-pointer border border-line-strong bg-surface p-1"
        />
        <span className="font-mono text-sm tabular-nums">{hex ? `#${hex}` : "None"}</span>
        {!field.required && hex && (
          <button type="button" onClick={() => onChange(undefined)} className="ml-auto text-xs text-muted underline underline-offset-4 hover:text-fg">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function PositionField({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={cn(labelClass, "mb-1.5")}>{field.label}</legend>
      <div className="grid w-32 grid-cols-3 gap-1">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            aria-pressed={value === pos}
            aria-label={pos.replace("_", " ")}
            onClick={() => onChange(pos)}
            className={cn(
              "aspect-square cursor-pointer border",
              value === pos ? "border-fg bg-fg" : "border-line-strong hover:border-subtle",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AssetField({ field, value, onChange, excludeId }: { field: Field; value: unknown; onChange: (v: unknown) => void; excludeId: string }) {
  const { results, status } = usePaginatedQuery(api.assets.list, { kind: "image" }, { initialNumItems: 24 });
  const images = useMemo(() => results.filter((a) => a._id !== excludeId), [results, excludeId]);
  const ids = useMemo(() => images.map((a) => a._id), [images]);
  const thumbs = useThumbnails(ids, "strip");
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={cn(labelClass, "mb-1.5")}>{field.label} from your gallery</legend>
      {status === "LoadingFirstPage" ? (
        <p className="text-sm text-subtle">Loading your images…</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-subtle">Upload another image to use it as a watermark.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img) => {
            const url = thumbs.get(img._id);
            return (
              <button
                key={img._id}
                type="button"
                aria-pressed={value === img._id}
                aria-label={img.name}
                onClick={() => onChange(img._id)}
                className={cn(
                  "aspect-square cursor-pointer overflow-hidden bg-surface",
                  value === img._id ? "outline-2 outline-offset-2 outline-fg" : "border border-line-strong",
                )}
              >
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="size-full object-contain" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function FieldControl({ field, value, onChange, assetId }: { field: Field; value: unknown; onChange: (v: unknown) => void; assetId: string }) {
  switch (field.kind) {
    case "slider":
      return (
        <Slider
          label={field.label}
          min={field.min}
          max={field.max}
          value={typeof value === "number" ? value : field.min}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "number":
      return <NumberField field={field} value={value} onChange={onChange} />;
    case "numberOrMax":
      return (
        <div className="flex flex-col gap-2">
          {value !== "max" && (
            <Slider
              label={field.label}
              min={field.min}
              max={field.max}
              value={typeof value === "number" ? value : field.min}
              onChange={(e) => onChange(Number(e.target.value))}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={value === "max"}
              onChange={(e) => onChange(e.target.checked ? "max" : field.min)}
              className="size-4 accent-fg"
            />
            Make it a circle
          </label>
        </div>
      );
    case "select":
      return (
        <Select
          label={field.label}
          options={field.options}
          value={typeof value === "string" ? value : field.options[0]?.value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "multiSelect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className={cn(labelClass, "mb-1.5")}>{field.label}</legend>
          <div className="flex flex-wrap gap-2">
            {field.options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                  className={cn(
                    "h-8 cursor-pointer border px-3 text-sm",
                    on ? "border-fg bg-fg text-accent-fg" : "border-line-strong text-muted hover:text-fg",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case "toggle":
      return (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-fg" />
          {field.label}
        </label>
      );
    case "prompt":
    case "text": {
      const multiline = field.kind === "prompt";
      return (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{field.kind === "prompt" ? "Describe what you want" : field.label}</span>
          {multiline ? (
            <textarea
              rows={3}
              maxLength={300}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. a sunlit beach at golden hour"
              className={cn(inputClass, "h-auto py-2")}
            />
          ) : (
            <input
              type="text"
              maxLength={200}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              className={inputClass}
            />
          )}
        </label>
      );
    }
    case "color":
      return <ColorField field={field} value={value} onChange={onChange} />;
    case "position":
      return <PositionField field={field} value={value} onChange={onChange} />;
    case "asset":
      return <AssetField field={field} value={value} onChange={onChange} excludeId={assetId} />;
  }
}

/** Settings for the selected step, generated from its tool's schema. */
export function ToolSettings({
  op,
  params,
  error,
  assetId,
  onChange,
}: {
  op: AnyOperation;
  params: Params;
  error: string | undefined;
  assetId: string;
  onChange: (params: Params) => void;
}) {
  const fields = fieldsFor(op);
  return (
    <section aria-label={`${op.label} settings`} className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold">{op.label}</h3>
        <p className="text-sm text-subtle">{op.description}</p>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted">No settings. It applies as it is.</p>
      ) : (
        fields.map((field) => (
          <FieldControl
            key={field.name}
            field={field}
            value={params[field.name]}
            assetId={assetId}
            onChange={(v) => {
              const next = { ...params };
              if (v === undefined) delete next[field.name];
              else next[field.name] = v;
              onChange(next);
            }}
          />
        ))
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
