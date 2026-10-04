import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="text-muted">Check the address, or head back to Vyx.</p>
      <Link href="/" className={buttonStyles("primary", "md")}>
        Go to Vyx
      </Link>
    </main>
  );
}
