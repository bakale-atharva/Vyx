import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account & billing" };

export default async function BillingPage() {
  await auth.protect();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">
        Account &amp; billing
      </h1>
      <UserProfile
        path="/studio/billing"
        routing="path"
        appearance={{ elements: { rootBox: "w-full", cardBox: "w-full max-w-4xl" } }}
      />
    </>
  );
}
