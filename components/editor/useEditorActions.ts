"use client";

import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState } from "react";
import { getDownloadUrl } from "@/actions/editor";
import { useToast } from "@/components/ui/toast";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const SAVE_ERRORS: Record<string, string> = {
  LOCKED: "A step needs a plan that unlocks it.",
  QUOTA_ASSETS: "Your library is full. Delete some files or upgrade to save more.",
  TOO_MANY_PROCESSING: "Several edits are already processing. Wait for one to finish.",
  NOTHING_TO_SAVE: "Add a step that changes the file before saving.",
  INVALID: "One of the steps has invalid settings.",
  DOWNLOAD_ONLY: "Extracted audio can be downloaded but not saved to the gallery.",
  NOT_SAVEABLE: "Streaming can't be saved as a file. Remove it to save.",
};

const JOB_ERRORS: Record<string, string> = {
  TIMEOUT: "ImageKit took too long to render it. Try again, or simplify the steps.",
  QUOTA_ASSETS: SAVE_ERRORS.QUOTA_ASSETS,
  TOO_LARGE: "The result is larger than your plan allows.",
  TOO_LONG: "The result is longer than your plan allows.",
};

/** Download and "Save as new" for a recipe, with the server's gate re-checked. */
export function useEditorActions(
  asset: Doc<"assets">,
  recipe: { opId: string; params: unknown }[],
  onLocked: () => void,
) {
  const toast = useToast();
  const saveEdit = useAction(api.assets.saveEdit);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Follow saved copies until the server finishes or fails them. A finished
  // job is removed from `edits.list` once its asset exists.
  const [jobs, setJobs] = useState<Id<"edits">[]>([]);
  const edits = useQuery(api.edits.list, jobs.length ? {} : "skip");
  const pendingSaves = edits
    ? jobs.filter((id) => edits.some((e) => e._id === id && e.status === "processing")).length
    : jobs.length;
  // A result from before the save can lack the new job, so "gone" only means
  // done once the job has been seen processing.
  const seen = useRef(new Set<Id<"edits">>());
  const notified = useRef(new Set<Id<"edits">>());
  useEffect(() => {
    if (!edits) return;
    const byId = new Map(edits.map((e) => [e._id, e]));
    for (const id of jobs) {
      const edit = byId.get(id);
      if (edit?.status === "processing") seen.current.add(id);
      if (notified.current.has(id) || edit?.status === "processing") continue;
      if (!edit && !seen.current.has(id)) continue;
      notified.current.add(id);
      if (!edit) {
        toast({ tone: "success", title: "Your copy is ready", description: "Find it in your gallery." });
      } else {
        toast({
          tone: "error",
          title: "Couldn't save the copy",
          description: (edit.errorCode && JOB_ERRORS[edit.errorCode]) ?? "ImageKit couldn't render this edit. Try again.",
        });
      }
    }
  }, [edits, jobs, toast]);

  async function download() {
    setDownloading(true);
    try {
      const result = await getDownloadUrl(asset._id, recipe);
      const url = "url" in result ? result.url : undefined;
      if (!url) {
        if ("error" in result && result.error === "LOCKED") onLocked();
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
      const editId = await saveEdit({ assetId: asset._id, recipe });
      setJobs((current) => [...current, editId]);
      toast({
        tone: "info",
        title: "Saving a new copy",
        description:
          asset.kind === "video"
            ? "Video edits can take a few minutes. You can keep editing; we'll tell you when it's ready."
            : "We'll tell you when it's ready. Your original is unchanged.",
      });
    } catch (err) {
      const code = err instanceof ConvexError ? (err.data as { code?: string })?.code : undefined;
      if (code === "LOCKED") onLocked();
      toast({
        tone: "error",
        title: "Couldn't save the copy",
        description: (code && SAVE_ERRORS[code]) ?? "Something went wrong. Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return { download, save, saving, downloading, pendingSaves };
}
