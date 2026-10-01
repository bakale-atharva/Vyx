import { SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ToolPanelPreview } from "@/components/site/ToolPanelPreview";
import { Button, buttonStyles } from "@/components/ui/button";
import { ArrowRightIcon, ImageIcon, VideoIcon } from "@/components/ui/icons";
import { PLANS, QUOTAS, requiredPlan, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";
import { operationsFor, type OperationKind } from "@/lib/editor/operations";

const MB = 1024 * 1024;

const PLAN_INFO: Record<
  Plan,
  { name: string; price: string; blurb: string; head: string }
> = {
  free: {
    name: "Free",
    price: "$0",
    blurb: "Core tools, no card needed.",
    head: "bg-ink text-fg ring-1 ring-line-strong ring-inset",
  },
  pro: {
    name: "Pro",
    price: "$15",
    blurb: "AI cutouts, upscaling and audio tools.",
    head: "bg-cyan text-ink",
  },
  ultra: {
    name: "Ultra",
    price: "$39",
    blurb: "Prompt editing, subtitles and streaming.",
    head: "bg-magenta text-ink",
  },
};

function toolsByTier(kind: OperationKind) {
  const ops = operationsFor(kind);
  return PLANS.map((plan) => ({
    plan,
    labels: [
      ...new Set(
        ops
          .filter((op) => requiredPlan(op.feature) === plan)
          .map((o) => o.label),
      ),
    ],
  })).filter((tier) => tier.labels.length > 0);
}

function fmtSize(bytes: number) {
  return bytes >= 1024 * MB ? `${bytes / (1024 * MB)} GB` : `${bytes / MB} MB`;
}

const delay = (i: number) => ({ ["--i" as string]: i });

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/studio");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pt-16 lg:pb-28">
          <div className="flex flex-col items-start gap-8">
            <h1
              className="rise max-w-[13ch] text-5xl leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl"
              style={delay(0)}
            >
              Every edit is a new proof.
            </h1>
            <p
              className="rise max-w-[52ch] text-lg leading-relaxed text-muted"
              style={delay(1)}
            >
              Edit photos and video in your browser. Resize, crop and trim for
              free; cut out backgrounds, upscale and add subtitles on Pro and
              Ultra. Your original is never touched, because every edit is saved
              as a new copy.
            </p>
            <div
              className="rise flex flex-wrap items-center gap-3"
              style={delay(2)}
            >
              <SignUpButton>
                <Button variant="primary" size="lg">
                  Start editing free
                  <ArrowRightIcon />
                </Button>
              </SignUpButton>
              <Link href="/pricing" className={buttonStyles("ghost", "lg")}>
                See plans
              </Link>
            </div>
          </div>
          <div className="rise" style={delay(3)}>
            <ToolPanelPreview />
          </div>
        </section>

        <section
          aria-labelledby="tools-heading"
          className="border-y border-line-strong bg-panel"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2
              id="tools-heading"
              className="max-w-[20ch] text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
            >
              Two editors. Every tool sorted by plan.
            </h2>
            <p className="mt-4 max-w-[60ch] text-muted">
              Nothing is hidden. See what each plan unlocks before you sign up.
            </p>
            <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
              {(["image", "video"] as const).map((kind) => (
                <div key={kind}>
                  <h3 className="flex items-center gap-2.5 text-xl font-semibold">
                    {kind === "image" ? <ImageIcon /> : <VideoIcon />}
                    {kind === "image" ? "Image editor" : "Video editor"}
                  </h3>
                  <dl className="mt-6 border-t border-line-strong">
                    {toolsByTier(kind).map(({ plan, labels }) => (
                      <div
                        key={plan}
                        className={cn(
                          "grid gap-2 border-b py-4 sm:grid-cols-[6rem_1fr] sm:gap-6",
                          plan === "free"
                            ? "border-line-strong"
                            : "border-dashed border-line-strong",
                        )}
                      >
                        <dt className="flex items-start gap-2 text-sm font-semibold">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-1 size-2.5 shrink-0",
                              plan === "free" && "bg-ink ring-1 ring-line-strong",
                              plan === "pro" && "bg-cyan",
                              plan === "ultra" && "bg-magenta",
                            )}
                          />
                          {PLAN_INFO[plan].name}
                        </dt>
                        <dd className="text-sm leading-relaxed text-muted">
                          {labels.join(" · ")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="plans-heading"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="plans-heading"
              className="max-w-[22ch] text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
            >
              Start free. Upgrade when it pays off.
            </h2>
            <Link href="/pricing" className={buttonStyles("secondary", "md")}>
              Compare plans
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
          <ul className="mt-10 grid border-x border-b border-line-strong md:grid-cols-3">
            {PLANS.map((plan) => {
              const info = PLAN_INFO[plan];
              const q = QUOTAS[plan];
              return (
                <li
                  key={plan}
                  className="flex flex-col border-t border-line-strong md:border-r md:last:border-r-0"
                >
                  <div
                    className={cn(
                      "flex h-10 items-center px-5 font-mono text-xs font-medium uppercase",
                      info.head,
                    )}
                  >
                    {info.name}
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">
                      {info.price}
                      <span className="font-mono text-sm font-normal text-subtle">
                        {" "}
                        / mo
                      </span>
                    </p>
                    <p className="text-sm text-muted">{info.blurb}</p>
                    <dl className="mt-auto grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-sm">
                      <dt className="text-muted">Assets</dt>
                      <dd className="text-right font-mono tabular-nums">
                        {q.maxAssets.toLocaleString("en-US")}
                      </dd>
                      <dt className="text-muted">Image size</dt>
                      <dd className="text-right font-mono tabular-nums">
                        {fmtSize(q.imageBytes)}
                      </dd>
                      <dt className="text-muted">Video size</dt>
                      <dd className="text-right font-mono tabular-nums">
                        {fmtSize(q.videoBytes)}
                      </dd>
                      <dt className="text-muted">Video length</dt>
                      <dd className="text-right font-mono tabular-nums">
                        {Math.round(q.videoSeconds / 60)} min
                      </dd>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <footer className="border-t border-line-strong">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-subtle sm:px-6">
          <span className="font-mono">© {new Date().getFullYear()} Vyx</span>
          <Link href="/pricing" className="hover:text-fg">
            Pricing
          </Link>
        </div>
      </footer>
    </>
  );
}
