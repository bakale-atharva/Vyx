/** Shown while a studio page loads its data on the server (e.g. opening an editor). */
export default function StudioLoading() {
  return (
    <div role="status" className="flex min-h-[50vh] flex-1 flex-col gap-4">
      <div className="h-10 w-1/3 animate-pulse bg-panel motion-reduce:animate-none" />
      <div className="flex-1 animate-pulse border border-line-strong bg-panel motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
