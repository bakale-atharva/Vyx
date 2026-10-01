"use client";

import { useSession } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/convex/_generated/api";

/**
 * Side effects the studio needs once per visit:
 * 1. create the Convex user row if the Clerk webhook is late (`ensureMe`);
 * 2. after checkout (`?upgraded=1`) reload the Clerk session so `has({ feature })`
 *    reflects the new plan immediately.
 */
export function StudioEffects() {
  const { isAuthenticated } = useConvexAuth();
  const ensureMe = useMutation(api.users.ensureMe);
  const ensured = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || ensured.current) return;
    ensured.current = true;
    ensureMe().catch(() => {
      ensured.current = false;
    });
  }, [isAuthenticated, ensureMe]);

  return <CheckoutRefresh />;
}

function CheckoutRefresh() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const upgraded = params.get("upgraded") === "1";
  const handled = useRef(false);

  useEffect(() => {
    if (!upgraded || !session || handled.current) return;
    handled.current = true;
    void (async () => {
      try {
        await session.reload();
        await session.getToken({ skipCache: true });
        toast({
          tone: "success",
          title: "Plan updated",
          description: "Your new tools are unlocked.",
        });
      } catch {
        toast({
          tone: "error",
          title: "Couldn't refresh your plan",
          description: "Reload the page to see your new tools.",
        });
      } finally {
        router.replace(pathname);
        router.refresh();
      }
    })();
  }, [upgraded, session, pathname, router, toast]);

  return null;
}
