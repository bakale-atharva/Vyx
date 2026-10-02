"use client";

import { Button } from "@/components/ui/button";
import { ImageIcon, VideoIcon } from "@/components/ui/icons";
import { useOpenUpload } from "@/components/upload/UploadArea";

export function GalleryEmpty({ filtered }: { filtered: boolean }) {
  const openUpload = useOpenUpload();
  return (
    <section aria-label="Get started" className="crop-marks max-w-2xl">
      <div className="flex flex-col items-start gap-6 border border-dashed border-line-strong bg-panel p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">
            {filtered ? "Nothing of this kind yet" : "Nothing here yet"}
          </h2>
          <p className="max-w-[52ch] text-muted">
            Upload a photo or a video, or drop one anywhere here, to start
            editing. Your originals are never changed; every edit is saved as a
            new copy.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => openUpload("image")}>
            <ImageIcon width={18} height={18} />
            Upload image
          </Button>
          <Button variant="secondary" onClick={() => openUpload("video")}>
            <VideoIcon width={18} height={18} />
            Upload video
          </Button>
        </div>
      </div>
    </section>
  );
}
