import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";
import { UploadArea } from "@/components/upload/UploadArea";

export const metadata: Metadata = { title: "Gallery" };

export default async function StudioPage() {
  await auth.protect();
  return (
    <UploadArea title="Gallery">
      <Gallery />
    </UploadArea>
  );
}
