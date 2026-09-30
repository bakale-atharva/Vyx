import { verifyWebhook } from "@clerk/backend/webhooks";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const svixId = req.headers.get("svix-id");
    let evt;
    try {
      evt = await verifyWebhook(req, {
        signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      });
    } catch (err) {
      console.error(
        "Clerk webhook verification failed:",
        err instanceof Error ? err.message : String(err),
        { hasSvixId: svixId !== null },
      );
      return new Response("Invalid signature", { status: 400 });
    }
    if (!svixId) return new Response("Missing svix-id", { status: 400 });

    await ctx.runMutation(internal.webhooks.ingest, {
      svixId,
      type: evt.type,
      timestamp: evt.timestamp,
      data: evt.data,
    });
    return new Response(null, { status: 200 });
  }),
});

export default http;
