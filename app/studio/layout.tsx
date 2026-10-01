import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio/StudioShell";

export default async function StudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Layouts don't re-render on navigation, so every studio page also protects itself.
  await auth.protect();
  return <StudioShell>{children}</StudioShell>;
}
