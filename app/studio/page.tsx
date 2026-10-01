import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";

export const metadata: Metadata = { title: "Gallery" };

export default async function StudioPage() {
  await auth.protect();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Gallery</h1>
      <Gallery />
    </>
  );
}
