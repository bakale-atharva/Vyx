"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, VideoIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { ALLOWED_MIME } from "@/lib/billing/plans";
import { DropSheet } from "./DropSheet";
import { useUploadFlow, type UploadKind } from "./useUploadFlow";

const UploadContext = createContext<((kind?: UploadKind) => void) | null>(null);

/** Opens the file picker (for an image, a video, or either). */
export function useOpenUpload() {
  const open = useContext(UploadContext);
  if (!open) throw new Error("useOpenUpload must be used inside <UploadArea>");
  return open;
}

const ACCEPT: Record<UploadKind | "any", string> = {
  image: ALLOWED_MIME.image.join(","),
  video: ALLOWED_MIME.video.join(","),
  any: [...ALLOWED_MIME.image, ...ALLOWED_MIME.video].join(","),
};

function hasFiles(e: DragEvent) {
  return Array.from(e.dataTransfer.types).includes("Files");
}

/**
 * The gallery with its upload entry points: the header's Upload buttons and
 * dropping a file anywhere on the area. Uploads run in the Drop Sheet.
 */
export function UploadArea({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const toast = useToast();
  const flow = useUploadFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [accept, setAccept] = useState<UploadKind | "any">("any");
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const busy = flow.phase.name === "uploading" || flow.phase.name === "finishing";

  function openPicker(kind?: UploadKind) {
    if (busy) return;
    const next = kind ?? "any";
    setAccept(next);
    // `accept` must be applied before the dialog opens.
    if (inputRef.current) inputRef.current.accept = ACCEPT[next];
    inputRef.current?.click();
  }

  function takeFiles(files: FileList | null, kind?: UploadKind) {
    const file = files?.[0];
    if (!file) return;
    if (files.length > 1) {
      toast({
        tone: "info",
        title: "One file at a time",
        description: `Uploading "${file.name}" only.`,
      });
    }
    void flow.start(file, kind);
  }

  return (
    <UploadContext.Provider value={openPicker}>
      <div
        className="flex flex-col gap-6"
        onDragEnter={(e) => {
          if (busy || !hasFiles(e)) return;
          e.preventDefault();
          depth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (busy || !hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          if (!dragging) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          if (!busy) takeFiles(e.dataTransfer.files);
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">{title}</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => openPicker("image")} disabled={busy}>
              <ImageIcon width={18} height={18} />
              Upload image
            </Button>
            <Button variant="secondary" onClick={() => openPicker("video")} disabled={busy}>
              <VideoIcon width={18} height={18} />
              Upload video
            </Button>
          </div>
        </header>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[accept]}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            takeFiles(e.target.files, accept === "any" ? undefined : accept);
            e.target.value = "";
          }}
        />

        <div className="relative min-h-[28rem]">
          {children}
          {(dragging || flow.phase.name !== "idle") && (
            <DropSheet
              dragging={dragging}
              phase={flow.phase}
              tier={flow.tier}
              usage={flow.usage}
              onCancel={flow.cancel}
              onClose={flow.reset}
              onRetry={flow.retry}
              onChooseAnother={() => {
                flow.reset();
                openPicker();
              }}
            />
          )}
        </div>
      </div>
    </UploadContext.Provider>
  );
}
