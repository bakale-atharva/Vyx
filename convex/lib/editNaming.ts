import type { ParsedStep } from "../../lib/editor/recipe";
import type { AssetKind } from "./validateUpload";

const IMAGE_FORMATS = ["jpg", "png", "webp", "avif", "gif"] as const;
const VIDEO_FORMATS = ["mp4", "webm"] as const;
export type OutputFormat =
  | (typeof IMAGE_FORMATS)[number]
  | (typeof VIDEO_FORMATS)[number];

function extensionOf(name: string) {
  const ext = name.match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

/**
 * The format a saved edit will have, or undefined for a video thumbnail (its
 * URL already ends in .jpg). ImageKit picks a format itself when none is given
 * (it returned JPEG for a PNG source), so the saved edit always pins one:
 * the format tool's choice, else the source's own, else a safe default.
 */
export function resolveOutputFormat(opts: {
  originalName: string;
  steps: ParsedStep[];
  outputKind: AssetKind;
}): OutputFormat | undefined {
  const { originalName, steps, outputKind } = opts;
  if (steps.some((s) => s.opId === "thumbnail")) return undefined;

  const chosen = steps
    .filter((s) => s.opId === "format" || s.opId === "v_format")
    .map((s) => (s.params as { format?: string }).format)
    .pop();
  const formats: readonly OutputFormat[] =
    outputKind === "image" ? IMAGE_FORMATS : VIDEO_FORMATS;
  const fromTool = formats.find((f) => f === chosen);
  if (fromTool) return fromTool;

  // A cut-out has transparency, which JPEG can't hold.
  if (steps.some((s) => s.opId === "remove_bg")) return "png";

  const ext = extensionOf(originalName);
  return (
    formats.find((f) => f === ext) ?? (outputKind === "image" ? "jpg" : "mp4")
  );
}

export function hasFormatStep(steps: ParsedStep[]) {
  return steps.some((s) => s.opId === "format" || s.opId === "v_format");
}

/** File name for the new asset: a sanitized user name (or "<original>-edited"). */
export function editFileName(opts: {
  originalName: string;
  name?: string;
  format: OutputFormat | undefined;
}): string {
  const { originalName, name, format } = opts;
  const base = originalName.replace(/\.[A-Za-z0-9]+$/, "");
  const cleaned = (name ?? `${base}-edited`)
    .replace(/\.[A-Za-z0-9]{2,5}$/, "")
    .replace(/[^A-Za-z0-9 _.-]/g, "")
    .trim()
    .slice(0, 100);
  return `${cleaned || "edited"}.${format ?? "jpg"}`;
}
