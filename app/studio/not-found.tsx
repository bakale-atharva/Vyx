import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

/** Missing, deleted or someone else's asset: the editors call notFound(). */
export default function StudioNotFound() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">We can&apos;t find that file</h1>
      <p className="text-muted">
        It may have been deleted, or the link points to a file that isn&apos;t in your gallery.
      </p>
      <Link href="/studio" className={buttonStyles("primary", "md")}>
        Back to your gallery
      </Link>
    </div>
  );
}
