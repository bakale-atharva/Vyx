"use client";

import { useAuth } from "@clerk/nextjs";
import type { IKPlayerOptions, Player, SourceOptions } from "@imagekit/video-player/react";
import { usePaginatedQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPreviewUrl } from "@/actions/editor";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { IMAGEKIT_ID, URL_ENDPOINT } from "@/lib/imagekit/client";
import {
  OPERATIONS_BY_ID,
  operationsFor,
  type AnyOperation,
  type OperationGroup,
} from "@/lib/editor/operations";
import { recipeToTransformations } from "@/lib/editor/recipe";
import { EditorAside, EditorTopBar, LockedToolDialog, useUndoShortcuts } from "./EditorChrome";
import { StepsList } from "./StepsList";
import { GROUP_LABEL, GroupBar, ToolList } from "./ToolPanel";
import { ToolSettings } from "./ToolSettings";
import { useEditorActions } from "./useEditorActions";
import { useEditorState } from "./useEditorState";
import { needsGenerate, validateSteps } from "./usePreview";
import { TrimTimeline } from "./video/TrimTimeline";

// Video.js needs the browser; load the player client-only.
const VideoStage = dynamic(() => import("./video/VideoStage"), {
  ssr: false,
  loading: () => (
    <div role="status" className="absolute inset-0 flex items-center justify-center text-sm text-muted">
      Loading the player…
    </div>
  ),
});

const VIDEO_TOOLS = operationsFor("video");
const GROUPS = (Object.keys(GROUP_LABEL) as OperationGroup[]).filter((g) =>
  VIDEO_TOOLS.some((op) => op.group === g),
);
const DEBOUNCE_MS = 400;

/** Steps the player handles itself (not URL transformations) or that aren't playable video. */
const NOT_IN_SOURCE = new Set(["ai_subtitles", "subtitle_translate", "streaming", "thumbnail"]);

type Recipe = { opId: string; params: unknown }[];

function buildPlayerConfig(
  recipe: Recipe,
  assetPaths: Record<string, string>,
  filePath: string,
): { source: SourceOptions; abs?: IKPlayerOptions["abs"] } | { error: string } {
  let transformation;
  try {
    transformation = recipeToTransformations(
      recipe.filter((s) => !NOT_IN_SOURCE.has(s.opId)),
      { assetPaths },
    ).transformation;
  } catch {
    return { error: "The watermark image couldn't be found. Pick it again in the Watermark settings." };
  }
  const subs = recipe.find((s) => s.opId === "ai_subtitles")?.params as
    | { maxChars: number; highlightWords: boolean; chapters: boolean }
    | undefined;
  const translate = recipe.find((s) => s.opId === "subtitle_translate")?.params as
    | { languages: ("fr" | "de" | "es" | "hi")[] }
    | undefined;
  const stream = recipe.find((s) => s.opId === "streaming")?.params as
    | { resolutions: string[] }
    | undefined;

  const source: SourceOptions = {
    src: `${URL_ENDPOINT}${filePath}`,
    // The player sends this through signerFn like every other resource.
    poster: { src: `${URL_ENDPOINT}${filePath}/ik-thumbnail.jpg` },
    ...(transformation.length ? { transformation } : {}),
    ...(subs
      ? {
          textTracks: [
            {
              autoGenerate: true,
              default: true,
              maxChars: subs.maxChars,
              highlightWords: subs.highlightWords,
              ...(translate ? { translations: translate.languages.map((langCode) => ({ langCode })) } : {}),
            },
          ],
          ...(subs.chapters ? { chapters: true } : {}),
        }
      : {}),
  };
  const abs = stream ? { protocol: "hls" as const, sr: stream.resolutions.map(Number) } : undefined;
  return { source, abs };
}

export function VideoEditor({ asset }: { asset: Doc<"assets"> }) {
  const { has } = useAuth();
  const { steps, selected, canUndo, canRedo, dispatch } = useEditorState();
  useUndoShortcuts(dispatch);

  const [group, setGroup] = useState<OperationGroup>(GROUPS[0]);
  const [lockedTool, setLockedTool] = useState<AnyOperation | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // ----------------------------------------------------------- recipe state
  const { recipe, errors } = useMemo(() => {
    const v = validateSteps(steps);
    const translate = steps.find((s) => s.opId === "subtitle_translate");
    if (translate && !steps.some((s) => s.opId === "ai_subtitles")) {
      v.errors[translate.uid] = "Add AI subtitles first; translations are made from them.";
      v.recipe = v.recipe.filter((s) => s.opId !== "subtitle_translate");
    }
    return v;
  }, [steps]);
  const key = JSON.stringify(recipe);
  const gated = recipe.some((s) => needsGenerate(OPERATIONS_BY_ID[s.opId]));
  const [renderedKey, setRenderedKey] = useState("[]");

  useEffect(() => {
    if (gated) return;
    const timer = setTimeout(() => setRenderedKey(key), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [gated, key]);
  const stale = gated && renderedKey !== key;
  const rendered = useMemo(() => JSON.parse(renderedKey) as Recipe, [renderedKey]);

  // While Trim or Thumbnail is selected, play the video as it is before that step.
  const focus = selected && (selected.opId === "trim" || selected.opId === "thumbnail") ? selected : null;
  const focusIndex = focus ? steps.findIndex((s) => s.uid === focus.uid) : -1;
  const prefix = useMemo(
    () => (focusIndex > 0 ? validateSteps(steps.slice(0, focusIndex)).recipe : []),
    [steps, focusIndex],
  );
  const prefixGated = prefix.some((s) => needsGenerate(OPERATIONS_BY_ID[s.opId]));
  const playerRecipe = focus ? prefix : rendered;

  // ------------------------------------------------------------ player config
  const { results: images } = usePaginatedQuery(api.assets.list, { kind: "image" }, { initialNumItems: 48 });
  const assetPaths = useMemo(
    () => Object.fromEntries(images.map((img) => [img._id, img.filePath])),
    [images],
  );
  const stillMode = !focus && playerRecipe.some((s) => s.opId === "thumbnail");
  const config = useMemo(
    () => buildPlayerConfig(playerRecipe, assetPaths, asset.filePath),
    [playerRecipe, assetPaths, asset.filePath],
  );
  const stageKey = "source" in config ? JSON.stringify(config) : "error";

  const [still, setStill] = useState<{ key: string; url: string } | null>(null);
  const playerKey = JSON.stringify(playerRecipe);
  useEffect(() => {
    if (!stillMode) return;
    let cancelled = false;
    getPreviewUrl(asset._id, JSON.parse(playerKey)).then((r) => {
      if (!cancelled && "url" in r && r.url) setStill({ key: playerKey, url: r.url });
    });
    return () => {
      cancelled = true;
    };
  }, [asset._id, stillMode, playerKey]);

  // Every URL the player loads is signed (and plan-checked) by the server.
  const signerFn = useCallback(async (url: string) => {
    const res = await fetch("/api/imagekit/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      if (body?.code === "LOCKED") setUpgradeOpen(true);
      setPlayerError(
        body?.code === "LOCKED"
          ? "A step needs a plan that unlocks it."
          : "This preview couldn't be loaded. Change a setting or try again.",
      );
      throw new Error(`Signing refused (${res.status})`);
    }
    setPlayerError(null);
    return res.text();
  }, []);

  // --------------------------------------------------- player time + trim loop
  const [player, setPlayer] = useState<Player | null>(null);
  // The player instance that has shown its first frame. Each source change
  // remounts the stage with a new player, so this resets on its own.
  const [loadedPlayer, setLoadedPlayer] = useState<Player | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [duration, setDuration] = useState(asset.duration ?? 0);
  const trimRange = useRef<{ start: number; end: number } | null>(null);

  const trimParams = focus?.opId === "trim" ? (focus.params as { start?: number; end?: number; duration?: number }) : null;
  const trimStart = trimParams?.start ?? 0;
  const trimEnd =
    trimParams?.end ??
    (trimParams?.duration !== undefined ? trimStart + trimParams.duration : duration || 10);

  useEffect(() => {
    trimRange.current = trimParams ? { start: trimStart, end: trimEnd } : null;
  }, [trimParams, trimStart, trimEnd]);

  useEffect(() => {
    if (!player) return;
    const onTime = () => {
      const t = player.currentTime() ?? 0;
      setPlayhead(t);
      // Preview the trim by looping the chosen range.
      const range = trimRange.current;
      if (range && t >= range.end) player.currentTime(range.start);
    };
    const onMeta = () => {
      const d = player.duration();
      if (d && Number.isFinite(d)) setDuration(d);
    };
    const onLoaded = () => setLoadedPlayer(player);
    player.on("timeupdate", onTime);
    player.on("loadedmetadata", onMeta);
    player.on("loadeddata", onLoaded);
    return () => {
      player.off("timeupdate", onTime);
      player.off("loadedmetadata", onMeta);
      player.off("loadeddata", onLoaded);
    };
  }, [player]);

  // ----------------------------------------------------------------- actions
  const actions = useEditorActions(asset, recipe, () => setUpgradeOpen(true));
  const isUnlocked = useCallback(
    (op: AnyOperation) => (has ? has({ feature: op.feature }) : false),
    [has],
  );
  const tools = useMemo(() => VIDEO_TOOLS.filter((op) => op.group === group), [group]);
  const selectedOp = selected ? OPERATIONS_BY_ID[selected.opId] : undefined;
  const hasInvalid = Object.keys(errors).length > 0;
  const hasStreaming = recipe.some((s) => s.opId === "streaming");
  const audioOnly = recipe.some((s) => s.opId === "extract_audio");
  const saveable = recipe.some((s) => !OPERATIONS_BY_ID[s.opId]?.playerOnly);
  const saveHint = hasStreaming
    ? "Streaming can't be saved as a file"
    : audioOnly
      ? "Extracted audio can be downloaded, not saved"
      : !saveable
        ? "AI subtitles play in the player and don't change the file"
        : undefined;

  // ---------------------------------------------------------------- canvas
  let canvas;
  let waiting: { title: string; detail?: string } | null = null;
  if (focus && prefixGated) {
    canvas = (
      <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
        Move this step above the AI steps to preview it here.
      </p>
    );
  } else if ("error" in config) {
    canvas = (
      <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-danger">
        {config.error}
      </p>
    );
  } else if (stillMode) {
    canvas =
      still?.key === playerKey ? (
        // Signed ImageKit URL: next/image would alter it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still.url} alt={`${asset.name}, thumbnail`} className="absolute inset-0 size-full object-contain" />
      ) : (
        <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          Rendering the thumbnail…
        </p>
      );
  } else {
    if (!playerError && (!player || loadedPlayer !== player)) {
      waiting = config.source.transformation
        ? {
            title: "Processing video… this can take a minute",
            detail: "ImageKit renders edits on first play. The player keeps retrying until it's ready.",
          }
        : { title: "Loading the video…" };
    }
    canvas = (
      <VideoStage
        key={stageKey}
        imagekitId={IMAGEKIT_ID}
        source={config.source}
        abs={config.abs}
        signerFn={signerFn}
        onPlayer={setPlayer}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 max-lg:pb-24">
      <EditorTopBar
        name={asset.name}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        onDownload={actions.download}
        downloading={actions.downloading}
        downloadDisabled={hasInvalid || hasStreaming}
        onSave={actions.save}
        saving={actions.saving}
        saveDisabled={hasInvalid || !saveable || hasStreaming || audioOnly}
        saveHint={saveHint}
        pendingSaves={actions.pendingSaves}
      />

      <div className="flex min-h-0 flex-1 gap-6 max-lg:flex-col">
        <div className="relative flex min-w-0 flex-1 flex-col gap-3">
          <div className="crop-marks flex-1">
            <div className="relative size-full min-h-[50vh] overflow-hidden border border-line-strong bg-panel">
              {canvas}
              {waiting && (
                // Doesn't block the player's controls underneath.
                <div
                  role="status"
                  className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-4"
                >
                  <div className="flex max-w-md items-start gap-3 border border-line-strong bg-ink/90 px-4 py-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 shrink-0 animate-pulse bg-magenta motion-reduce:animate-none"
                    />
                    <span className="flex flex-col gap-1 text-sm">
                      <span className="font-semibold">{waiting.title}</span>
                      {waiting.detail && <span className="text-xs text-muted">{waiting.detail}</span>}
                    </span>
                  </div>
                </div>
              )}
              {(stale || playerError) && (
                <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-ink/85 px-4 py-3 text-sm">
                  {playerError ? (
                    <span role="alert" className="text-danger">{playerError}</span>
                  ) : (
                    <>
                      <span className="text-muted">
                        AI subtitles render only when you ask, since they use AI credits.
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setPlayerError(null);
                          setRenderedKey(key);
                        }}
                      >
                        Generate preview
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {focus?.opId === "trim" && duration > 0 && (
            <TrimTimeline
              duration={duration}
              start={trimStart}
              end={Math.min(trimEnd, duration)}
              playhead={playhead}
              onChange={(range) =>
                dispatch({ type: "update", uid: focus.uid, params: { start: range.start, end: range.end } })
              }
            />
          )}
          {focus?.opId === "thumbnail" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!player}
                onClick={() => {
                  const t = player?.currentTime() ?? 0;
                  dispatch({ type: "update", uid: focus.uid, params: { time: Math.round(t * 10) / 10 } });
                }}
              >
                Use current frame
              </Button>
              <span className="font-mono text-xs text-muted tabular-nums">
                Frame at {(focus.params as { time?: number }).time ?? 0}s
              </span>
            </div>
          )}
          <div className="flex justify-center">
            <GroupBar groups={GROUPS} value={group} onChange={setGroup} />
          </div>
        </div>

        <EditorAside>
          <div className="flex flex-col gap-6">
            <section aria-label={`${GROUP_LABEL[group]} tools`}>
              <h2 className="mb-2 text-sm font-semibold">{GROUP_LABEL[group]}</h2>
              <ToolList
                tools={tools}
                isUnlocked={isUnlocked}
                onPick={(op) => dispatch({ type: "add", opId: op.id })}
                onLocked={setLockedTool}
              />
            </section>
            {selected && selectedOp && (
              <ToolSettings
                key={selected.uid}
                op={selectedOp}
                params={selected.params}
                error={errors[selected.uid]}
                assetId={asset._id}
                onChange={(params) => dispatch({ type: "update", uid: selected.uid, params })}
              />
            )}
            <StepsList
              steps={steps}
              selectedUid={selected?.uid ?? null}
              errors={errors}
              onSelect={(uid) => dispatch({ type: "select", uid })}
              onMove={(uid, by) => dispatch({ type: "move", uid, by })}
              onRemove={(uid) => dispatch({ type: "remove", uid })}
              onReset={() => dispatch({ type: "reset" })}
            />
          </div>
        </EditorAside>
      </div>

      <LockedToolDialog
        tool={lockedTool}
        open={lockedTool !== null || upgradeOpen}
        onClose={() => {
          setLockedTool(null);
          setUpgradeOpen(false);
        }}
        returnPath={`/studio/video/${asset._id}`}
      />
    </div>
  );
}
