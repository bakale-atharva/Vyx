/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "whsec_" + btoa("test-signing-secret-1234567890abcd");
const USER = "user_1";

const makeTest = () => convexTest(schema, modules);
type TestConvex = ReturnType<typeof makeTest>;

let seq = 0;

async function send(
  t: TestConvex,
  type: string,
  data: unknown,
  opts: { svixId?: string; timestamp?: number; secret?: string } = {},
) {
  const svixId = opts.svixId ?? `msg_${++seq}`;
  const body = JSON.stringify({
    type,
    object: "event",
    data,
    timestamp: opts.timestamp ?? Date.now(),
    instance_id: "ins_1",
    event_attributes: { http_request: { client_ip: "", user_agent: "" } },
  });
  const now = new Date();
  const signature = new Webhook(opts.secret ?? SECRET).sign(svixId, now, body);
  return t.fetch("/clerk-webhook", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
      "svix-signature": signature,
    },
  });
}

const payer = {
  user_id: USER,
  email: "a@example.com",
  first_name: "Ada",
  last_name: "L",
  image_url: "https://img/a.png",
};

const subscription = (slug: string, status = "active", extra = {}) => ({
  status: "active",
  payer,
  items: [
    { status, period_end: 1_900_000_000_000, plan: { slug }, ...extra },
  ],
});

const userRow = (t: TestConvex) =>
  t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", USER))
      .unique(),
  );

describe("clerk webhook", () => {
  let t: TestConvex;
  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = SECRET;
    t = makeTest();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("bad signature returns 400 and writes nothing", async () => {
    const other = "whsec_" + btoa("a-different-secret-value-1234567");
    const res = await send(t, "user.created", { id: USER }, { secret: other });
    expect(res.status).toBe(400);
    expect(await userRow(t)).toBeNull();
  });

  test("user.created creates a free user", async () => {
    const res = await send(t, "user.created", {
      id: USER,
      first_name: "Ada",
      last_name: "L",
      image_url: "https://img/a.png",
      primary_email_address_id: "e1",
      email_addresses: [{ id: "e1", email_address: "a@example.com" }],
    });
    expect(res.status).toBe(200);
    expect(await userRow(t)).toMatchObject({
      email: "a@example.com",
      name: "Ada L",
      plan: "free",
      assetCount: 0,
    });
  });

  test("duplicate svix-id does not write twice", async () => {
    await send(t, "subscription.created", subscription("pro"), { svixId: "dup" });
    await t.run(async (ctx) => {
      const u = (await ctx.db.query("users").first())!;
      await ctx.db.patch(u._id, { plan: "free" });
    });
    await send(t, "subscription.created", subscription("pro"), { svixId: "dup" });
    expect((await userRow(t))?.plan).toBe("free");
    const events = await t.run((ctx) => ctx.db.query("webhookEvents").collect());
    expect(events).toHaveLength(1);
  });

  test("subscription payload maps to the right plan, highest wins", async () => {
    await send(t, "subscription.created", subscription("pro"));
    expect((await userRow(t))?.plan).toBe("pro");
    await send(t, "subscription.updated", {
      ...subscription("ultra"),
      items: [
        { status: "active", plan: { slug: "pro" }, period_end: 1 },
        { status: "active", plan: { slug: "ultra" }, period_end: 2 },
        { status: "upcoming", plan: { slug: "free_user" }, period_end: null },
      ],
    });
    expect(await userRow(t)).toMatchObject({ plan: "ultra", periodEnd: 2 });
  });

  test("an older timestamp does not overwrite a newer plan", async () => {
    await send(t, "subscription.updated", subscription("ultra"), { timestamp: 2000 });
    await send(t, "subscription.updated", subscription("pro"), { timestamp: 1000 });
    expect((await userRow(t))?.plan).toBe("ultra");
  });

  test("subscriptionItem.ended downgrades to free and flags overQuota", async () => {
    await send(t, "subscription.created", subscription("pro"), { timestamp: 1000 });
    await t.run(async (ctx) => {
      const u = (await ctx.db.query("users").first())!;
      await ctx.db.patch(u._id, { assetCount: 30 });
    });
    await send(
      t,
      "subscriptionItem.ended",
      { status: "ended", plan: { slug: "pro" }, payer },
      { timestamp: 2000 },
    );
    expect(await userRow(t)).toMatchObject({ plan: "free", overQuota: true });
  });

  test("subscriptionItem.canceled keeps the plan but flags cancellation", async () => {
    await send(t, "subscription.created", subscription("pro"), { timestamp: 1000 });
    await send(
      t,
      "subscriptionItem.canceled",
      { status: "canceled", plan: { slug: "pro" }, period_end: 5000, payer },
      { timestamp: 2000 },
    );
    expect(await userRow(t)).toMatchObject({
      plan: "pro",
      cancelAtPeriodEnd: true,
      periodEnd: 5000,
      subscriptionStatus: "canceled",
    });
  });

  test("user.deleted marks the user and schedules the purge", async () => {
    await send(t, "subscription.created", subscription("pro"));
    await send(t, "user.deleted", { id: USER, deleted: true });
    expect((await userRow(t))?.deletedAt).toBeTypeOf("number");
    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(scheduled.map((s) => s.name)).toContain("cleanup:purgeUser");
  });
});

describe("ownership isolation", () => {
  test("users only see and fetch their own assets", async () => {
    const t = convexTest(schema, modules);
    const base = {
      kind: "image" as const,
      filePath: "/vyx/users/x/images/a.jpg",
      name: "a.jpg",
      mime: "image/jpeg",
      size: 1,
    };
    const aliceAsset = await t.mutation(internal.assets.insert, {
      ...base,
      ownerId: "alice",
      fileId: "f1",
    });
    await t.mutation(internal.assets.insert, {
      ...base,
      ownerId: "bob",
      fileId: "f2",
    });

    const alice = t.withIdentity({ subject: "alice", issuer: "https://clerk.test" });
    const bob = t.withIdentity({ subject: "bob", issuer: "https://clerk.test" });
    const opts = { numItems: 10, cursor: null };

    const aliceList = await alice.query(api.assets.list, { paginationOpts: opts });
    expect(aliceList.page.map((a) => a.ownerId)).toEqual(["alice"]);
    expect(await alice.query(api.assets.get, { assetId: aliceAsset })).not.toBeNull();
    expect(await bob.query(api.assets.get, { assetId: aliceAsset })).toBeNull();
    await expect(
      t.query(api.assets.list, { paginationOpts: opts }),
    ).rejects.toThrow("Not authenticated");
  });
});
