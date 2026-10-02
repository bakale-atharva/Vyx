/**
 * The tool registry: single source of truth for the editor UI (tool panel,
 * forms) and server enforcement (which feature each tool needs, how it maps to
 * an ImageKit transformation). Pure TypeScript, no server-only imports.
 */
import type { Transformation } from "@imagekit/nodejs/resources/shared";
import { z } from "zod";
import { FEATURES, type FeatureSlug } from "../billing/plans";

export type OperationKind = "image" | "video";
export type OperationGroup =
  | "adjust"
  | "filters"
  | "overlays"
  | "ai"
  | "generative"
  | "trim"
  | "audio"
  | "thumbnail"
  | "streaming";

/** Data a step needs that isn't in its params (resolved server-side). */
export type OperationContext = {
  /** Convex asset id -> ImageKit file path (leading slash), for overlays. */
  assetPaths: Record<string, string>;
};

export interface Operation<P = unknown> {
  id: string;
  kind: OperationKind;
  group: OperationGroup;
  label: string;
  description: string;
  feature: FeatureSlug;
  params: z.ZodType<P>;
  defaults: P;
  toTransformation(params: P, ctx: OperationContext): Transformation[];
  /** ImageKit may answer 202 while it processes (AI operations, video). */
  async?: boolean;
  output?: "image" | "video" | "audio";
  /** Suffix appended to the file path, e.g. `/ik-thumbnail.jpg`. */
  pathSuffix?: string;
  /** Extra (non-`tr`) query parameters. */
  query?(params: P): Record<string, string>;
  /** Handled by the video player, not by the delivery URL. */
  playerOnly?: boolean;
}

export type AnyOperation = Operation<unknown>;

function defineOp<P>(op: Operation<P>): AnyOperation {
  return op as unknown as AnyOperation;
}

// ---------------------------------------------------------------- shared bits

const dimension = z.number().int().min(1).max(8000);
const hex6 = z.string().regex(/^[0-9A-Fa-f]{6}$/, "6-digit hex, no #");
const hexAlpha = z.string().regex(/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/);
const position = z.enum([
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
]);
const prompt = z.string().trim().min(1).max(300);
const seconds = z.number().min(0).max(36000);
const overlayText = z.string().trim().min(1).max(200);
const assetId = z.string().min(1).max(64);

/**
 * Prompts are always base64 (`prompte-`) so user text can never smuggle extra
 * transformation parameters (`,` or `:`) into the URL.
 */
export function encodePrompt(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `prompte-${encodeURIComponent(btoa(binary))}`;
}

const resizeSchema = z
  .object({
    width: dimension.optional(),
    height: dimension.optional(),
    mode: z.enum(["maintain_ratio", "at_max", "force", "pad_resize"]),
    background: hex6.optional(),
  })
  .refine((p) => p.width !== undefined || p.height !== undefined, {
    message: "Set a width or a height",
  });
type Resize = z.infer<typeof resizeSchema>;

function resizeTransformation(p: Resize): Transformation[] {
  const t: Transformation = { width: p.width, height: p.height };
  if (p.mode === "pad_resize") {
    t.cropMode = "pad_resize";
    if (p.background) t.background = p.background;
  } else {
    t.crop = p.mode;
  }
  return [t];
}

const textOverlaySchema = z.object({
  text: overlayText,
  fontSize: z.number().int().min(8).max(300),
  color: hex6,
  background: hexAlpha.optional(),
  position,
  alpha: z.number().int().min(1).max(9).optional(),
});
type TextOverlay = z.infer<typeof textOverlaySchema>;

function textOverlayTransformation(
  p: TextOverlay,
  timing?: { start?: number; duration?: number },
): Transformation[] {
  return [
    {
      overlay: {
        type: "text",
        text: p.text,
        // Always base64: user text can then never add or alter parameters.
        encoding: "base64",
        position: { focus: position.parse(p.position) },
        ...(timing ? { timing } : {}),
        transformation: [
          {
            fontSize: p.fontSize,
            fontColor: p.color,
            ...(p.background ? { background: p.background } : {}),
            ...(p.alpha ? { alpha: p.alpha } : {}),
          },
        ],
      },
    },
  ];
}

function watermarkTransformation(
  assetIdValue: string,
  width: number,
  pos: z.infer<typeof position>,
  opacity: number | undefined,
  ctx: OperationContext,
  timing?: { start?: number; duration?: number },
): Transformation[] {
  const input = ctx.assetPaths[assetIdValue];
  if (!input) throw new Error(`Overlay asset ${assetIdValue} was not resolved`);
  return [
    {
      overlay: {
        type: "image",
        input,
        position: { focus: pos },
        ...(timing ? { timing } : {}),
        transformation: [{ width, ...(opacity ? { opacity } : {}) }],
      },
    },
  ];
}

// ------------------------------------------------------------------ operations

export const OPERATIONS: readonly AnyOperation[] = [
  // ------------------------------------------------------------------ image
  defineOp({
    id: "resize",
    kind: "image",
    group: "adjust",
    label: "Resize",
    description: "Resize by width and/or height.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: resizeSchema,
    defaults: { width: 800, mode: "maintain_ratio" } as Resize,
    toTransformation: resizeTransformation,
  }),
  defineOp({
    id: "aspect_ratio",
    kind: "image",
    group: "adjust",
    label: "Aspect ratio",
    description: "Crop to a fixed aspect ratio.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({
      ratio: z.enum(["1-1", "4-3", "3-4", "16-9", "9-16", "3-2", "2-3"]),
      width: dimension,
    }),
    defaults: { ratio: "1-1", width: 800 },
    toTransformation: (p) => [{ aspectRatio: p.ratio, width: p.width }],
  }),
  defineOp({
    id: "crop",
    kind: "image",
    group: "adjust",
    label: "Crop",
    description: "Extract a rectangle from the image.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({
      x: z.number().int().min(0).max(20000),
      y: z.number().int().min(0).max(20000),
      width: dimension,
      height: dimension,
    }),
    defaults: { x: 0, y: 0, width: 500, height: 500 },
    toTransformation: (p) => [
      { cropMode: "extract", x: p.x, y: p.y, width: p.width, height: p.height },
    ],
  }),
  defineOp({
    id: "rotate",
    kind: "image",
    group: "adjust",
    label: "Rotate",
    description: "Rotate by a number of degrees.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({ degrees: z.number().int().min(1).max(359) }),
    defaults: { degrees: 90 },
    toTransformation: (p) => [{ rotation: p.degrees }],
  }),
  defineOp({
    id: "flip",
    kind: "image",
    group: "adjust",
    label: "Flip",
    description: "Mirror horizontally or vertically.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({ direction: z.enum(["h", "v", "h_v"]) }),
    defaults: { direction: "h" as const },
    toTransformation: (p) => [{ flip: p.direction }],
  }),
  defineOp({
    id: "format",
    kind: "image",
    group: "adjust",
    label: "Format",
    description: "Convert to JPG, PNG, WebP or AVIF.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({ format: z.enum(["jpg", "png", "webp", "avif"]) }),
    defaults: { format: "webp" as const },
    toTransformation: (p) => [{ format: p.format }],
  }),
  defineOp({
    id: "quality",
    kind: "image",
    group: "adjust",
    label: "Quality",
    description: "Output quality, 1 to 100.",
    feature: FEATURES.IMAGE_BASIC_EDITS,
    params: z.object({ quality: z.number().int().min(1).max(100) }),
    defaults: { quality: 80 },
    toTransformation: (p) => [{ quality: p.quality }],
  }),
  defineOp({
    id: "grayscale",
    kind: "image",
    group: "filters",
    label: "Grayscale",
    description: "Convert to black and white.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ grayscale: true }],
  }),
  defineOp({
    id: "blur",
    kind: "image",
    group: "filters",
    label: "Blur",
    description: "Gaussian blur, 1 to 100.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({ radius: z.number().int().min(1).max(100) }),
    defaults: { radius: 10 },
    toTransformation: (p) => [{ blur: p.radius }],
  }),
  defineOp({
    id: "sharpen",
    kind: "image",
    group: "filters",
    label: "Sharpen",
    description: "Sharpen edges, amount 1 to 99.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({ amount: z.number().int().min(1).max(99).optional() }),
    defaults: {} as { amount?: number },
    toTransformation: (p) => [{ sharpen: p.amount ?? true }],
  }),
  defineOp({
    id: "contrast",
    kind: "image",
    group: "filters",
    label: "Contrast",
    description: "Stretch contrast automatically.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ contrastStretch: true }],
  }),
  defineOp({
    id: "radius",
    kind: "image",
    group: "filters",
    label: "Rounded corners",
    description: "Round the corners, or make a circle.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({
      radius: z.union([z.number().int().min(0).max(500), z.literal("max")]),
    }),
    defaults: { radius: 20 as number | "max" },
    toTransformation: (p) => [{ radius: p.radius }],
  }),
  defineOp({
    id: "border",
    kind: "image",
    group: "filters",
    label: "Border",
    description: "Add a solid border.",
    feature: FEATURES.IMAGE_FILTERS,
    params: z.object({ width: z.number().int().min(1).max(50), color: hex6 }),
    defaults: { width: 5, color: "FFFFFF" },
    toTransformation: (p) => [{ border: `${p.width}_${p.color}` }],
  }),
  defineOp({
    id: "text",
    kind: "image",
    group: "overlays",
    label: "Text",
    description: "Place text on the image.",
    feature: FEATURES.IMAGE_TEXT_OVERLAY,
    params: textOverlaySchema,
    defaults: {
      text: "Your text",
      fontSize: 48,
      color: "FFFFFF",
      position: "bottom" as const,
    } as TextOverlay,
    toTransformation: (p) => textOverlayTransformation(p),
  }),
  defineOp({
    id: "watermark",
    kind: "image",
    group: "overlays",
    label: "Watermark",
    description: "Overlay an image from your gallery.",
    feature: FEATURES.IMAGE_WATERMARK,
    params: z.object({
      assetId,
      width: dimension,
      position,
      opacity: z.number().int().min(1).max(100).optional(),
    }),
    defaults: {
      assetId: "",
      width: 150,
      position: "bottom_right" as const,
    } as {
      assetId: string;
      width: number;
      position: z.infer<typeof position>;
      opacity?: number;
    },
    toTransformation: (p, ctx) =>
      watermarkTransformation(p.assetId, p.width, p.position, p.opacity, ctx),
  }),
  defineOp({
    id: "smart_crop",
    kind: "image",
    group: "ai",
    label: "Smart crop",
    description: "Crop around the main subject or faces.",
    feature: FEATURES.IMAGE_SMART_CROP,
    params: z.object({
      width: dimension,
      height: dimension,
      focus: z.enum(["auto", "face"]),
    }),
    defaults: { width: 500, height: 500, focus: "auto" as const },
    toTransformation: (p) => [
      { width: p.width, height: p.height, focus: p.focus },
    ],
  }),
  defineOp({
    id: "remove_bg",
    kind: "image",
    group: "ai",
    label: "Remove background",
    description: "AI cutout with a transparent background.",
    feature: FEATURES.IMAGE_BG_REMOVE,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ aiRemoveBackground: true }],
    async: true,
  }),
  defineOp({
    id: "drop_shadow",
    kind: "image",
    group: "ai",
    label: "Drop shadow",
    description: "AI shadow beneath a cut-out subject.",
    feature: FEATURES.IMAGE_DROP_SHADOW,
    params: z.object({
      azimuth: z.number().int().min(0).max(360).optional(),
      elevation: z.number().int().min(0).max(100).optional(),
      saturation: z.number().int().min(0).max(100).optional(),
    }),
    defaults: {} as {
      azimuth?: number;
      elevation?: number;
      saturation?: number;
    },
    toTransformation: (p) => {
      const parts = [
        p.azimuth !== undefined ? `az-${p.azimuth}` : null,
        p.elevation !== undefined ? `el-${p.elevation}` : null,
        p.saturation !== undefined ? `st-${p.saturation}` : null,
      ].filter(Boolean);
      return [{ aiDropShadow: parts.length ? parts.join("_") : true }];
    },
    async: true,
  }),
  defineOp({
    id: "upscale",
    kind: "image",
    group: "ai",
    label: "Upscale",
    description: "Increase resolution with AI.",
    feature: FEATURES.IMAGE_UPSCALE,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ aiUpscale: true }],
    async: true,
  }),
  defineOp({
    id: "retouch",
    kind: "image",
    group: "ai",
    label: "Retouch",
    description: "One-click AI enhancement.",
    feature: FEATURES.IMAGE_RETOUCH,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ aiRetouch: true }],
    async: true,
  }),
  defineOp({
    id: "change_bg",
    kind: "image",
    group: "generative",
    label: "Change background (AI)",
    description: "Replace the background from a text prompt.",
    feature: FEATURES.IMAGE_BG_CHANGE,
    params: z.object({ prompt }),
    defaults: { prompt: "" },
    toTransformation: (p) => [{ aiChangeBackground: encodePrompt(p.prompt) }],
    async: true,
  }),
  defineOp({
    id: "gen_fill",
    kind: "image",
    group: "generative",
    label: "Generative fill",
    description: "Extend the image to a new size, filled by AI.",
    feature: FEATURES.IMAGE_GEN_FILL,
    params: z.object({ width: dimension, height: dimension, prompt: prompt.optional() }),
    defaults: { width: 1200, height: 800 } as {
      width: number;
      height: number;
      prompt?: string;
    },
    toTransformation: (p) => [
      {
        raw: `bg-genfill${p.prompt ? `-${encodePrompt(p.prompt)}` : ""},w-${p.width},h-${p.height},cm-pad_resize`,
      },
    ],
    async: true,
  }),
  defineOp({
    id: "ai_edit",
    kind: "image",
    group: "generative",
    label: "Edit with a prompt",
    description: "Describe the change you want.",
    feature: FEATURES.IMAGE_AI_EDIT,
    params: z.object({ prompt }),
    defaults: { prompt: "" },
    toTransformation: (p) => [{ aiEdit: encodePrompt(p.prompt) }],
    async: true,
  }),
  defineOp({
    id: "variation",
    kind: "image",
    group: "generative",
    label: "Variation",
    description: "Generate a fresh variation of the image.",
    feature: FEATURES.IMAGE_VARIATIONS,
    params: z.object({ seed: z.number().int().min(0).max(9999) }),
    defaults: { seed: 1 },
    toTransformation: () => [{ aiVariation: true }],
    query: (p) => ({ v: String(p.seed) }),
    async: true,
  }),

  // ------------------------------------------------------------------ video
  defineOp({
    id: "v_resize",
    kind: "video",
    group: "adjust",
    label: "Resize",
    description: "Resize by width and/or height.",
    feature: FEATURES.VIDEO_BASIC_EDITS,
    params: resizeSchema,
    defaults: { width: 1280, mode: "maintain_ratio" } as Resize,
    toTransformation: resizeTransformation,
    async: true,
  }),
  defineOp({
    id: "v_rotate",
    kind: "video",
    group: "adjust",
    label: "Rotate",
    description: "Rotate by a number of degrees.",
    feature: FEATURES.VIDEO_BASIC_EDITS,
    params: z.object({ degrees: z.number().int().min(1).max(359) }),
    defaults: { degrees: 90 },
    toTransformation: (p) => [{ rotation: p.degrees }],
    async: true,
  }),
  defineOp({
    id: "v_format",
    kind: "video",
    group: "adjust",
    label: "Format",
    description: "Convert between MP4 and WebM.",
    feature: FEATURES.VIDEO_BASIC_EDITS,
    params: z.object({ format: z.enum(["mp4", "webm"]) }),
    defaults: { format: "mp4" as const },
    toTransformation: (p) => [{ format: p.format }],
    async: true,
  }),
  defineOp({
    id: "v_quality",
    kind: "video",
    group: "adjust",
    label: "Quality",
    description: "Output quality, 1 to 100.",
    feature: FEATURES.VIDEO_BASIC_EDITS,
    params: z.object({ quality: z.number().int().min(1).max(100) }),
    defaults: { quality: 80 },
    toTransformation: (p) => [{ quality: p.quality }],
    async: true,
  }),
  defineOp({
    id: "trim",
    kind: "video",
    group: "trim",
    label: "Trim",
    description: "Keep a clip by start time and end time or duration.",
    feature: FEATURES.VIDEO_TRIM,
    params: z
      .object({
        start: seconds,
        end: seconds.optional(),
        duration: seconds.optional(),
      })
      .refine((p) => !(p.end !== undefined && p.duration !== undefined), {
        message: "Set an end time or a duration, not both",
      })
      .refine((p) => p.end === undefined || p.end > p.start, {
        message: "End must be after start",
      }),
    defaults: { start: 0, end: 10 } as {
      start: number;
      end?: number;
      duration?: number;
    },
    toTransformation: (p) => [
      {
        startOffset: p.start,
        ...(p.end !== undefined ? { endOffset: p.end } : {}),
        ...(p.duration !== undefined ? { duration: p.duration } : {}),
      },
    ],
    async: true,
  }),
  defineOp({
    id: "thumbnail",
    kind: "video",
    group: "thumbnail",
    label: "Thumbnail",
    description: "Extract a still frame.",
    feature: FEATURES.VIDEO_THUMBNAIL,
    params: z.object({ time: seconds }),
    defaults: { time: 0 },
    toTransformation: (p) => [{ startOffset: p.time }],
    pathSuffix: "/ik-thumbnail.jpg",
    output: "image",
  }),
  defineOp({
    id: "mute",
    kind: "video",
    group: "audio",
    label: "Mute",
    description: "Remove the audio track.",
    feature: FEATURES.VIDEO_MUTE,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ audioCodec: "none" }],
    async: true,
  }),
  defineOp({
    id: "extract_audio",
    kind: "video",
    group: "audio",
    label: "Extract audio",
    description: "Keep only the soundtrack (download only).",
    feature: FEATURES.VIDEO_AUDIO_EXTRACT,
    params: z.object({}),
    defaults: {},
    toTransformation: () => [{ videoCodec: "none" }],
    output: "audio",
    async: true,
  }),
  defineOp({
    id: "v_text",
    kind: "video",
    group: "overlays",
    label: "Text",
    description: "Add a title or caption with timing.",
    feature: FEATURES.VIDEO_TEXT_OVERLAY,
    params: textOverlaySchema.extend({
      start: seconds.optional(),
      duration: seconds.optional(),
    }),
    defaults: {
      text: "Your text",
      fontSize: 48,
      color: "FFFFFF",
      position: "bottom" as const,
    } as TextOverlay & { start?: number; duration?: number },
    toTransformation: (p) =>
      textOverlayTransformation(p, {
        ...(p.start !== undefined ? { start: p.start } : {}),
        ...(p.duration !== undefined ? { duration: p.duration } : {}),
      }),
    async: true,
  }),
  defineOp({
    id: "v_watermark",
    kind: "video",
    group: "overlays",
    label: "Watermark",
    description: "Overlay an image from your gallery.",
    feature: FEATURES.VIDEO_WATERMARK,
    params: z.object({
      assetId,
      width: dimension,
      position,
      opacity: z.number().int().min(1).max(100).optional(),
      start: seconds.optional(),
      duration: seconds.optional(),
    }),
    defaults: {
      assetId: "",
      width: 150,
      position: "bottom_right" as const,
    } as {
      assetId: string;
      width: number;
      position: z.infer<typeof position>;
      opacity?: number;
      start?: number;
      duration?: number;
    },
    toTransformation: (p, ctx) =>
      watermarkTransformation(p.assetId, p.width, p.position, p.opacity, ctx, {
        ...(p.start !== undefined ? { start: p.start } : {}),
        ...(p.duration !== undefined ? { duration: p.duration } : {}),
      }),
    async: true,
  }),
  defineOp({
    id: "ai_subtitles",
    kind: "video",
    group: "ai",
    label: "AI subtitles",
    description: "Transcribe speech into subtitles and chapters.",
    feature: FEATURES.VIDEO_AI_SUBTITLES,
    params: z.object({
      maxChars: z.number().int().min(20).max(120),
      highlightWords: z.boolean(),
    }),
    defaults: { maxChars: 60, highlightWords: true },
    toTransformation: () => [],
    playerOnly: true,
  }),
  defineOp({
    id: "subtitle_translate",
    kind: "video",
    group: "ai",
    label: "Translate subtitles",
    description: "Translate the generated subtitles.",
    feature: FEATURES.VIDEO_SUBTITLE_TRANSLATE,
    params: z.object({
      languages: z.array(z.enum(["fr", "de", "es", "hi"])).min(1).max(4),
    }),
    defaults: { languages: ["es"] as ("fr" | "de" | "es" | "hi")[] },
    toTransformation: () => [],
    playerOnly: true,
  }),
  defineOp({
    id: "streaming",
    kind: "video",
    group: "streaming",
    label: "Adaptive streaming",
    description: "Deliver as an HLS adaptive bitrate stream.",
    feature: FEATURES.VIDEO_STREAMING,
    params: z.object({
      resolutions: z
        .array(z.enum(["240", "360", "480", "720", "1080"]))
        .min(1)
        .max(5),
    }),
    defaults: {
      resolutions: ["360", "720"] as ("240" | "360" | "480" | "720" | "1080")[],
    },
    toTransformation: (p) => [{ streamingResolutions: p.resolutions }],
    pathSuffix: "/ik-master.m3u8",
    async: true,
  }),
];

export const OPERATIONS_BY_ID: Readonly<Record<string, AnyOperation>> =
  Object.fromEntries(OPERATIONS.map((op) => [op.id, op]));

export function operationsFor(kind: OperationKind): AnyOperation[] {
  return OPERATIONS.filter((op) => op.kind === kind);
}
