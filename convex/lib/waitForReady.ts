export type ReadyState = "ready" | "pending" | "failed";

type Options = {
  /** Total time to keep polling before giving up with "pending". */
  budgetMs: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  // Injectable for testing.
  fetchFn?: (url: string, init: RequestInit) => Promise<{ status: number }>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/**
 * Poll an ImageKit transformation URL until it is ready. ImageKit answers 202
 * while it is still processing (AI operations, video). Backs off exponentially.
 *
 *  - 200 (or any 2xx other than 202): "ready"
 *  - 202, 408, 425, 429, 5xx, network error: keep waiting
 *  - any other status: "failed" (the transformation is invalid or forbidden)
 *  - budget exhausted: "pending" (the caller may reschedule)
 */
export async function waitForReady(
  url: string,
  {
    budgetMs,
    initialDelayMs = 1000,
    maxDelayMs = 10_000,
    fetchFn = (u, init) => fetch(u, init),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = () => Date.now(),
  }: Options,
): Promise<ReadyState> {
  const deadline = now() + budgetMs;
  let delay = initialDelayMs;

  for (;;) {
    let status: number | null = null;
    try {
      let res = await fetchFn(url, { method: "HEAD" });
      if (res.status === 405 || res.status === 501) {
        // HEAD not supported: ask for a single byte instead.
        res = await fetchFn(url, { method: "GET", headers: { Range: "bytes=0-0" } });
      }
      status = res.status;
    } catch {
      status = null; // transient network error: retry
    }

    if (status !== null && status !== 202 && status >= 200 && status < 300) {
      return "ready";
    }
    const retryable =
      status === null ||
      status === 202 ||
      status === 408 ||
      status === 425 ||
      status === 429 ||
      status >= 500;
    if (!retryable) return "failed";

    if (now() + delay >= deadline) return "pending";
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
}
