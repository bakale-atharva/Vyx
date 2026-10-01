"use client";

import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useMemo, useState } from "react";
import { getDownloadUrl } from "@/actions/editor";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, tabPanelId } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Filmstrip, type PendingEdit } from "./Filmstrip";
import { GalleryEmpty } from "./GalleryEmpty";
import { Loupe } from "./Loupe";
import { UsageMeter } from "./UsageMeter";
import { useThumbnails } from "./useThumbnails";

const TABS = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PAGE_SIZE = 24;
const ID_PREFIX = "gallery";

function GallerySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="aspect-video w-full animate-pulse bg-raised motion-reduce:animate-none" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="aspect-square w-32 shrink-0 animate-pulse bg-raised motion-reduce:animate-none sm:w-36"
          />
        ))}
      </div>
    </div>
  );
}

export function Gallery() {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("all");
  const [pickedId, setPickedId] = useState<Id<"assets"> | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.assets.list,
    tab === "all" ? {} : { kind: tab },
    { initialNumItems: PAGE_SIZE },
  );
  const edits = useQuery(api.edits.list);
  const deleteAsset = useAction(api.assets.deleteAsset);
  const dismissEdit = useMutation(api.edits.dismiss);

  const pending = useMemo<PendingEdit[]>(
    () =>
      (edits ?? [])
        .filter((e) => tab === "all" || e.kind === tab)
        .map((e) => ({
          _id: e._id,
          name: e.name,
          kind: e.kind,
          status: e.status,
        })),
    [edits, tab],
  );

  // The picked file if it is still listed, otherwise the newest one.
  const selected = results.find((a) => a._id === pickedId) ?? results[0];

  const stripIds = useMemo(() => results.map((a) => a._id), [results]);
  const strip = useThumbnails(stripIds, "strip");
  const selectedId = selected?._id;
  const loupeIds = useMemo(() => (selectedId ? [selectedId] : []), [selectedId]);
  const loupe = useThumbnails(loupeIds, "loupe");

  async function download() {
    if (!selected) return;
    setDownloading(true);
    try {
      const result = await getDownloadUrl(selected._id, []);
      const url = "url" in result ? result.url : undefined;
      if (!url) throw new Error("No download URL");
      const link = document.createElement("a");
      link.href = url;
      link.download = selected.name;
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      toast({
        tone: "error",
        title: "Couldn't start the download",
        description: "Try again in a moment.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    const index = results.findIndex((a) => a._id === selected._id);
    const neighbour = results[index + 1] ?? results[index - 1];
    setDeleting(true);
    try {
      await deleteAsset({ assetId: selected._id });
      setPickedId(neighbour?._id ?? null);
      setConfirmingDelete(false);
      toast({ tone: "success", title: "Deleted", description: selected.name });
    } catch {
      toast({
        tone: "error",
        title: "Couldn't delete the file",
        description: "Nothing was removed. Try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  function dismiss(id: Id<"edits">) {
    dismissEdit({ editId: id }).catch(() =>
      toast({ tone: "error", title: "Couldn't dismiss that edit" }),
    );
  }

  const loading = status === "LoadingFirstPage" || edits === undefined;
  const empty = !loading && results.length === 0 && pending.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Tabs
          label="Filter by type"
          idPrefix={ID_PREFIX}
          tabs={TABS}
          value={tab}
          onChange={(id) => {
            setTab(id as TabId);
            setPickedId(null);
          }}
        />
        <UsageMeter />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(ID_PREFIX, tab)}
        aria-labelledby={`${ID_PREFIX}-tab-${tab}`}
        className="flex min-w-0 flex-col gap-6"
      >
        {loading ? (
          <GallerySkeleton />
        ) : empty ? (
          <GalleryEmpty filtered={tab !== "all"} />
        ) : (
          <>
            {selected && (
              <Loupe
                asset={selected}
                url={loupe.get(selected._id)}
                downloading={downloading}
                onDownload={download}
                onDelete={() => setConfirmingDelete(true)}
                onImageError={() => loupe.invalidate(selected._id)}
              />
            )}
            <Filmstrip
              assets={results}
              pending={pending}
              selectedId={selected?._id}
              thumbUrl={strip.get}
              onSelect={setPickedId}
              onDismiss={dismiss}
              onThumbError={strip.invalidate}
              canLoadMore={status === "CanLoadMore"}
              loadingMore={status === "LoadingMore"}
              onLoadMore={() => loadMore(PAGE_SIZE)}
            />
          </>
        )}
      </div>

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this file?"
        description={
          selected
            ? `"${selected.name}" will be removed from your library and storage. This can't be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
