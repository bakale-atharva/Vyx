import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Upload" };

export default async function UploadPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  await auth.protect();
  const { kind } = await params;
  if (kind !== "image" && kind !== "video") notFound();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">
        Upload {kind}
      </h1>
      <p className="max-w-prose text-muted">
        Uploading arrives in the next update.
      </p>
    </>
  );
}
