"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPreviewUrl } from "@/actions/editor";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  OPERATIONS_BY_ID,
  operationsFor,
  type AnyOperation,
  type OperationGroup,
} from "@/lib/editor/operations";
import { CropStage } from "./CropStage";
import { EditorCanvas } from "./EditorCanvas";
import { EditorAside, EditorTopBar, LockedToolDialog, useUndoShortcuts } from "./EditorChrome";
import { StepsList } from "./StepsList";
import { GROUP_LABEL, GroupBar, ToolList } from "./ToolPanel";
import { ToolSettings } from "./ToolSettings";
import { useEditorActions } from "./useEditorActions";
import { useEditorState } from "./useEditorState";
import { needsGenerate, usePreview, validateSteps } from "./usePreview";

const IMAGE_TOOLS = operationsFor("image");
const GROUPS = (Object.keys(GROUP_LABEL) as OperationGroup[]).filter((g) =>
  IMAGE_TOOLS.some((op) => op.group === g),
);

export function ImageEditor({ asset }: { asset: Doc<"assets"> }) {
  const { has } = useAuth();
  const { steps, selected, canUndo, canRedo, dispatch } = useEditorState();
  const { preview, recipe, errors, stale, generate } = usePreview(asset._id, steps);

  const [group, setGroup] = useState<OperationGroup>(GROUPS[0]);
  const [comparing, setComparing] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [lockedTool, setLockedTool] = useState<AnyOperation | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const actions = useEditorActions(asset, recipe, () => setUpgradeOpen(true));
  useUndoShortcuts(dispatch);

  // The untouched original, for the first paint and the compare view.
  useEffect(() => {
    let cancelled = false;
    getPreviewUrl(asset._id, []).then((r) => {
      if (!cancelled && "url" in r && r.url) setOriginalUrl(r.url);
    });
    return () => {
      cancelled = true;
    };
  }, [asset._id]);

  // Crop box: while a Crop step is selected, show the image as it is just
  // before that step and let the user drag the box over it.
  const cropping = selected?.opId === "crop" ? selected : null;
  const cropIndex = cropping ? steps.findIndex((s) => s.uid === cropping.uid) : -1;
  const prefix = useMemo(
    () => (cropIndex > 0 ? validateSteps(steps.slice(0, cropIndex)).recipe : []),
    [steps, cropIndex],
  );
  const prefixKey = JSON.stringify(prefix);
  // Rendering AI steps costs credits, so they never render just to place a crop.
  const prefixGated = prefix.some((s) => needsGenerate(OPERATIONS_BY_ID[s.opId]));
  const [cropSource, setCropSource] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!cropping || prefixGated || prefixKey === "[]") return;
    let cancelled = false;
    getPreviewUrl(asset._id, JSON.parse(prefixKey)).then((r) => {
      if (!cancelled && "url" in r && r.url) setCropSource({ key: prefixKey, url: r.url });
    });
    return () => {
      cancelled = true;
    };
  }, [asset._id, cropping, prefixGated, prefixKey]);

  const cropSourceUrl =
    prefixKey === "[]"
      ? originalUrl
      : cropSource?.key === prefixKey
        ? cropSource.url
        : undefined;

  let stage: ReactNode = undefined;
  if (cropping) {
    const p = cropping.params;
    const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
    stage = prefixGated ? (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-muted">
          Drag Crop above the AI steps to draw the box on the image, or set the crop with
          the numbers in its settings.
        </p>
      </div>
    ) : cropSourceUrl ? (
      <CropStage
        src={cropSourceUrl}
        alt={`${asset.name}, before cropping`}
        value={{
          x: num(p.x, 0),
          y: num(p.y, 0),
          width: num(p.width, 500),
          height: num(p.height, 500),
        }}
        onChange={(rect) => dispatch({ type: "update", uid: cropping.uid, params: rect })}
      />
    ) : (
      <div role="status" className="absolute inset-0 flex items-center justify-center text-sm text-muted">
        Loading the image to crop…
      </div>
    );
  }

  const isUnlocked = useCallback(
    (op: AnyOperation) => (has ? has({ feature: op.feature }) : false),
    [has],
  );
  const tools = useMemo(() => IMAGE_TOOLS.filter((op) => op.group === group), [group]);
  const selectedOp = selected ? OPERATIONS_BY_ID[selected.opId] : undefined;
  const hasInvalid = Object.keys(errors).length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 max-lg:pb-24">
      <EditorTopBar
        name={asset.name}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        compare={{
          active: comparing,
          disabled: steps.length === 0,
          onToggle: () => setComparing((c) => !c),
        }}
        onDownload={actions.download}
        downloading={actions.downloading}
        downloadDisabled={hasInvalid}
        onSave={actions.save}
        saving={actions.saving}
        saveDisabled={recipe.length === 0 || hasInvalid}
        pendingSaves={actions.pendingSaves}
      />

      <div className="flex min-h-0 flex-1 gap-6 max-lg:flex-col">
        <EditorCanvas
          name={asset.name}
          preview={steps.length === 0 ? { status: "idle" } : preview}
          originalUrl={originalUrl}
          comparing={comparing}
          stale={stale}
          onGenerate={generate}
          onUnlock={() => setUpgradeOpen(true)}
          stage={stage}
        >
          <GroupBar groups={GROUPS} value={group} onChange={setGroup} />
        </EditorCanvas>

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
        returnPath={`/studio/image/${asset._id}`}
      />
    </div>
  );
}
