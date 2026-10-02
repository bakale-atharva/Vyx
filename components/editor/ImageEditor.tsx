"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDownloadUrl, getPreviewUrl } from "@/actions/editor";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CompareIcon,
  DownloadIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { requiredPlan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";
import {
  OPERATIONS_BY_ID,
  operationsFor,
  type AnyOperation,
  type OperationGroup,
} from "@/lib/editor/operations";
import { CropStage } from "./CropStage";
import { EditorCanvas } from "./EditorCanvas";
import { StepsList } from "./StepsList";
import { GROUP_LABEL, GroupBar, ToolList } from "./ToolPanel";
import { ToolSettings } from "./ToolSettings";
import { useEditorState } from "./useEditorState";
import { needsGenerate, usePreview, validateSteps } from "./usePreview";

const IMAGE_TOOLS = operationsFor("image");
const GROUPS = (Object.keys(GROUP_LABEL) as OperationGroup[]).filter((g) =>
  IMAGE_TOOLS.some((op) => op.group === g),
);

const SAVE_ERRORS: Record<string, string> = {
  LOCKED: "A step needs a plan that unlocks it.",
  QUOTA_ASSETS: "Your library is full. Delete some files or upgrade to save more.",
  TOO_MANY_PROCESSING: "Several edits are already processing. Wait for one to finish.",
  NOTHING_TO_SAVE: "Add a step before saving.",
  INVALID: "One of the steps has invalid settings.",
};

export function ImageEditor({ asset }: { asset: Doc<"assets"> }) {
  const toast = useToast();
  const { has } = useAuth();
  const saveEdit = useAction(api.assets.saveEdit);
  const { steps, selected, canUndo, canRedo, dispatch } = useEditorState();
  const { preview, recipe, errors, stale, generate } = usePreview(asset._id, steps);

  const [group, setGroup] = useState<OperationGroup>(GROUPS[0]);
  const [comparing, setComparing] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [lockedTool, setLockedTool] = useState<AnyOperation | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);

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

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo (not while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

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

  async function download() {
    setDownloading(true);
    try {
      const result = await getDownloadUrl(asset._id, recipe);
      const url = "url" in result ? result.url : undefined;
      if (!url) {
        if ("error" in result && result.error === "LOCKED") setUpgradeOpen(true);
        throw new Error("No download URL");
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.name;
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      toast({ tone: "error", title: "Couldn't start the download", description: "Try again in a moment." });
    } finally {
      setDownloading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await saveEdit({ assetId: asset._id as Id<"assets">, recipe });
      toast({
        tone: "success",
        title: "Saving a new copy",
        description: "It will appear in your gallery when it's ready. Your original is unchanged.",
      });
    } catch (err) {
      const code = err instanceof ConvexError ? (err.data as { code?: string })?.code : undefined;
      if (code === "LOCKED") setUpgradeOpen(true);
      toast({
        tone: "error",
        title: "Couldn't save the copy",
        description: (code && SAVE_ERRORS[code]) ?? "Something went wrong. Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const panel = (
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
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 max-lg:pb-24">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line-strong pb-4">
        <Link href="/studio" className={buttonStyles("ghost", "sm", "px-2")} aria-label="Back to gallery">
          <ArrowLeftIcon width={18} height={18} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold" title={asset.name}>
          {asset.name}
        </h1>
        <div className="flex flex-wrap items-center gap-1">
          <IconButton label="Undo" onClick={() => dispatch({ type: "undo" })} disabled={!canUndo}>
            <UndoIcon />
          </IconButton>
          <IconButton label="Redo" onClick={() => dispatch({ type: "redo" })} disabled={!canRedo}>
            <RedoIcon />
          </IconButton>
          <IconButton
            label={comparing ? "Hide comparison" : "Compare with original"}
            aria-pressed={comparing}
            onClick={() => setComparing((c) => !c)}
            disabled={steps.length === 0}
            className={cn(comparing && "bg-raised text-fg")}
          >
            <CompareIcon />
          </IconButton>
          <Button variant="secondary" onClick={download} loading={downloading} disabled={hasInvalid}>
            <DownloadIcon width={18} height={18} />
            Download
          </Button>
          <Button
            variant="primary"
            onClick={save}
            loading={saving}
            disabled={recipe.length === 0 || hasInvalid}
          >
            Save as new
          </Button>
        </div>
      </header>

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

        {/* Right panel on large screens; a collapsible bottom sheet below lg. */}
        <aside
          aria-label="Tools"
          className={cn(
            "flex flex-col overflow-y-auto lg:w-[22rem] lg:shrink-0 lg:border-l lg:border-line-strong lg:pl-6",
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-line-strong max-lg:bg-panel max-lg:px-4 max-lg:pb-4",
            sheetOpen ? "max-lg:max-h-[60dvh]" : "max-lg:max-h-14",
          )}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-panel text-sm font-semibold lg:hidden"
          >
            Tools and steps
            {sheetOpen ? <ChevronDownIcon width={18} height={18} /> : <ChevronUpIcon width={18} height={18} />}
          </button>
          <div className={cn(!sheetOpen && "max-lg:hidden")}>{panel}</div>
        </aside>
      </div>

      <Dialog
        open={lockedTool !== null || upgradeOpen}
        onClose={() => {
          setLockedTool(null);
          setUpgradeOpen(false);
        }}
        size="wide"
        title={
          lockedTool
            ? `${lockedTool.label} needs ${requiredPlan(lockedTool.feature) === "ultra" ? "Ultra" : "Pro"}`
            : "Unlock more tools"
        }
        description={
          lockedTool
            ? `${lockedTool.description} Upgrade to use it; your plan changes take effect right away.`
            : "Upgrade to use every tool in your recipe."
        }
      >
        <PricingTable newSubscriptionRedirectUrl={`/studio/image/${asset._id}?upgraded=1`} />
      </Dialog>
    </div>
  );
}
