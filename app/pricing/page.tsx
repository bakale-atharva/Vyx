import { PricingTable } from "@clerk/nextjs";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="max-w-[18ch] text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Pick the plan that fits your work.
        </h1>
        <p className="mt-4 max-w-[56ch] text-muted">
          Switch or cancel any time. Paid features stay until the end of the
          period you paid for.
        </p>
        <div className="mt-12">
          <PricingTable
            newSubscriptionRedirectUrl="/studio?upgraded=1"
            appearance={{
              elements: {
                pricingTable: {
                  "@media (min-width: 1024px)": {
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  },
                },
              },
            }}
          />
        </div>
      </main>
    </>
  );
}
