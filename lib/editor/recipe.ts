/**
 * Recipes: an ordered list of tool steps. Turns a recipe into ImageKit
 * transformations, and (for the signing gate) turns an arbitrary ImageKit URL
 * back into the set of features it needs. Anything the parser doesn't
 * recognise is rejected: it is an allowlist, not a denylist.
 */
import type { Transformation } from "@imagekit/nodejs/resources/shared";
import { z } from "zod";
import type { FeatureSlug } from "../billing/plans";
import { FEATURES } from "../billing/plans";
import {
  OPERATIONS_BY_ID,
  type OperationContext,
  type OperationKind,
} from "./operations";

// ------------------------------------------------------------------- recipes

export const MAX_RECIPE_STEPS = 30;

export const recipeSchema = z
  .array(z.object({ opId: z.string().max(64), params: z.unknown() }))
  .max(MAX_RECIPE_STEPS);

export type Recipe = { opId: string; params: unknown }[];
export type ParsedStep = { opId: string; params: unknown };

export type ParseResult =
  | { ok: true; steps: ParsedStep[] }
  | { ok: false; error: string };

/** Validate every step against its operation's schema (and the asset's kind). */
export function parseRecipe(kind: OperationKind, input: unknown): ParseResult {
  const shape = recipeSchema.safeParse(input);
  if (!shape.success) return { ok: false, error: "Malformed recipe" };

  const steps: ParsedStep[] = [];
  for (const step of shape.data) {
    const op = OPERATIONS_BY_ID[step.opId];
    if (!op) return { ok: false, error: `Unknown tool: ${step.opId}` };
    if (op.kind !== kind) {
      return { ok: false, error: `${op.label} is not a ${kind} tool` };
    }
    const params = op.params.safeParse(step.params);
    if (!params.success) {
      return {
        ok: false,
        error: `${op.label}: ${params.error.issues[0]?.message ?? "invalid"}`,
      };
    }
    steps.push({ opId: step.opId, params: params.data });
  }
  return { ok: true, steps };
}

/** Features the recipe needs, from the operation registry. */
export function requiredFeatures(recipe: { opId: string }[]): FeatureSlug[] {
  const features = new Set<FeatureSlug>();
  for (const step of recipe) {
    const op = OPERATIONS_BY_ID[step.opId];
    if (op) features.add(op.feature);
  }
  return [...features];
}

/** Convex asset ids referenced by overlay steps (must be resolved + owned). */
export function overlayAssetIds(steps: ParsedStep[]): string[] {
  const ids = new Set<string>();
  for (const step of steps) {
    const p = step.params as { assetId?: unknown };
    if (
      (step.opId === "watermark" || step.opId === "v_watermark") &&
      typeof p.assetId === "string"
    ) {
      ids.add(p.assetId);
    }
  }
  return [...ids];
}

export type BuiltRecipe = {
  transformation: Transformation[];
  pathSuffix?: string;
  queryParameters: Record<string, string>;
};

/** Each step becomes its own chained transformation, preserving order. */
export function recipeToTransformations(
  steps: ParsedStep[],
  ctx: OperationContext,
): BuiltRecipe {
  const transformation: Transformation[] = [];
  const queryParameters: Record<string, string> = {};
  let pathSuffix: string | undefined;

  for (const step of steps) {
    const op = OPERATIONS_BY_ID[step.opId];
    if (!op) throw new Error(`Unknown tool: ${step.opId}`);
    transformation.push(...op.toTransformation(step.params, ctx));
    if (op.query) Object.assign(queryParameters, op.query(step.params));
    if (op.pathSuffix) {
      if (pathSuffix && pathSuffix !== op.pathSuffix) {
        throw new Error("Thumbnail and streaming can't be combined");
      }
      pathSuffix = op.pathSuffix;
    }
  }
  return { transformation, pathSuffix, queryParameters };
}

// --------------------------------------------------------- URL -> features

export type SignedRequestCheck =
  | {
      ok: true;
      kind: OperationKind;
      features: FeatureSlug[];
      /** Path relative to the URL endpoint, e.g. `/vyx/users/u1/images/a.jpg`. */
      path: string;
      /** Raw, validated `tr` value (steps joined by `:`), if any. */
      tr: string | null;
      queryParameters: Record<string, string>;
    }
  | { ok: false; reason: string };

const reject = (reason: string): { ok: false; reason: string } => ({
  ok: false,
  reason,
});

const POSITIONS =
  "center|top|bottom|left|right|top_left|top_right|bottom_left|bottom_right";
const NUM = "\\d{1,5}";
const DECIMAL = "\\d{1,5}(?:\\.\\d{1,3})?";
const HEX6 = "[0-9A-Fa-f]{6}";
const B64 = "[A-Za-z0-9%_.~-]{1,2000}";

type Feature = (kind: OperationKind) => FeatureSlug | null;
const basic: Feature = (k) =>
  k === "image" ? FEATURES.IMAGE_BASIC_EDITS : FEATURES.VIDEO_BASIC_EDITS;
const filters: Feature = (k) => (k === "image" ? FEATURES.IMAGE_FILTERS : null);
const imageOnly =
  (f: FeatureSlug): Feature =>
  (k) =>
    k === "image" ? f : null;
const videoOnly =
  (f: FeatureSlug): Feature =>
  (k) =>
    k === "video" ? f : null;

// [pattern for the whole token, feature it requires]
const TOKENS: [RegExp, Feature][] = [
  // basic edits (image and video)
  [new RegExp(`^w-${NUM}$`), basic],
  [new RegExp(`^h-${NUM}$`), basic],
  [/^c-(maintain_ratio|at_max|force)$/, basic],
  [/^cm-(pad_resize|extract)$/, basic],
  [new RegExp(`^[xy]-${NUM}$`), basic],
  [/^ar-\d{1,2}-\d{1,2}$/, basic],
  [/^rt-\d{1,3}$/, basic],
  [/^fl-(h|v|h_v)$/, basic],
  [/^q-\d{1,3}$/, basic],
  [/^bg-[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, basic],
  [new RegExp(`^fo-(${POSITIONS})$`), basic],
  [/^f-(auto|jpg|jpeg|png|webp|avif)$/, imageOnly(FEATURES.IMAGE_BASIC_EDITS)],
  [/^f-(mp4|webm)$/, videoOnly(FEATURES.VIDEO_BASIC_EDITS)],
  // image filters
  [/^e-grayscale$/, filters],
  [/^bl-\d{1,3}$/, filters],
  [/^e-sharpen(-\d{1,2})?$/, filters],
  [/^e-contrast$/, filters],
  [/^r-(\d{1,3}|max)$/, filters],
  [new RegExp(`^b-\\d{1,2}_${HEX6}$`), filters],
  // image pro
  [/^fo-(auto|face)$/, imageOnly(FEATURES.IMAGE_SMART_CROP)],
  [/^e-bgremove$/, imageOnly(FEATURES.IMAGE_BG_REMOVE)],
  [
    /^e-dropshadow(-[a-z]{2}-\d{1,3}(_[a-z]{2}-\d{1,3})*)?$/,
    imageOnly(FEATURES.IMAGE_DROP_SHADOW),
  ],
  [/^e-upscale$/, imageOnly(FEATURES.IMAGE_UPSCALE)],
  [/^e-retouch$/, imageOnly(FEATURES.IMAGE_RETOUCH)],
  // image ultra (prompts must be base64: the plain form can inject params)
  [new RegExp(`^e-changebg-prompte-${B64}$`), imageOnly(FEATURES.IMAGE_BG_CHANGE)],
  [new RegExp(`^e-edit-prompte-${B64}$`), imageOnly(FEATURES.IMAGE_AI_EDIT)],
  [/^e-genvar$/, imageOnly(FEATURES.IMAGE_VARIATIONS)],
  [new RegExp(`^bg-genfill(-prompte-${B64})?$`), imageOnly(FEATURES.IMAGE_GEN_FILL)],
  // video
  [new RegExp(`^(so|eo|du)-${DECIMAL}$`), videoOnly(FEATURES.VIDEO_TRIM)],
  [/^ac-none$/, videoOnly(FEATURES.VIDEO_MUTE)],
  [/^vc-none$/, videoOnly(FEATURES.VIDEO_AUDIO_EXTRACT)],
  [/^sr-\d{3,4}(_\d{3,4}){0,4}$/, videoOnly(FEATURES.VIDEO_STREAMING)],
];

/** Parameters valid inside a `l-text` / `l-image` ... `l-end` layer. */
const LAYER_COMMON: RegExp[] = [
  new RegExp(`^lfo-(${POSITIONS})$`),
  new RegExp(`^(lso|leo|ldu)-${DECIMAL}$`),
  new RegExp(`^w-${NUM}$`),
  new RegExp(`^h-${NUM}$`),
];
const LAYER_TEXT: RegExp[] = [
  ...LAYER_COMMON,
  /^i-[A-Za-z0-9%_.~-]{1,600}$/,
  new RegExp(`^ie-${B64}$`),
  /^fs-\d{1,3}$/,
  new RegExp(`^co-${HEX6}$`),
  /^bg-[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/,
  /^al-[1-9]$/,
];
const LAYER_IMAGE: RegExp[] = [...LAYER_COMMON, /^o-\d{1,3}$/];

function validImageOverlayInput(token: string, userId: string): boolean {
  if (!/^i-[A-Za-z0-9_.@~-]{1,400}$/.test(token)) return false;
  const path = token.slice(2).replaceAll("@@", "/");
  if (path.includes("@")) return false;
  const segments = path.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;
  return path.startsWith(`vyx/users/${userId}/images/`);
}

// Encoded delimiters would change how a server that decodes before splitting
// reads the string, so they are rejected outright.
const ENCODED_DELIMITERS = /%(2c|3a|25)/i;

type TrResult =
  | { ok: true; features: Set<FeatureSlug> }
  | { ok: false; reason: string };

function parseTr(
  tr: string,
  kind: OperationKind,
  userId: string,
  thumbnail: boolean,
): TrResult {
  if (!/^[A-Za-z0-9_.,:%@~-]+$/.test(tr)) return { ok: false, reason: "Bad tr charset" };
  if (ENCODED_DELIMITERS.test(tr)) {
    return { ok: false, reason: "Encoded delimiter in tr" };
  }

  const features = new Set<FeatureSlug>();
  for (const step of tr.split(":")) {
    if (step === "") return { ok: false, reason: "Empty transformation step" };
    let layer: "text" | "image" | null = null;

    for (const token of step.split(",")) {
      if (token === "") return { ok: false, reason: "Empty transformation" };

      if (layer) {
        if (token === "l-end") {
          layer = null;
          continue;
        }
        const allowed =
          layer === "text"
            ? LAYER_TEXT.some((re) => re.test(token))
            : LAYER_IMAGE.some((re) => re.test(token)) ||
              validImageOverlayInput(token, userId);
        if (!allowed) return { ok: false, reason: `Layer param not allowed: ${token}` };
        continue;
      }

      if (token === "l-text" || token === "l-image") {
        layer = token === "l-text" ? "text" : "image";
        features.add(
          layer === "text"
            ? kind === "image"
              ? FEATURES.IMAGE_TEXT_OVERLAY
              : FEATURES.VIDEO_TEXT_OVERLAY
            : kind === "image"
              ? FEATURES.IMAGE_WATERMARK
              : FEATURES.VIDEO_WATERMARK,
        );
        continue;
      }

      const match = TOKENS.find(([re]) => re.test(token));
      const feature = match ? match[1](kind) : null;
      if (!feature) return { ok: false, reason: `Param not allowed: ${token}` };
      // On a thumbnail URL the offset picks the frame, it is not a trim.
      features.add(
        thumbnail && feature === FEATURES.VIDEO_TRIM
          ? FEATURES.VIDEO_THUMBNAIL
          : feature,
      );
    }
    if (layer) return { ok: false, reason: "Unterminated layer" };
  }
  return { ok: true, features };
}

const THUMBNAIL_SUFFIX = "/ik-thumbnail.jpg";
const STREAMING_SUFFIX = "/ik-master.m3u8";

/**
 * Validate an arbitrary ImageKit URL for one user and report every feature it
 * needs. The URL must be on our endpoint, inside the user's own folder, and
 * contain only allowlisted transformations.
 */
export function parseSignedRequest(
  rawUrl: string,
  opts: { urlEndpoint: string; userId: string },
): SignedRequestCheck {
  let url: URL;
  let endpoint: URL;
  try {
    url = new URL(rawUrl);
    endpoint = new URL(opts.urlEndpoint);
  } catch {
    return reject("Invalid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return reject("Bad protocol");
  }
  if (url.host !== endpoint.host || url.username || url.password) {
    return reject("Foreign host");
  }

  // Path: must sit inside /<endpoint path>/vyx/users/<userId>/<kind>s/...
  const endpointPath = endpoint.pathname.replace(/\/+$/, "");
  if (!/^[A-Za-z0-9_.%~/-]+$/.test(url.pathname) || /%(2e|2f|5c)/i.test(url.pathname)) {
    return reject("Bad path");
  }
  const root = `${endpointPath}/vyx/users/${opts.userId}/`;
  if (!url.pathname.startsWith(root)) return reject("Path outside the user's folder");
  const fullPath = url.pathname.slice(endpointPath.length);
  let path = fullPath;

  let pathFeature: FeatureSlug | null = null;
  let thumbnail = false;
  if (path.endsWith(THUMBNAIL_SUFFIX)) {
    pathFeature = FEATURES.VIDEO_THUMBNAIL;
    thumbnail = true;
    path = path.slice(0, -THUMBNAIL_SUFFIX.length);
  } else if (path.endsWith(STREAMING_SUFFIX)) {
    pathFeature = FEATURES.VIDEO_STREAMING;
    path = path.slice(0, -STREAMING_SUFFIX.length);
  }

  const rest = path.slice(`/vyx/users/${opts.userId}/`.length).split("/");
  const folder = rest[0];
  const kind: OperationKind | null =
    folder === "images" ? "image" : folder === "videos" ? "video" : null;
  if (!kind || rest.length < 2 || rest.some((s) => s === "" || s === "..")) {
    return reject("Not an asset path");
  }
  if (pathFeature && kind !== "video") return reject("Video-only resource");
  if (rest.some((s) => s.startsWith("ik-") || s.startsWith("tr:"))) {
    return reject("Reserved path segment");
  }

  // Query: allowlisted keys only, taken raw so we see exactly what is sent.
  let tr: string | null = null;
  const queryParameters: Record<string, string> = {};
  const seen = new Set<string>();
  const search = url.search.startsWith("?") ? url.search.slice(1) : "";
  for (const pair of search === "" ? [] : search.split("&")) {
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? "" : pair.slice(eq + 1);
    if (seen.has(key)) return reject(`Duplicate query param: ${key}`);
    seen.add(key);

    if (key === "tr") tr = value;
    else if (key === "v" && /^\d{1,4}$/.test(value)) queryParameters.v = value;
    else if (key === "ik-attachment" && value === "true") {
      queryParameters["ik-attachment"] = "true";
    } else if (
      (key === "ik-t" && /^\d+$/.test(value)) ||
      (key === "ik-s" && /^[0-9a-f]+$/.test(value))
    ) {
      // Signature params are ours to re-issue; ignore what the caller sent.
    } else {
      return reject(`Query param not allowed: ${key}`);
    }
  }

  const features = new Set<FeatureSlug>();
  if (pathFeature) features.add(pathFeature);
  if (tr !== null) {
    const parsed = parseTr(tr, kind, opts.userId, thumbnail);
    if (!parsed.ok) return reject(parsed.reason);
    for (const f of parsed.features) features.add(f);
  }

  return {
    ok: true,
    kind,
    features: [...features],
    path: fullPath,
    tr,
    queryParameters,
  };
}
