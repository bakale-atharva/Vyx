import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { ImageIcon, VideoIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Gallery" };

export default async function StudioPage() {
  await auth.protect();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Gallery</h1>
      <section aria-label="Get started" className="crop-marks max-w-2xl">
        <div className="flex flex-col items-start gap-6 border border-dashed border-line-strong bg-panel p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Nothing here yet</h2>
            <p className="max-w-[52ch] text-muted">
              Upload a photo or a video to start editing. Your originals are
              never changed; every edit is saved as a new copy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/studio/upload/image"
              className={buttonStyles("primary", "md")}
            >
              <ImageIcon width={18} height={18} />
              Upload image
            </Link>
            <Link
              href="/studio/upload/video"
              className={buttonStyles("secondary", "md")}
            >
              <VideoIcon width={18} height={18} />
              Upload video
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
