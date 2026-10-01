"use client";

import { Button } from "@/components/ui/button";

export default function StudioError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted">
        We couldn&apos;t load this page. Your files are safe. Try again, and if
        it keeps happening, reload the page.
      </p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
