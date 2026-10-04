import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForReady } from "../../convex/lib/waitForReady";

/** A fake clock and fetch answering with the given statuses in order. */
function harness(statuses: (number | "network")[]) {
  let time = 0;
  const sleeps: number[] = [];
  const calls: RequestInit[] = [];
  return {
    sleeps,
    calls,
    opts: {
      now: () => time,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        time += ms;
      },
      fetchFn: async (_url: string, init: RequestInit) => {
        calls.push(init);
        const next = statuses.shift() ?? 202;
        if (next === "network") throw new Error("offline");
        return { status: next };
      },
    },
  };
}

test("ready once ImageKit stops answering 202", async () => {
  const h = harness([202, 202, 200]);
  assert.equal(await waitForReady("u", { budgetMs: 60_000, ...h.opts }), "ready");
  assert.deepEqual(h.sleeps, [1000, 2000]);
});

test("backs off exponentially up to the cap", async () => {
  const h = harness([202, 202, 202, 202, 202, 202, 200]);
  await waitForReady("u", { budgetMs: 600_000, maxDelayMs: 5000, ...h.opts });
  assert.deepEqual(h.sleeps, [1000, 2000, 4000, 5000, 5000, 5000]);
});

test("pending when the budget runs out", async () => {
  const h = harness([]);
  assert.equal(await waitForReady("u", { budgetMs: 10_000, ...h.opts }), "pending");
  assert.ok(h.sleeps.reduce((a, b) => a + b, 0) < 10_000);
});

test("retries network errors and 5xx/429", async () => {
  const h = harness(["network", 503, 429, 200]);
  assert.equal(await waitForReady("u", { budgetMs: 60_000, ...h.opts }), "ready");
});

test("fails fast on a bad transformation", async () => {
  const h = harness([400]);
  assert.equal(await waitForReady("u", { budgetMs: 60_000, ...h.opts }), "failed");
  assert.deepEqual(h.sleeps, []);
});

test("falls back to a 1-byte GET when HEAD isn't allowed", async () => {
  const h = harness([405, 200]);
  assert.equal(await waitForReady("u", { budgetMs: 60_000, ...h.opts }), "ready");
  assert.equal(h.calls[0].method, "HEAD");
  assert.equal(h.calls[1].method, "GET");
});
