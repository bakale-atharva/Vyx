import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageEditor } from "@/components/editor/ImageEditor";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = { title: "Image editor" };

export default async function ImageEditorPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { getToken } = await auth.protect();
  const { assetId } = await params;
  const token = await getToken({ template: "convex" });
  // `assets.get` returns null for malformed, missing or foreign ids.
  const asset = token
    ? await fetchQuery(api.assets.get, { assetId }, { token })
    : null;
  if (!asset || asset.kind !== "image") notFound();
  return <ImageEditor asset={asset} />;
}
