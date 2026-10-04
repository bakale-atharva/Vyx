"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPreviewUrl } from "@/actions/editor";
import { OPERATIONS_BY_ID, type AnyOperation } from "@/lib/editor/operations";
import type { Step } from "./useEditorState";

const DEBOUNCE_MS = 400;

/**
 * AI and generative steps cost ImageKit extension units: render only on
 * Generate. That covers async image AI renders and the video player's AI
 * subtitles/translations (player-only steps).
 */
export function needsGenerate(op: AnyOperation | undefined) {
  return (
    !!op &&
    (op.group === "ai" || op.group === "generative") &&
    (!!op.async || !!op.playerOnly)
  );
}

export type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string; async: boolean }
  | { status: "locked"; feature: string }
  | { status: "error"; message: string };

type Validated = {
  recipe: { opId: string; params: unknown }[];
  errors: Record<string, string>;
};

/** Steps whose settings pass their tool's schema form the recipe; others report why. */
export function validateSteps(steps: Step[]): Validated {
  const recipe: Validated["recipe"] = [];
  const errors: Validated["errors"] = {};
  for (const step of steps) {
    const op = OPERATIONS_BY_ID[step.opId];
    if (!op) continue;
    const result = op.params.safeParse(step.params);
    if (result.success) recipe.push({ opId: step.opId, params: result.data });
    else errors[step.uid] = result.error.issues[0]?.message ?? "Check this tool's settings";
  }
  return { recipe, errors };
}

/**
 * Signs a preview URL for the current recipe. Basic tools re-render after a
 * short pause; once the recipe contains an AI step, rendering waits for
 * `generate()`. Every request is gated again on the server.
 */
export function usePreview(assetId: string, steps: Step[]) {
  const { recipe, errors } = useMemo(() => validateSteps(steps), [steps]);
  const key = useMemo(() => JSON.stringify(recipe), [recipe]);
  const gated = recipe.some((s) => needsGenerate(OPERATIONS_BY_ID[s.opId]));

  const [requested, setRequested] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const latest = useRef(0);

  // Basic recipes follow the edits after a debounce; gated ones wait for Generate.
  useEffect(() => {
    if (gated) return;
    const timer = setTimeout(() => setRequested(key), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [gated, key]);

  useEffect(() => {
    if (requested === null) return;
    const id = ++latest.current;
    void (async () => {
      setPreview({ status: "loading" });
      try {
        const result = await getPreviewUrl(assetId, JSON.parse(requested));
        if (id !== latest.current) return;
        if ("url" in result && result.url) {
          setPreview({ status: "ready", url: result.url, async: result.async });
        } else if ("error" in result && result.error === "LOCKED") {
          setPreview({ status: "locked", feature: result.feature });
        } else {
          setPreview({
            status: "error",
            message:
              "message" in result && result.message
                ? result.message
                : "Couldn't build this preview.",
          });
        }
      } catch {
        if (id === latest.current) {
          setPreview({ status: "error", message: "Couldn't reach the server. Try again." });
        }
      }
    })();
  }, [assetId, requested]);

  return {
    preview,
    recipe,
    errors,
    /** An AI step changed and the preview is waiting for Generate. */
    stale: gated && requested !== key,
    generate: () => setRequested(key),
  };
}
