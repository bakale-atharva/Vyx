/**
 * Form fields for a tool's settings, derived from its zod schema (via JSON
 * Schema) so the panel never drifts from what the server validates. A few
 * field names get purpose-built controls (prompt, colours, position, overlay
 * image).
 */
import { z } from "zod";
import type { AnyOperation } from "./operations";

export type Field =
  | { name: string; label: string; required: boolean; kind: "slider"; min: number; max: number }
  | { name: string; label: string; required: boolean; kind: "number"; min?: number; max?: number }
  | { name: string; label: string; required: boolean; kind: "numberOrMax"; min: number; max: number }
  | { name: string; label: string; required: boolean; kind: "select"; options: { value: string; label: string }[] }
  | { name: string; label: string; required: boolean; kind: "multiSelect"; options: { value: string; label: string }[] }
  | { name: string; label: string; required: boolean; kind: "toggle" }
  | { name: string; label: string; required: boolean; kind: "text" | "prompt" | "color" | "position" | "asset" };

type JsonProp = {
  type?: string;
  enum?: string[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  items?: JsonProp;
  anyOf?: JsonProp[];
};

/** Ranges at or under this width become sliders; wider ones number inputs. */
const SLIDER_MAX_SPAN = 400;

const LABELS: Record<string, string> = {
  fontSize: "Font size",
  assetId: "Image",
  maxChars: "Characters per line",
  highlightWords: "Highlight words",
};

const OPTION_LABELS: Record<string, string> = {
  maintain_ratio: "Keep ratio",
  at_max: "Fit inside",
  force: "Stretch",
  pad_resize: "Pad",
  h: "Horizontal",
  v: "Vertical",
  h_v: "Both",
  auto: "Main subject",
  face: "Faces",
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
  avif: "AVIF",
  mp4: "MP4",
  webm: "WebM",
  fr: "French",
  de: "German",
  es: "Spanish",
  hi: "Hindi",
};

function humanize(name: string) {
  if (LABELS[name]) return LABELS[name];
  const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function optionLabel(value: string) {
  if (OPTION_LABELS[value]) return OPTION_LABELS[value];
  if (/^\d+-\d+$/.test(value)) return value.replace("-", ":"); // ratios
  if (/^\d+$/.test(value)) return `${value}p`; // resolutions
  return humanize(value);
}

const cache = new Map<string, Field[]>();

export function fieldsFor(op: AnyOperation): Field[] {
  const hit = cache.get(op.id);
  if (hit) return hit;

  const schema = z.toJSONSchema(op.params, { unrepresentable: "any" }) as {
    properties?: Record<string, JsonProp>;
    required?: string[];
  };
  const required = new Set(schema.required ?? []);
  const fields: Field[] = [];

  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const base = { name, label: humanize(name), required: required.has(name) };

    if (name === "prompt") fields.push({ ...base, kind: "prompt" });
    else if (name === "color" || name === "background") fields.push({ ...base, kind: "color" });
    else if (name === "position") fields.push({ ...base, kind: "position" });
    else if (name === "assetId") fields.push({ ...base, kind: "asset" });
    else if (prop.anyOf) {
      const num = prop.anyOf.find((p) => p.type === "integer" || p.type === "number");
      fields.push({ ...base, kind: "numberOrMax", min: num?.minimum ?? 0, max: num?.maximum ?? 100 });
    } else if (prop.enum) {
      fields.push({ ...base, kind: "select", options: prop.enum.map((v) => ({ value: v, label: optionLabel(v) })) });
    } else if (prop.type === "array" && prop.items?.enum) {
      fields.push({
        ...base,
        kind: "multiSelect",
        options: prop.items.enum.map((v) => ({ value: v, label: optionLabel(v) })),
      });
    } else if (prop.type === "boolean") fields.push({ ...base, kind: "toggle" });
    else if (prop.type === "integer" || prop.type === "number") {
      const { minimum: min, maximum: max } = prop;
      if (base.required && min !== undefined && max !== undefined && max - min <= SLIDER_MAX_SPAN) {
        fields.push({ ...base, kind: "slider", min, max });
      } else {
        fields.push({ ...base, kind: "number", min, max });
      }
    } else fields.push({ ...base, kind: "text" });
  }

  cache.set(op.id, fields);
  return fields;
}
